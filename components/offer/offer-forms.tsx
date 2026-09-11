"use client";

import { useActionState } from "react";
import { acceptOfferAction, submitOfferAction, withdrawOfferAction, type OfferFormState } from "@/app/actions/offers";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

const initial: OfferFormState = {};

export function SubmitOfferForm({ listingId, asking }: { listingId: string; asking: string }) {
  const [state, action, pending] = useActionState(submitOfferAction, initial);
  return (
    <form action={action} className="grid gap-3">
      <input type="hidden" name="listingId" value={listingId} />
      <div className="grid gap-1">
        <Label htmlFor="amount">Montant (€)</Label>
        <Input id="amount" name="amount" defaultValue={asking} required />
      </div>
      <div className="grid gap-1">
        <Label htmlFor="upfrontPercent">Comptant (%)</Label>
        <Input id="upfrontPercent" name="upfrontPercent" defaultValue="70" required />
      </div>
      <div className="grid gap-1">
        <Label htmlFor="message">Message</Label>
        <textarea
          id="message"
          name="message"
          required
          minLength={10}
          rows={3}
          className="w-full rounded-sm border border-line bg-paper px-2.5 py-2 text-sm"
          placeholder="Questions sur le dossier (pas de numéro de portable)"
        />
      </div>
      {state.error ? <p className="text-sm text-danger">{state.error}</p> : null}
      <Button type="submit" disabled={pending}>
        {pending ? "Dépôt…" : "Déposer une offre scellée"}
      </Button>
    </form>
  );
}

export function WithdrawOfferButton({ offerId }: { offerId: string }) {
  const [state, action, pending] = useActionState(withdrawOfferAction, initial);
  return (
    <form action={action}>
      <input type="hidden" name="offerId" value={offerId} />
      <Button type="submit" size="sm" variant="outline" disabled={pending}>
        {pending ? "Retrait…" : "Retirer"}
      </Button>
      {state.error ? <p className="text-xs text-danger">{state.error}</p> : null}
    </form>
  );
}

export function AcceptOfferButton({ offerId }: { offerId: string }) {
  const [state, action, pending] = useActionState(acceptOfferAction, initial);
  return (
    <form
      action={action}
      onSubmit={(event) => {
        if (
          !window.confirm(
            "Retenir cette offre ouvre un dossier de confidentialité et écarte les autres propositions. Continuer ?",
          )
        ) {
          event.preventDefault();
        }
      }}
    >
      <input type="hidden" name="offerId" value={offerId} />
      <Button type="submit" className="w-full" disabled={pending}>
        {pending ? "Ouverture du dossier…" : "Retenir cette offre"}
      </Button>
      {state.error ? <p className="mt-2 text-xs text-danger">{state.error}</p> : null}
    </form>
  );
}
