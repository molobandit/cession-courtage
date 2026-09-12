"use client";

import { useActionState, useState } from "react";
import { openDirectDealAction, type DirectDealState } from "@/app/actions/direct-deals";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  ATTESTATIONS_LABEL,
  ESCROW_LABEL,
  KIT_LABEL,
  feeLines,
  feesTotal,
} from "@/lib/direct/fees";
import { formatEuroWhole } from "@/lib/format/number";

const initial: DirectDealState = {};

const CHAMP = "mt-2 h-11 w-full rounded-md border border-line bg-surface-alt px-4 text-[15px] text-ink";

/**
 * Ouverture d'un dossier de gré à gré.
 *
 * La note s'affiche pendant la saisie, service par service : celui qui paie
 * doit pouvoir décocher une ligne et voir immédiatement ce qu'il économise.
 * Un total qui n'apparaît qu'à la fin se subit, il ne se choisit pas.
 */
export function OpenDirectDealForm() {
  const [state, action, pending] = useActionState(openDirectDealAction, initial);
  const [prix, setPrix] = useState(0);
  const [comptant, setComptant] = useState(100);
  const [services, setServices] = useState({ kit: true, escrow: false, attestations: false });

  const sequestre = Math.round(prix * (comptant / 100) * 100) / 100;
  const lignes = feeLines({ services, salePrice: prix, escrowedAmount: sequestre });
  const total = feesTotal(lignes);

  if (state.id) {
    return (
      <p className="rounded-2xl border border-indigo bg-indigo-soft/50 p-6 text-[15px] text-ink">
        Dossier ouvert. La contrepartie est invitée à confirmer les conditions.
      </p>
    );
  }

  return (
    <form action={action} className="grid gap-6">
      <div className="grid gap-5 sm:grid-cols-2">
        <div>
          <Label htmlFor="openerRole" className="text-[15px] font-medium normal-case tracking-normal text-ink">
            Vous êtes
          </Label>
          <select id="openerRole" name="openerRole" required className={CHAMP} defaultValue="SELLER">
            <option value="SELLER">Le cédant</option>
            <option value="BUYER">L’acquéreur</option>
          </select>
        </div>
        <div>
          <Label htmlFor="counterpartyEmail" className="text-[15px] font-medium normal-case tracking-normal text-ink">
            E-mail de la contrepartie
          </Label>
          <Input id="counterpartyEmail" name="counterpartyEmail" type="email" required className={CHAMP} />
        </div>
      </div>

      <div>
        <Label htmlFor="portfolioLabel" className="text-[15px] font-medium normal-case tracking-normal text-ink">
          Portefeuille concerné
        </Label>
        <Input
          id="portfolioLabel"
          name="portfolioLabel"
          required
          placeholder="Santé individuelle, Bretagne, 180 contrats"
          className={CHAMP}
        />
      </div>

      <div className="grid gap-5 sm:grid-cols-2">
        <div>
          <Label htmlFor="salePrice" className="text-[15px] font-medium normal-case tracking-normal text-ink">
            Prix convenu (€)
          </Label>
          <Input
            id="salePrice"
            name="salePrice"
            inputMode="numeric"
            required
            className={CHAMP}
            onChange={(e) => setPrix(Number(e.currentTarget.value) || 0)}
          />
        </div>
        <div>
          <Label htmlFor="upfrontPercent" className="text-[15px] font-medium normal-case tracking-normal text-ink">
            Comptant (%)
          </Label>
          <Input
            id="upfrontPercent"
            name="upfrontPercent"
            defaultValue="100"
            inputMode="numeric"
            required
            className={CHAMP}
            onChange={(e) => setComptant(Number(e.currentTarget.value) || 0)}
          />
        </div>
      </div>

      <fieldset className="rounded-2xl border border-line bg-page p-4">
        <legend className="px-1 text-[13px] font-semibold text-ink">Ce que vous nous confiez</legend>
        <ul className="grid gap-2">
          {(
            [
              { cle: "kit" as const, titre: "Kit contractuel", detail: KIT_LABEL, aide: "Acte de cession, attestations, vérification des parties, signature électronique." },
              { cle: "escrow" as const, titre: "Transaction sécurisée", detail: ESCROW_LABEL, aide: "Compte séquestre, fonds libérés en deux temps." },
              { cle: "attestations" as const, titre: "Attestations de transfert", detail: ATTESTATIONS_LABEL, aide: "Générées et transmises à chaque fournisseur. Comprises dans le kit." },
            ]
          ).map((s) => (
            <li key={s.cle}>
              <label className="flex cursor-pointer items-start gap-3 rounded-xl border border-line bg-paper px-4 py-3 has-[:checked]:border-indigo has-[:checked]:bg-indigo-soft/50">
                <input
                  type="checkbox"
                  name={s.cle}
                  checked={services[s.cle]}
                  onChange={() => setServices((v) => ({ ...v, [s.cle]: !v[s.cle] }))}
                  className="mt-1 accent-indigo"
                />
                <span className="min-w-0">
                  <span className="block text-[15px] font-semibold text-ink">
                    {s.titre} <span className="font-normal text-muted">· {s.detail}</span>
                  </span>
                  <span className="mt-0.5 block text-[13px] leading-relaxed text-muted">{s.aide}</span>
                </span>
              </label>
            </li>
          ))}
        </ul>

        <div className="mt-4 border-t border-line pt-3">
          {lignes.length === 0 ? (
            <p className="text-[13px] text-muted">Choisissez au moins un service.</p>
          ) : (
            <ul className="grid gap-1 text-[14px]">
              {lignes.map((l) => (
                <li key={l.key} className="flex justify-between gap-4">
                  <span className="text-muted">{l.label}</span>
                  <span className="tabular text-ink">{formatEuroWhole(l.amount)} HT</span>
                </li>
              ))}
              <li className="mt-1 flex justify-between gap-4 border-t border-line pt-1 font-semibold">
                <span className="text-ink">Total</span>
                <span className="tabular text-ink">{formatEuroWhole(total)} HT</span>
              </li>
            </ul>
          )}
        </div>
      </fieldset>

      {state.error ? (
        <p role="alert" className="text-[15px] text-danger">
          {state.error}
        </p>
      ) : null}
      <Button type="submit" variant="primary" size="lg" disabled={pending}>
        {pending ? "Ouverture…" : "Ouvrir le dossier"}
      </Button>
    </form>
  );
}
