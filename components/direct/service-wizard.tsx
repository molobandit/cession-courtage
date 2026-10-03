"use client";

import { useRouter } from "next/navigation";
import { useActionState, useEffect, useState } from "react";
import { openDirectDealAction, type DirectDealState } from "@/app/actions/direct-deals";
import { ToolIcon } from "@/components/app/toolbox";
import {
  ATTESTATIONS_FLAT_EUR,
  ATTESTATIONS_LABEL,
  ESCROW_LABEL,
  KIT_LABEL,
  feeLines,
  feesTotal,
  type DirectServices,
} from "@/lib/direct/fees";
import type { ServiceKey } from "@/lib/direct/services";
import { formatEuroWhole } from "@/lib/format/number";

const initial: DirectDealState = {};

const CHAMP =
  "h-11 w-full rounded-lg border border-line bg-paper px-3 text-[15px] text-ink focus:border-indigo focus:outline-none focus:ring-2 focus:ring-indigo/20";

function Aide({ texte }: { texte: string }) {
  return (
    <span title={texte} aria-label={texte} className="inline-flex cursor-help text-indigo">
      <ToolIcon name="info" className="h-[18px] w-[18px]" />
    </span>
  );
}

function Requis() {
  return <span className="text-danger">*</span>;
}

/**
 * Création d'un service à la carte, en deux temps.
 *
 * D'abord ce que l'on commande — le prix, sa position, les services — comme
 * sur un bon de commande. Ensuite seulement la contrepartie et le portefeuille :
 * celui qui hésite entre deux options n'a pas à remplir six champs pour voir
 * ce qu'elles coûtent.
 */
export function ServiceWizard({ service, title }: { service: ServiceKey; title: string }) {
  const router = useRouter();
  const [state, action, pending] = useActionState(openDirectDealAction, initial);
  const [etape, setEtape] = useState<1 | 2>(1);
  const [prix, setPrix] = useState("");
  const [role, setRole] = useState<"BUYER" | "SELLER">("BUYER");
  const [sequestre, setSequestre] = useState(false);
  const [comptant, setComptant] = useState("100");

  useEffect(() => {
    if (state.id) router.push(`/app/formaliser/${state.id}`);
  }, [state.id, router]);

  const services: DirectServices = {
    kit: service === "kit",
    escrow: service === "escrow" || (service === "kit" && sequestre),
    attestations: service === "attestations",
  };
  const avecPrix = service !== "attestations";
  const montant = Number(prix.replace(/\s/g, "").replace(",", ".")) || 0;
  const pourcentage = Math.min(100, Math.max(0, Number(comptant) || 0));
  const lignes = feeLines({
    services,
    salePrice: montant,
    escrowedAmount: Math.round(montant * (pourcentage / 100) * 100) / 100,
  });
  const total = feesTotal(lignes);
  const etape1Valide = !avecPrix || montant > 0;

  return (
    <form action={action}>
      {/* Tout part avec le formulaire, quelle que soit l'étape affichée. */}
      <input type="hidden" name="salePrice" value={avecPrix ? String(montant) : "0"} />
      <input type="hidden" name="openerRole" value={role} />
      <input type="hidden" name="upfrontPercent" value={avecPrix ? String(pourcentage) : "100"} />
      {services.kit ? <input type="hidden" name="kit" value="on" /> : null}
      {services.escrow ? <input type="hidden" name="escrow" value="on" /> : null}
      {services.attestations ? <input type="hidden" name="attestations" value="on" /> : null}

      <div hidden={etape !== 1}>
        <section className="rounded-2xl border border-line bg-paper p-6 shadow-sm sm:p-8">
          <h1 className="text-[20px] font-semibold text-ink">{title}</h1>

          <div className="mt-7 grid gap-6">
            {avecPrix ? (
              <div>
                <label htmlFor="prix" className="flex items-center gap-2 text-[16px] font-medium text-ink">
                  <span>
                    {service === "escrow" ? "Montant" : "Montant du portefeuille"}
                    <Requis />
                  </span>
                  <Aide
                    texte={
                      service === "escrow"
                        ? "Somme à verser sur le compte sécurisé."
                        : "Montant convenu entre les parties, net vendeur."
                    }
                  />
                </label>
                <div className="mt-2 flex h-11 items-center rounded-lg border border-line bg-paper px-3 focus-within:border-indigo focus-within:ring-2 focus-within:ring-indigo/20">
                  <span className="text-[15px] text-muted">€</span>
                  <input
                    id="prix"
                    inputMode="decimal"
                    value={prix}
                    onChange={(e) => setPrix(e.currentTarget.value)}
                    placeholder="0"
                    className="h-full min-w-0 flex-1 bg-transparent px-2 text-[15px] text-ink outline-none"
                  />
                  <span className="text-[14px] text-muted">EUR</span>
                </div>
              </div>
            ) : null}

            <div>
              <label htmlFor="role" className="text-[16px] font-medium text-ink">
                Êtes-vous un
                <Requis />
              </label>
              <select
                id="role"
                value={role}
                onChange={(e) => setRole(e.currentTarget.value as "BUYER" | "SELLER")}
                className={`mt-2 ${CHAMP}`}
              >
                <option value="BUYER">Acquéreur</option>
                <option value="SELLER">Cédant</option>
              </select>
            </div>

            {service === "kit" ? (
              <div className="grid gap-4">
                <label className="flex items-center gap-3 text-[16px] text-ink">
                  <input type="checkbox" checked disabled className="h-4 w-4 accent-indigo" />
                  Service Kit Contractuel
                  <Aide texte={`Accord de confidentialité, protocole de cession, attestations de transfert, vérification des parties et signature électronique. ${KIT_LABEL}.`} />
                </label>
                <label className="flex cursor-pointer items-center gap-3 text-[16px] text-ink">
                  <input
                    type="checkbox"
                    checked={sequestre}
                    onChange={() => setSequestre((v) => !v)}
                    className="h-4 w-4 accent-indigo"
                  />
                  Transaction sécurisée
                  <Aide texte={`Le comptant reste sur un compte sécurisé, puis il est versé au cédant à la clôture. ${ESCROW_LABEL}.`} />
                </label>
              </div>
            ) : null}

            {service === "escrow" ? (
              <label className="flex items-center gap-3 text-[16px] text-ink">
                <input type="checkbox" checked disabled className="h-4 w-4 accent-indigo" />
                Service de transaction sécurisée
                <Aide texte={`Les fonds restent dans le trust jusqu’à la clôture, puis ils sont libérés. ${ESCROW_LABEL}.`} />
              </label>
            ) : null}

            {service === "attestations" ? (
              <p className="text-[15px] leading-relaxed text-muted">
                Pour mémoire, le coût ({formatEuroWhole(ATTESTATIONS_FLAT_EUR)} HT) lié à la mise en
                place du service d’aide à la génération des attestations de transfert est réglé par
                carte, une fois les conditions confirmées par la contrepartie.
              </p>
            ) : null}
          </div>
        </section>

        <div className="mt-6 flex justify-end">
          <button
            type="button"
            disabled={!etape1Valide}
            onClick={() => setEtape(2)}
            className="inline-flex h-11 items-center rounded-lg bg-indigo-dark px-6 text-[15px] font-semibold text-white hover:bg-indigo disabled:cursor-not-allowed disabled:opacity-40"
          >
            Continuer
          </button>
        </div>
      </div>

      <div hidden={etape !== 2}>
        <section className="rounded-2xl border border-line bg-paper p-6 shadow-sm sm:p-8">
          <p className="text-[13px] font-medium text-muted">Étape 2 sur 2</p>
          <h2 className="mt-1 text-[20px] font-semibold text-ink">Informations du dossier</h2>

          <div className="mt-7 grid gap-6">
            <div>
              <label htmlFor="counterpartyEmail" className="flex items-center gap-2 text-[16px] font-medium text-ink">
                <span>
                  E-mail {role === "BUYER" ? "du cédant" : "de l’acquéreur"}
                  <Requis />
                </span>
                <Aide texte="La contrepartie est invitée à confirmer les conditions. Elle n’a pas besoin d’un compte pour être désignée." />
              </label>
              <input
                id="counterpartyEmail"
                name="counterpartyEmail"
                type="email"
                required={etape === 2}
                className={`mt-2 ${CHAMP}`}
              />
            </div>

            <div>
              <label htmlFor="portfolioLabel" className="text-[16px] font-medium text-ink">
                Portefeuille concerné
                <Requis />
              </label>
              <input
                id="portfolioLabel"
                name="portfolioLabel"
                required={etape === 2}
                placeholder="Santé individuelle, Bretagne, 180 contrats"
                className={`mt-2 ${CHAMP}`}
              />
            </div>

            {avecPrix ? (
              <div className="max-w-xs">
                <label htmlFor="comptant" className="flex items-center gap-2 text-[16px] font-medium text-ink">
                  Part comptant (%)
                  <Aide texte="Part réglée à la signature. Le solde suit l’échéancier convenu entre les parties." />
                </label>
                <input
                  id="comptant"
                  inputMode="numeric"
                  value={comptant}
                  onChange={(e) => setComptant(e.currentTarget.value)}
                  className={`mt-2 ${CHAMP}`}
                />
              </div>
            ) : null}

            <div className="rounded-xl border border-line bg-surface-alt/60 p-4">
              <p className="text-[14px] font-semibold text-ink">Récapitulatif</p>
              <ul className="mt-3 grid gap-1.5 text-[14px]">
                {avecPrix ? (
                  <li className="flex justify-between gap-4">
                    <span className="text-muted">{service === "escrow" ? "Montant" : "Montant du portefeuille"}</span>
                    <span className="tabular text-ink">{formatEuroWhole(montant)}</span>
                  </li>
                ) : null}
                {lignes.map((l) => (
                  <li key={l.key} className="flex justify-between gap-4">
                    <span className="text-muted">
                      {l.label} <span className="text-[12px]">· {l.key === "attestations" ? ATTESTATIONS_LABEL : l.detail}</span>
                    </span>
                    <span className="tabular text-ink">{formatEuroWhole(l.amount)} HT</span>
                  </li>
                ))}
                <li className="mt-1 flex justify-between gap-4 border-t border-line pt-2 font-semibold">
                  <span className="text-ink">Honoraires</span>
                  <span className="tabular text-ink">{formatEuroWhole(total)} HT</span>
                </li>
              </ul>
            </div>
          </div>
        </section>

        {state.error ? (
          <p role="alert" className="mt-4 text-[15px] text-danger">
            {state.error}
          </p>
        ) : null}

        <div className="mt-6 flex items-center justify-between gap-3">
          <button
            type="button"
            onClick={() => setEtape(1)}
            className="inline-flex h-11 items-center rounded-lg border border-line bg-paper px-5 text-[15px] font-medium text-ink hover:bg-surface-alt"
          >
            Retour
          </button>
          <button
            type="submit"
            disabled={pending || Boolean(state.id)}
            className="inline-flex h-11 items-center rounded-lg bg-indigo-dark px-6 text-[15px] font-semibold text-white hover:bg-indigo disabled:opacity-50"
          >
            {pending || state.id ? "Création…" : "Créer le dossier"}
          </button>
        </div>
      </div>
    </form>
  );
}
