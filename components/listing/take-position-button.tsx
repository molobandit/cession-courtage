"use client";

import { useActionState } from "react";
import { takePositionAction, type PositionActionState } from "@/app/actions/positions";

const initial: PositionActionState = {};

/** Ouvre le dossier de l'acquéreur. La position, la notification et la redirection se font côté serveur. */
export function TakePositionButton({ listingId, className }: { listingId: string; className?: string }) {
  const [state, action, pending] = useActionState(takePositionAction, initial);
  return (
    <form action={action}>
      <input type="hidden" name="listingId" value={listingId} />
      <button type="submit" disabled={pending} className={className}>
        {pending ? "Ouverture du dossier…" : "Prendre position"}
      </button>
      {state.error ? (
        <p role="alert" className="mt-2 text-[13px] text-danger">
          {state.error}
        </p>
      ) : null}
    </form>
  );
}
