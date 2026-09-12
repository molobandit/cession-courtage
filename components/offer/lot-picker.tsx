"use client";

import { useMemo, useState } from "react";
import {
  proRataPrice,
  summarizeSelection,
  type CarrierLot,
} from "@/lib/listing/lots";
import { formatEuroWhole } from "@/lib/format/number";

/**
 * Choix du lot par l'acquéreur : tout le portefeuille, ou certains fournisseurs.
 *
 * Le fournisseur est l'unité parce que c'est lui qui détient le code de
 * courtage et signe l'attestation de transfert. L'écran montre donc ce qui
 * décide vraiment de l'achat — les commissions que chaque assureur rapporte —
 * et pas un simple nom dans une liste.
 *
 * Le prix au prorata est proposé, jamais imposé : un livre concentré sur un
 * seul assureur se reprend mieux qu'un reliquat éparpillé, et cet écart-là ne
 * se calcule pas. L'acquéreur reste maître de son montant.
 */
export function LotPicker({
  lots,
  available,
  askingPrice,
  amountFieldId,
}: {
  lots: CarrierLot[];
  /** Fournisseurs encore cessibles : les autres sont déjà engagés ailleurs. */
  available: string[];
  askingPrice: number;
  /** Champ « montant » du formulaire, pour y reporter le prix indicatif. */
  amountFieldId: string;
}) {
  const libres = useMemo(
    () => lots.filter((lot) => available.includes(lot.carrier)),
    [lots, available],
  );
  const toutLibre = libres.length === lots.length;

  const [partiel, setPartiel] = useState(!toutLibre);
  const [choisis, setChoisis] = useState<string[]>(toutLibre ? [] : libres.map((l) => l.carrier));

  const selection = useMemo(
    () => summarizeSelection(lots, partiel ? choisis : libres.map((l) => l.carrier)),
    [lots, partiel, choisis, libres],
  );
  const indicatif = proRataPrice(askingPrice, selection.share);

  function basculer(carrier: string) {
    setChoisis((actuels) =>
      actuels.includes(carrier)
        ? actuels.filter((c) => c !== carrier)
        : [...actuels, carrier],
    );
  }

  function reporterLeMontant() {
    const champ = document.getElementById(amountFieldId) as HTMLInputElement | null;
    if (champ) {
      champ.value = String(indicatif);
      champ.dispatchEvent(new Event("input", { bubbles: true }));
    }
  }

  if (lots.length === 0) return null;

  return (
    <fieldset className="rounded-2xl border border-line bg-page p-4">
      <legend className="px-1 text-[13px] font-semibold text-ink">Ce que vous reprenez</legend>

      {/*
        Les fournisseurs retenus partent en champs cachés. Le portefeuille
        entier n'envoie rien : côté serveur, une sélection vide vaut « tout »,
        et garde son sens si le portefeuille bouge entre l'offre et l'accord.
      */}
      {partiel
        ? choisis.map((carrier) => (
            <input key={carrier} type="hidden" name="carriers" value={carrier} />
          ))
        : null}

      {toutLibre ? (
        <div className="flex flex-wrap gap-4">
          <label className="flex items-center gap-2 text-[14px] text-ink">
            <input
              type="radio"
              name="__portee"
              checked={!partiel}
              onChange={() => setPartiel(false)}
              className="accent-indigo"
            />
            Le portefeuille entier
          </label>
          <label className="flex items-center gap-2 text-[14px] text-ink">
            <input
              type="radio"
              name="__portee"
              checked={partiel}
              onChange={() => setPartiel(true)}
              className="accent-indigo"
            />
            Une partie seulement
          </label>
        </div>
      ) : (
        <p className="text-[13px] leading-relaxed text-muted">
          Une partie de ce portefeuille fait déjà l’objet d’une cession. Vous pouvez
          vous positionner sur les fournisseurs encore libres.
        </p>
      )}

      {partiel ? (
        <ul className="mt-4 grid gap-1.5">
          {lots.map((lot) => {
            const libre = available.includes(lot.carrier);
            const coche = choisis.includes(lot.carrier);
            return (
              <li key={lot.carrier}>
                <label
                  className={`flex items-center justify-between gap-3 rounded-xl border px-3 py-2 text-[14px] ${
                    libre
                      ? coche
                        ? "border-indigo bg-indigo-soft/60 text-ink"
                        : "cursor-pointer border-line bg-paper text-ink hover:border-indigo-line"
                      : "border-line bg-surface-alt text-muted"
                  }`}
                >
                  <span className="flex min-w-0 items-center gap-2.5">
                    <input
                      type="checkbox"
                      checked={coche}
                      disabled={!libre}
                      onChange={() => basculer(lot.carrier)}
                      className="accent-indigo"
                    />
                    <span className="truncate font-medium">{lot.carrier}</span>
                    {libre ? null : (
                      <span className="shrink-0 text-[12px]">· déjà cédé</span>
                    )}
                  </span>
                  <span className="tabular shrink-0 text-[13px]">
                    {formatEuroWhole(lot.annualCommission)} / an
                    <span className="ml-2 text-muted">{Math.round(lot.share * 100)} %</span>
                  </span>
                </label>
              </li>
            );
          })}
        </ul>
      ) : null}

      <div className="mt-4 flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1 border-t border-line pt-3">
        <p className="text-[13px] text-muted">
          {selection.carriers.length === 0
            ? "Choisissez au moins un fournisseur."
            : `${selection.contractCount} contrats · ${formatEuroWhole(selection.annualCommission)} de commissions / an · ${Math.round(selection.share * 100)} % du portefeuille`}
        </p>
        {selection.carriers.length > 0 && indicatif > 0 ? (
          <p className="text-[13px] text-ink">
            Prix au prorata :{" "}
            <span className="tabular font-semibold">{formatEuroWhole(indicatif)}</span>{" "}
            <button
              type="button"
              onClick={reporterLeMontant}
              className="text-indigo underline underline-offset-2"
            >
              reprendre
            </button>
          </p>
        ) : null}
      </div>

      {selection.carriers.length > 0 && !selection.full ? (
        <p className="mt-2 text-[12px] leading-relaxed text-muted">
          Le prorata n’est qu’un point de départ : un lot concentré sur un assureur se
          reprend plus facilement qu’un reliquat éparpillé. Fixez le montant que vous jugez juste.
        </p>
      ) : null}
    </fieldset>
  );
}
