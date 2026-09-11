"use client";

import { useActionState } from "react";
import { startGrowthCheckoutAction, type BillingFormState } from "@/app/actions/billing";
import { Button } from "@/components/ui/button";

const initial: BillingFormState = {};

export function SubscribeButton({
  label,
  className,
}: {
  label: string;
  className?: string;
}) {
  const [state, action, pending] = useActionState(startGrowthCheckoutAction, initial);
  return (
    <form action={action} className={className}>
      <Button type="submit" variant="primary" size="lg" className="w-full" disabled={pending}>
        {pending ? "Redirection vers le paiement…" : label}
      </Button>
      {state.error ? (
        <p role="alert" className="mt-3 text-center text-[13px] text-danger">
          {state.error}
        </p>
      ) : null}
    </form>
  );
}
