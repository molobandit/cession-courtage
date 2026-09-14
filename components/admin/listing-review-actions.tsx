"use client";

import { useActionState } from "react";
import { reviewListingAction, type ListingReviewState } from "@/app/actions/listing-review";
import { Button } from "@/components/ui/button";

const initial: ListingReviewState = {};

export function ListingReviewActions({ listingId }: { listingId: string }) {
  const [state, action, pending] = useActionState(reviewListingAction, initial);
  if (state.ok) return <p className="text-sm font-medium text-ok">{state.ok}</p>;
  return (
    <div className="grid gap-2">
      <form action={action}>
        <input type="hidden" name="listingId" value={listingId} />
        <input type="hidden" name="decision" value="approve" />
        <Button type="submit" size="sm" disabled={pending}>
          Publier l’annonce
        </Button>
      </form>
      <form action={action} className="flex flex-wrap items-end gap-2">
        <input type="hidden" name="listingId" value={listingId} />
        <input type="hidden" name="decision" value="reject" />
        <input name="note" placeholder="Motif du renvoi" required minLength={8} className="h-8 min-w-[12rem] flex-1 rounded-sm border border-line bg-paper px-2 text-sm" />
        <Button type="submit" size="sm" variant="outline" disabled={pending}>
          Renvoyer au cédant
        </Button>
      </form>
      {state.error ? <p className="text-xs text-danger">{state.error}</p> : null}
    </div>
  );
}
