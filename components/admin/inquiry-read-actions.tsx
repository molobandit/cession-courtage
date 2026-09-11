"use client";

import { useActionState } from "react";
import {
  toggleInvestorInquiryReadAction,
  type AdminInquiryState,
} from "@/app/actions/admin-inquiries";
import { Button } from "@/components/ui/button";

const initial: AdminInquiryState = {};

export function InquiryReadActions({ inquiryId, read }: { inquiryId: string; read: boolean }) {
  const [state, action, pending] = useActionState(toggleInvestorInquiryReadAction, initial);

  return (
    <form action={action}>
      <input type="hidden" name="inquiryId" value={inquiryId} />
      <input type="hidden" name="read" value={read ? "0" : "1"} />
      <Button type="submit" size="sm" variant={read ? "outline" : "default"} disabled={pending}>
        {pending ? "Enregistrement…" : read ? "Marquer non lu" : "Marquer lu"}
      </Button>
      {state.error ? <p className="mt-1 text-xs text-danger">{state.error}</p> : null}
    </form>
  );
}
