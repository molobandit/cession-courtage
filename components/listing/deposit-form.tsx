"use client";

import { useActionState } from "react";
import { placeInterestDepositAction, type DepositFormState } from "@/app/actions/deposits";
import { Button } from "@/components/ui/button";
import { depositTerms } from "@/lib/billing/deposit-fate";

const initial: DepositFormState = {};

/**
 * Pose le depot d'interet de 2,5 %.
 *
 * Le droit est verifie par l'action serveur, ce bouton n'est qu'un declencheur.
 * Le libelle annonce explicitement l'absence d'encaissement, pour que personne
 * ne croie payer.
 *
 * Les regles du depot sont affichees au-dessus du bouton, pas ailleurs : un
 * engagement dont on decouvre les conditions apres coup n'en est pas un. Les
 * deux issues sont dites, y compris celle qui coute.
 */
export function DepositForm({
  listingId,
  amountLabel,
}: {
  listingId: string;
  amountLabel: string;
}) {
  const [state, action, pending] = useActionState(placeInterestDepositAction, initial);

  return (
    <form action={action} className="mt-5">
      <input type="hidden" name="listingId" value={listingId} />
      <ul className="mb-4 grid gap-1.5 rounded-xl border border-line bg-surface-alt px-4 py-3 text-[13px] leading-relaxed text-ink">
        {depositTerms(amountLabel).map((regle) => (
          <li key={regle}>{regle}</li>
        ))}
      </ul>
      <Button type="submit" variant="primary" disabled={pending}>
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
