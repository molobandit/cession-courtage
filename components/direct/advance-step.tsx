"use client";

import { useActionState } from "react";
import { advanceDirectDealAction, type DirectDealState } from "@/app/actions/direct-deals";
import { Button } from "@/components/ui/button";

const initial: DirectDealState = {};

/** Franchit l'étape suivante. L'ordre est vérifié côté serveur, ce bouton le déclenche. */
export function AdvanceStep({
  dealId,
  stage,
  label,
}: {
  dealId: string;
  stage: string;
  label: string;
}) {
  const [state, action, pending] = useActionState(advanceDirectDealAction, initial);
  return (
    <form action={action}>
      <input type="hidden" name="dealId" value={dealId} />
      <input type="hidden" name="stage" value={stage} />
      <Button type="submit" variant="primary" disabled={pending}>
        {pending ? "Enregistrement…" : label}
      </Button>
      {state.error ? (
        <p role="alert" className="mt-2 text-[13px] text-danger">
          {state.error}
        </p>
      ) : null}
    </form>
  );
}
