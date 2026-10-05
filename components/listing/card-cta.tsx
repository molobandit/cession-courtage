"use client";

import { useLinkStatus } from "next/link";

/**
 * Le bouton d'une carte de la salle de marché.
 *
 * La fiche interroge la base avant de s'afficher : sans retour, le clic
 * semblait sans effet et le lecteur recliquait. `useLinkStatus` dit quand la
 * navigation est en cours, à l'intérieur du Link qui l'enveloppe.
 */
export function CardCta({ label = "Voir le dossier" }: { label?: string }) {
  const { pending } = useLinkStatus();
  return (
    <span
      className={`inline-flex h-10 w-full items-center justify-center rounded-full bg-indigo text-[14px] font-semibold !text-white ${
        pending ? "opacity-80" : ""
      }`}
      aria-live="polite"
    >
      {pending ? "Ouverture…" : label}
    </span>
  );
}
