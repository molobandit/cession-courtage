import "server-only";
import { prisma } from "@/lib/prisma";

/**
 * Cote d'une annonce : meilleure offre déposée et nombre d'offres.
 *
 * Affichée publiquement, comme le cours d'un titre : l'acquéreur sait où en est
 * la séance avant de s'engager, sans jamais savoir qui a offert.
 */
export type ListingQuote = { bestOffer: number | null; offerCount: number };

export const EMPTY_QUOTE: ListingQuote = { bestOffer: null, offerCount: 0 };

export async function listingQuotes(listingIds: string[]): Promise<Map<string, ListingQuote>> {
  const out = new Map<string, ListingQuote>();
  if (listingIds.length === 0) return out;
  const offres = await prisma.offer.findMany({
    where: { listingId: { in: listingIds }, status: { in: ["SUBMITTED", "ACCEPTED"] } },
    select: { listingId: true, amount: true },
  });
  for (const o of offres) {
    const q = out.get(o.listingId) ?? { bestOffer: null, offerCount: 0 };
    const montant = Number(o.amount);
    q.offerCount += 1;
    q.bestOffer = q.bestOffer === null ? montant : Math.max(q.bestOffer, montant);
    out.set(o.listingId, q);
  }
  return out;
}

/** « Opportunité chaude » : plusieurs offres, ou une offre au prix demandé. */
export function isHotListing(quote: ListingQuote, askingPrice: number): boolean {
  return quote.offerCount >= 2 || (quote.bestOffer !== null && quote.bestOffer >= askingPrice);
}
