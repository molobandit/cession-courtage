"use client";

import { useActionState } from "react";
import { placeInterestDepositAction, type DepositFormState } from "@/app/actions/deposits";
import { Button } from "@/components/ui/button";

const initial: DepositFormState = {};

/**
 * Pose le depot d'interet de 2,5 %.
 *
 * Le droit est verifie par l'action serveur, ce bouton n'est qu'un declencheur.
 * Le libelle annonce explicitement l'absence d'encaissement, pour que personne
 * ne croie payer.
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
