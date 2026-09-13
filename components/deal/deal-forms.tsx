"use client";

import { useActionState } from "react";
import {
  sendDealMessageAction,
  sendListingMessageAction,
  type DealFormState,
} from "@/app/actions/deals";
import { submitRetentionReportAction, type RetentionFormState } from "@/app/actions/retention";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

const initial: DealFormState = {};

export function MessageForm({
  dealId,
  listingId,
  recipients,
  requireRecipient = false,
}: {
  dealId?: string;
  listingId?: string;
  recipients?: { id: string; publicAlias: string }[];
  requireRecipient?: boolean;
}) {
  const action = dealId ? sendDealMessageAction : sendListingMessageAction;
  const [state, formAction, pending] = useActionState(action, initial);
  const onlyRecipient = recipients?.length === 1 ? recipients[0] : null;
  return (
    <form action={formAction} className="grid gap-2">
      {dealId ? <input type="hidden" name="dealId" value={dealId} /> : null}
      {listingId ? <input type="hidden" name="listingId" value={listingId} /> : null}
      {onlyRecipient ? <input type="hidden" name="recipientId" value={onlyRecipient.id} /> : null}
      {recipients && recipients.length > 1 ? (
        <select
          name="recipientId"
          required={requireRecipient}
          className="flex h-11 rounded-xl border border-line bg-surface-alt px-3 text-[15px]"
          defaultValue={recipients[0]?.id ?? ""}
        >
          {recipients.map((r) => (
            <option key={r.id} value={r.id}>
              {r.publicAlias.replace(/^#/, "")}
            </option>
          ))}
        </select>
      ) : null}
      <textarea
        name="body"
        required
        rows={3}
        className="w-full rounded-xl border border-line bg-surface-alt px-3 py-2 text-[15px]"
        placeholder="Votre question (pas de numéro de portable)"
      />
      {state.error ? <p className="text-sm text-danger">{state.error}</p> : null}
      <Button type="submit" size="sm" disabled={pending}>
        {pending ? "Envoi…" : "Envoyer"}
      </Button>
    </form>
  );
}

const retInitial: RetentionFormState = {};

export function RetentionForm({ dealId, transferred }: { dealId: string; transferred: number }) {
  const [state, action, pending] = useActionState(submitRetentionReportAction, retInitial);
  return (
    <form action={action} className="grid max-w-lg gap-3">
      <input type="hidden" name="dealId" value={dealId} />
      <div className="grid gap-1">
        <Label htmlFor="monthIndex">Échéance</Label>
        <select
          id="monthIndex"
          name="monthIndex"
          className="flex h-9 rounded-sm border border-line bg-paper px-2.5 text-sm"
          defaultValue="3"
        >
          <option value="3">M+3</option>
          <option value="6">M+6</option>
          <option value="12">M+12</option>
        </select>
      </div>
      <div className="grid gap-1">
        <Label htmlFor="contractsTransferred">Contrats transférés</Label>
        <Input id="contractsTransferred" name="contractsTransferred" defaultValue={String(transferred)} required />
      </div>
      <div className="grid gap-1">
        <Label htmlFor="contractsRetained">Contrats conservés</Label>
        <Input id="contractsRetained" name="contractsRetained" required />
      </div>
      <div className="grid gap-1">
        <Label htmlFor="actualCommissions">Commissions encaissées (€)</Label>
        <Input id="actualCommissions" name="actualCommissions" required />
      </div>
      {state.error ? <p className="text-sm text-danger">{state.error}</p> : null}
      <Button type="submit" disabled={pending}>
        {pending ? "Enregistrement…" : "Déclarer"}
      </Button>
    </form>
  );
}
