"use client";

import { useActionState } from "react";
import {
  createListingAction,
  openOfferWindowAction,
  publishListingAction,
  withdrawListingAction,
  type ListingFormState,
} from "@/app/actions/listings";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

const initial: ListingFormState = {};
const selectClass =
  "flex h-9 w-full rounded-sm border border-line bg-paper px-2.5 text-sm text-ink outline-none focus:border-navy focus:ring-1 focus:ring-navy";

export function CreateListingForm({
  portfolioId,
  defaultAsking,
}: {
  portfolioId: string;
  defaultAsking: string;
}) {
  const [state, action, pending] = useActionState(createListingAction, initial);
  return (
    <form action={action} className="grid max-w-lg gap-3">
      <input type="hidden" name="portfolioId" value={portfolioId} />
      <div className="grid gap-1">
        <Label htmlFor="askingPrice">Prix demandé (€)</Label>
        <Input id="askingPrice" name="askingPrice" defaultValue={defaultAsking} required />
        <p className="text-xs text-muted">Entre 2 000 et 200 000 €.</p>
      </div>
      <div className="grid gap-1">
        <Label htmlFor="sellerSupportMonths">Accompagnement</Label>
        <select id="sellerSupportMonths" name="sellerSupportMonths" defaultValue="3" className={selectClass}>
          <option value="0">Aucun (malus valorisation)</option>
          <option value="3">3 mois</option>
          <option value="6">6 mois ou plus</option>
        </select>
      </div>
      {state.error ? <p className="text-sm text-danger">{state.error}</p> : null}
      <Button type="submit" disabled={pending}>
        {pending ? "Création…" : "Enregistrer le brouillon"}
      </Button>
    </form>
  );
}

function TinyForm({
  action,
  listingId,
  label,
  pendingLabel,
  variant = "default",
}: {
  action: (prev: ListingFormState, formData: FormData) => Promise<ListingFormState>;
  listingId: string;
  label: string;
  pendingLabel: string;
  variant?: "default" | "outline";
}) {
  const [state, formAction, pending] = useActionState(action, initial);
  return (
    <form action={formAction} className="inline">
      <input type="hidden" name="listingId" value={listingId} />
      <Button type="submit" size="sm" variant={variant} disabled={pending}>
        {pending ? pendingLabel : label}
      </Button>
      {state.error ? <p className="mt-1 text-xs text-danger">{state.error}</p> : null}
    </form>
  );
}

export function PublishListingButton({ listingId }: { listingId: string }) {
  return <TinyForm action={publishListingAction} listingId={listingId} label="Publier" pendingLabel="Publication…" />;
}

export function OpenOffersButton({ listingId }: { listingId: string }) {
  return (
    <TinyForm
      action={openOfferWindowAction}
      listingId={listingId}
      label="Ouvrir les offres (21 jours)"
      pendingLabel="Ouverture…"
    />
  );
}

export function WithdrawListingButton({ listingId }: { listingId: string }) {
  return (
    <TinyForm
      action={withdrawListingAction}
      listingId={listingId}
      label="Retirer"
      pendingLabel="Retrait…"
      variant="outline"
    />
  );
}
