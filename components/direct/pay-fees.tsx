"use client";

import { useActionState } from "react";
import { startDirectFeesCheckoutAction, type DirectDealState } from "@/app/actions/direct-deals";
import { Button } from "@/components/ui/button";

const initial: DirectDealState = {};

/** Ouvre le paiement Stripe. Le montant est recalculé côté serveur. */
export function PayFees({ dealId, label }: { dealId: string; label: string }) {
  const [state, action, pending] = useActionState(startDirectFeesCheckoutAction, initial);
  return (
    <form action={action}>
      <input type="hidden" name="dealId" value={dealId} />
      <Button type="submit" variant="primary" disabled={pending}>
        {pending ? "Ouverture du paiement…" : label}
      </Button>
      {state.error ? (
        <p role="alert" className="mt-2 text-[13px] text-danger">
          {state.error}
        </p>
      ) : null}
    </form>
  );
}
