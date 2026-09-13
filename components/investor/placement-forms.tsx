"use client";

import { useActionState } from "react";
import { placeInvestorDepositAction, type InvestorFormState } from "@/app/actions/investor-positions";
import { Button } from "@/components/ui/button";
import { depositTerms } from "@/lib/billing/deposit-fate";

const initial: InvestorFormState = {};

export function InvestorDepositForm({
  listingId,
  amountLabel,
  amountEur,
}: {
  listingId: string;
  amountLabel: string;
  amountEur?: number;
}) {
  const [state, action, pending] = useActionState(placeInvestorDepositAction, initial);

  return (
    <form action={action} className="mt-5">
      <input type="hidden" name="listingId" value={listingId} />
      <ul className="mb-4 grid gap-1.5 rounded-xl border border-line bg-surface-alt px-4 py-3 text-[13px] leading-relaxed text-ink">
        {depositTerms(amountLabel, amountEur).map((regle) => (
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
