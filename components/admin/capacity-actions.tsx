"use client";

import { useActionState } from "react";
import { trancherCapaciteAction, type CapaciteState } from "@/app/actions/financial-capacity";
import { Button } from "@/components/ui/button";

const initial: CapaciteState = {};

/**
 * Décision de l'éditeur sur une capacité déclarée.
 *
 * Le motif est exigé pour un refus : un refus sans motif est incontestable,
 * donc contestable. Il est facultatif pour une validation, où il sert à noter
 * la pièce admise.
 */
export function CapacityActions({ userId }: { userId: string }) {
  const [state, action, pending] = useActionState(trancherCapaciteAction, initial);

  return (
    <form action={action} className="flex flex-col gap-2">
      <input type="hidden" name="userId" value={userId} />
      <input
        name="note"
        type="text"
        placeholder="Pièce admise, ou motif du refus"
        className="h-9 w-56 rounded-full border border-line bg-surface px-3 text-[13px] text-ink"
      />
      <div className="flex gap-2">
        <Button type="submit" name="decision" value="VERIFIED" size="sm" disabled={pending}>
          {pending ? "…" : "Vérifier"}
        </Button>
        <Button type="submit" name="decision" value="REJECTED" size="sm" variant="outline" disabled={pending}>
          Refuser
        </Button>
      </div>
      {state.error ? (
        <p role="alert" className="text-[13px] text-danger">
          {state.error}
        </p>
      ) : null}
    </form>
  );
}
