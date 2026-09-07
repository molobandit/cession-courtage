import type { DealStage, ListingStatus } from "@prisma/client";
import type { Actor } from "@/lib/authz/actor";

const STAGE_ORDER: DealStage[] = [
  "NDA",
  "DATA_ROOM",
  "LOI",
  "KYC",
  "DEED",
  "SIGNATURE",
  "ESCROW",
  "TRANSFER",
  "RETENTION",
  "CLOSED",
];

export function isStageAtLeast(current: DealStage, min: DealStage): boolean {
  return STAGE_ORDER.indexOf(current) >= STAGE_ORDER.indexOf(min);
}

export function ownsFirm(actor: Actor, firmId: string | null | undefined): boolean {
  if (!firmId || !actor.firmId) return false;
  return actor.firmId === firmId;
}

export function isDealParticipant(
  actor: Actor,
  deal: { sellerId: string; buyerId: string },
): boolean {
  return actor.id === deal.sellerId || actor.id === deal.buyerId;
}

export function identitiesRevealed(stage: DealStage): boolean {
  return isStageAtLeast(stage, "LOI");
}

/**
 * Sealed-offer rule (query-level, not display-only):
 * while the window is open, nobody sees other buyers' offers,
 * and the seller sees neither amounts nor the offer count.
 */
export function isOfferWindowSealed(listing: {
  status: ListingStatus;
  offerWindowClosesAt: Date | null;
  now?: Date;
}): boolean {
  const now = listing.now ?? new Date();
  if (listing.status !== "OFFERS_OPEN") return false;
  if (!listing.offerWindowClosesAt) return true;
  return listing.offerWindowClosesAt.getTime() > now.getTime();
}

export type OfferAccess = "none" | "own" | "full" | "sealed";

export function offerAccessFor(
  actor: Actor,
  listing: {
    status: ListingStatus;
    offerWindowClosesAt: Date | null;
    portfolio: { firmId: string };
  },
): OfferAccess {
  const seller = ownsFirm(actor, listing.portfolio.firmId);
  const sealed = isOfferWindowSealed(listing);
  if (sealed) {
    if (seller) return "sealed";
    return "own";
  }
  if (seller) return "full";
  return "own";
}
