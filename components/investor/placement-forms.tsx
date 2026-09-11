"use client";

import { useActionState } from "react";
import { placeInvestorDepositAction, type InvestorFormState } from "@/app/actions/investor-positions";
import { Button } from "@/components/ui/button";

const initial: InvestorFormState = {};

export function InvestorDepositForm({
  listingId,
  amountLabel,
}: {
  listingId: string;
  amountLabel: string;
}) {
  const [state, action, pending] = useActionState(placeInvestorDepositAction, initial);

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
