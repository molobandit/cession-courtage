"use client";

import { useActionState } from "react";
import {
  decideKycAction,
  lookupOriasAction,
  rejectOriasAction,
  verifyOriasAction,
  type AdminState,
} from "@/app/actions/admin-orias";
import { Button } from "@/components/ui/button";

const initial: AdminState = {};

export function OriasActions({ userId }: { userId: string }) {
  const [verifyState, verify, verifying] = useActionState(verifyOriasAction, initial);
  const [rejectState, reject, rejecting] = useActionState(rejectOriasAction, initial);
  const [lookupState, lookup, looking] = useActionState(lookupOriasAction, initial);
  const message = verifyState.ok || rejectState.ok || lookupState.ok;
  const error = verifyState.error || rejectState.error || lookupState.error;

  return (
    <div className="grid gap-2">
      <form action={lookup}>
        <input type="hidden" name="userId" value={userId} />
        <Button type="submit" size="sm" variant="outline" disabled={looking}>
          {looking ? "Consultation…" : "Consulter le registre"}
        </Button>
      </form>
      <form action={verify}>
        <input type="hidden" name="userId" value={userId} />
        <Button type="submit" size="sm" disabled={verifying}>
          {verifying ? "Validation…" : "Valider l'ORIAS"}
        </Button>
      </form>
      <form action={reject} className="flex flex-wrap items-end gap-2">
        <input type="hidden" name="userId" value={userId} />
        <input
          name="reason"
          placeholder="Motif du refus"
          required
          minLength={8}
          className="h-8 min-w-[12rem] flex-1 rounded-sm border border-line bg-paper px-2 text-sm"
        />
        <Button type="submit" size="sm" variant="outline" disabled={rejecting}>
          Refuser
        </Button>
      </form>
      {error ? <p className="text-xs text-danger">{error}</p> : null}
      {message ? <p className="text-xs text-ok">{message}</p> : null}
    </div>
  );
}
