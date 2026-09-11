"use client";

import { useActionState } from "react";
import { decideKycAction, type AdminState } from "@/app/actions/admin-orias";
import { Button } from "@/components/ui/button";

const initial: AdminState = {};

export function KycAdminActions({ userId }: { userId: string }) {
  const [state, action, pending] = useActionState(decideKycAction, initial);
  return (
    <div className="grid gap-2">
      <form action={action}>
        <input type="hidden" name="userId" value={userId} />
        <input type="hidden" name="approved" value="1" />
        <Button type="submit" size="sm" disabled={pending}>
          Confirmer l’identité
        </Button>
      </form>
      <form action={action} className="flex flex-wrap items-end gap-2">
        <input type="hidden" name="userId" value={userId} />
        <input type="hidden" name="approved" value="0" />
        <input
          name="reason"
          placeholder="Motif du refus"
          required
          minLength={8}
          className="h-8 min-w-[12rem] flex-1 rounded-sm border border-line bg-paper px-2 text-sm"
        />
        <Button type="submit" size="sm" variant="outline" disabled={pending}>
          Refuser
        </Button>
      </form>
      {state.error ? <p className="text-xs text-danger">{state.error}</p> : null}
      {state.ok ? <p className="text-xs text-ok">{state.ok}</p> : null}
    </div>
  );
}
