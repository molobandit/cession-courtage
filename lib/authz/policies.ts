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

export function hasOfferWindowExpired(listing: {
  status: ListingStatus;
  offerWindowClosesAt: Date | null;
  now?: Date;
}): boolean {
  const now = listing.now ?? new Date();
  if (listing.status !== "OFFERS_OPEN") return false;
  if (!listing.offerWindowClosesAt) return false;
  return listing.offerWindowClosesAt.getTime() <= now.getTime();
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
  if (listing.status !== "OFFERS_OPEN") return false;
  if (hasOfferWindowExpired(listing)) return false;
  return true;
}

export function isPublicListingStatus(status: ListingStatus): boolean {
  return (
    status === "PUBLISHED" ||
    status === "OFFERS_OPEN" ||
    status === "OFFERS_CLOSED" ||
    status === "UNDER_NEGOTIATION"
  );
}

/** Published (or owner). Never use this to leak existence via 403 — return 404 instead. */
export function canViewListing(
  actor: Actor | null,
  listing: { status: ListingStatus; portfolio: { firmId: string } },
): boolean {
  if (isPublicListingStatus(listing.status)) return true;
  return Boolean(actor && ownsFirm(actor, listing.portfolio.firmId));
}

export function canManageListing(
  actor: Actor,
  listing: { portfolio: { firmId: string } },
): boolean {
  return ownsFirm(actor, listing.portfolio.firmId);
}

export function isListingMessageParty(input: {
  actorFirmId: string | null;
  listingFirmId: string;
  hasOffer: boolean;
  hasDeal: boolean;
}): boolean {
  if (input.actorFirmId && input.actorFirmId === input.listingFirmId) return true;
  return input.hasOffer || input.hasDeal;
}

export type ListingMessageWhere = {
  listingId: string;
  OR?: ({ senderId: string } | { recipientId: string } | { recipientId: null; senderId: string })[];
};

/**
 * Filtre de lecture de la messagerie d'annonce, construit ici pour que la
 * requete et le test portent sur le meme objet.
 *
 * Le cedant lit tout. Un acquereur ne lit que ce qu'il a envoye, ce qui lui est
 * adresse, et les messages diffuses par le cedant. Un message sans destinataire
 * emis par un autre acquereur ne doit jamais lui parvenir : deux candidats
 * concurrents ne peuvent pas se decouvrir.
 */
export function listingMessageWhere(input: {
  listingId: string;
  actorId: string;
  isSeller: boolean;
  sellerUserId: string | null;
}): ListingMessageWhere {
  if (input.isSeller) return { listingId: input.listingId };

  const broadcast =
    input.sellerUserId !== null
      ? [{ recipientId: null as null, senderId: input.sellerUserId }]
      : [];

  return {
    listingId: input.listingId,
    OR: [{ senderId: input.actorId }, { recipientId: input.actorId }, ...broadcast],
  };
}

export type OfferAccess = "none" | "own" | "full" | "sealed";

export function offerAccessFor(
  actor: Actor,
  listing: {
    status: ListingStatus;
    offerWindowClosesAt: Date | null;
    portfolio: { firmId: string };
    now?: Date;
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
