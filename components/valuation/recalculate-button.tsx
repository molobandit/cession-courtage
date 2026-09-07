"use client";

import { useActionState } from "react";
import { recalculateValuationAction, type ActionState } from "@/app/actions/valuation";
import { Button } from "@/components/ui/button";

const initial: ActionState = {};

export function RecalculateValuationButton({ portfolioId }: { portfolioId: string }) {
  const [state, action, pending] = useActionState(recalculateValuationAction, initial);
  return (
    <form action={action}>
      <input type="hidden" name="portfolioId" value={portfolioId} />
      <Button type="submit" variant="outline" size="sm" disabled={pending}>
        {pending ? "Calcul…" : "Recalculer"}
      </Button>
      {state.error ? <p className="mt-1 text-xs text-danger">{state.error}</p> : null}
    </form>
  );
}
