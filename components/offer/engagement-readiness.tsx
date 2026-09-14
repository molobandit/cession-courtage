"use client";

import { useState } from "react";

export type EngagementReadiness = {
  /** Confidentialité et contrat d'intermédiation signés pour l'ORIAS actuel. */
  agreements: boolean;
  /** Financement déclaré et justifié ; `raison` dit ce qui manque. */
  financing: { ok: boolean; raison?: string };
  /** Chemin de retour après signature ou déclaration. */
  returnTo: string;
};

/**
 * Ce qui manque avant de pouvoir s'engager, dit en une ligne chacun, avec le
 * lien qui le règle. Rien ne s'affiche quand tout est prêt.
 */
export function ReadinessChecklist({ readiness }: { readiness: EngagementReadiness }) {
  if (readiness.agreements && readiness.financing.ok) return null;
  return (
    <ul className="grid gap-2 rounded-xl border border-warn/30 bg-warn/5 px-4 py-3 text-[14px] text-ink">
      {!readiness.agreements ? (
        <li>
          <span className="font-semibold">Engagements à signer.</span> Confidentialité et contrat d’intermédiation, une seule
          fois pour la durée de votre ORIAS.{" "}
          <a href={`/app/engagements?next=${encodeURIComponent(readiness.returnTo)}`} className="font-semibold text-indigo-dark underline-offset-2 hover:underline">
            Signer maintenant
          </a>
        </li>
      ) : null}
      {!readiness.financing.ok ? (
        <li>
          <span className="font-semibold">Financement à justifier.</span> {readiness.financing.raison}{" "}
          <a href="/app/profil#capacite" className="font-semibold text-indigo-dark underline-offset-2 hover:underline">
            Déposer mon accord de principe
          </a>
        </li>
      ) : null}
    </ul>
  );
}

/** Choix du moyen de paiement du dépôt. */
export function PaymentMethodChoice({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  const options = [
    { v: "CARD", titre: "Carte bancaire", detail: "Débit immédiat" },
    { v: "SEPA", titre: "Prélèvement SEPA", detail: "Sans plafond de carte, encaissé sous quelques jours" },
  ];
  return (
    <fieldset className="grid gap-2 sm:grid-cols-2">
      <legend className="mb-1.5 text-[14px] font-medium text-ink">Payer le dépôt par</legend>
      {options.map((o) => (
        <label
          key={o.v}
          className={`flex cursor-pointer items-start gap-3 rounded-xl border px-3 py-2.5 ${value === o.v ? "border-indigo bg-indigo-soft" : "border-line bg-paper"}`}
        >
          <input type="radio" name="paymentMethod" value={o.v} checked={value === o.v} onChange={() => onChange(o.v)} className="mt-1 accent-[#2563eb]" />
          <span>
            <span className="block text-[14px] font-semibold text-ink">{o.titre}</span>
            <span className="block text-[12px] text-muted">{o.detail}</span>
          </span>
        </label>
      ))}
    </fieldset>
  );
}

export function usePaymentMethod() {
  return useState("CARD");
}
