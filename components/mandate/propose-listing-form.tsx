"use client";

import { useActionState } from "react";
import { proposeListingAction, type ProposalState } from "@/app/actions/mandate-proposals";
import { Button } from "@/components/ui/button";

const initial: ProposalState = {};

export type ProposableListing = {
  id: string;
  label: string;
  alreadyProposed: boolean;
};

/** Le cédant choisit l'annonce qui répond à la demande, et peut y joindre un mot. */
export function ProposeListingForm({
  mandateId,
  listings,
}: {
  mandateId: string;
  listings: ProposableListing[];
}) {
  const [state, action, pending] = useActionState(proposeListingAction, initial);
  const disponibles = listings.filter((l) => !l.alreadyProposed);

  if (state.sent) {
    return (
      <p role="status" className="rounded-2xl border border-ok/30 bg-ok/10 px-4 py-3 text-[15px] text-ink">
        Proposition envoyée. L’acquéreur est prévenu et peut prendre position sur votre annonce.
      </p>
    );
  }

  if (disponibles.length === 0) {
    return (
      <p className="text-[15px] text-muted">
        Toutes vos annonces ouvertes sont déjà proposées sur cette demande.
      </p>
    );
  }

  return (
    <form action={action} className="grid gap-4">
      <input type="hidden" name="mandateId" value={mandateId} />
      <div>
        <label htmlFor="listingId" className="text-[15px] font-medium text-ink">
          Annonce à proposer
        </label>
        <select
          id="listingId"
          name="listingId"
          required
          className="mt-2 h-11 w-full rounded-lg border border-line bg-paper px-3 text-[15px] text-ink"
        >
          {disponibles.map((l) => (
            <option key={l.id} value={l.id}>
              {l.label}
            </option>
          ))}
        </select>
      </div>
      <div>
        <label htmlFor="message" className="text-[15px] font-medium text-ink">
          Message à l’acquéreur <span className="font-normal text-muted">(facultatif)</span>
        </label>
        <textarea
          id="message"
          name="message"
          rows={3}
          maxLength={1000}
          placeholder="Pourquoi ce portefeuille répond à votre recherche…"
          className="mt-2 w-full rounded-lg border border-line bg-paper px-3 py-2 text-[15px] text-ink"
        />
      </div>
      {state.error ? (
        <p role="alert" className="text-[14px] text-danger">
          {state.error}
        </p>
      ) : null}
      <Button type="submit" variant="primary" disabled={pending}>
        {pending ? "Envoi…" : "Proposer mon portefeuille"}
      </Button>
    </form>
  );
}
