"use client";

import { useActionState, useState } from "react";
import { placeInterestDepositAction, type DepositFormState } from "@/app/actions/deposits";
import { Button } from "@/components/ui/button";
import { depositTerms } from "@/lib/billing/deposit-fate";

const initial: DepositFormState = {};

/**
 * Pose le depot d'interet de 2,5 %.
 *
 * Le droit est verifie par l'action serveur, ce bouton n'est qu'un declencheur.
 * Les règles disent où part l'argent et que, sans rail actif, rien n'est débité.
 *
 * Les regles du depot sont affichees au-dessus du bouton, pas ailleurs : un
 * engagement dont on decouvre les conditions apres coup n'en est pas un. Les
 * deux issues sont dites, y compris celle qui coute.
 */
export function DepositForm({
  listingId,
  amountLabel,
  amountEur,
}: {
  listingId: string;
  amountLabel: string;
  amountEur?: number;
}) {
  const [state, action, pending] = useActionState(placeInterestDepositAction, initial);
  const [nda, setNda] = useState(false);

  return (
    <form action={action} className="mt-5">
      <input type="hidden" name="listingId" value={listingId} />
      <ul className="mb-4 grid gap-1.5 rounded-xl border border-line bg-surface-alt px-4 py-3 text-[13px] leading-relaxed text-ink">
        {depositTerms(amountLabel, amountEur).map((regle) => (
          <li key={regle}>{regle}</li>
        ))}
      </ul>
      <label className="mb-4 flex items-start gap-3 text-[14px] leading-relaxed text-ink">
        <input type="checkbox" name="nda" checked={nda} onChange={(e) => setNda(e.target.checked)} className="mt-1 h-4 w-4 shrink-0 accent-[#2563eb]" />
        <span>
          J’accepte l’engagement de confidentialité : les informations du cabinet ne servent qu’à cette acquisition et je ne
          démarche aucun de ses clients.{" "}
          <a href="/confidentialite-cession" target="_blank" className="text-indigo-dark underline-offset-2 hover:underline">
            Lire l’engagement
          </a>
        </span>
      </label>
      <Button type="submit" variant="primary" disabled={pending || !nda}>
        {pending ? "Enregistrement…" : `Déposer mon engagement de ${amountLabel}`}
      </Button>
      {state.error ? (
        <p role="alert" className="mt-3 text-[15px] text-danger">
          {state.error}
        </p>
      ) : null}
    </form>
  );
}
