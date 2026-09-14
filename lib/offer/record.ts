import "server-only";
import { OfferStatus } from "@prisma/client";
import { isOfferWindowSealed } from "@/lib/authz/policies";
import { ensurePosition } from "@/lib/position/load";
import { prisma } from "@/lib/prisma";

export type PendingOffer = {
  amount: number;
  upfrontPercent: number;
  message: string;
  effectiveDate: string | null;
  carriers: string[];
};

/**
 * Enregistre l'offre d'un acquéreur et prévient le cédant.
 *
 * Appelé par le formulaire d'offre, et au retour d'un paiement du dépôt quand
 * l'offre a été saisie avec lui : l'acquéreur ne refait pas sa saisie.
 */
export async function recordOffer(
  buyer: { id: string },
  listing: { id: string; publicNumber: number | null; status: import("@prisma/client").ListingStatus; offerWindowClosesAt: Date | null; portfolio: { firmId: string } },
  offre: PendingOffer,
): Promise<{ positionId: string }> {
  const effectiveDate = offre.effectiveDate ? new Date(`${offre.effectiveDate}T00:00:00.000Z`) : null;
  const donnees = {
    amount: offre.amount.toFixed(2),
    upfrontPercent: offre.upfrontPercent.toFixed(2),
    message: offre.message,
    effectiveDate,
    carriers: offre.carriers,
  };
  await prisma.offer.upsert({
    where: { listingId_buyerId: { listingId: listing.id, buyerId: buyer.id } },
    update: { ...donnees, status: OfferStatus.SUBMITTED, submittedAt: new Date() },
    create: { listingId: listing.id, buyerId: buyer.id, ...donnees },
  });
  const offer = await prisma.offer.findUnique({
    where: { listingId_buyerId: { listingId: listing.id, buyerId: buyer.id } },
    select: { id: true },
  });
  const position = await ensurePosition({ listingId: listing.id, buyerId: buyer.id });
  const { findFirmSeller, notifyOfferReceived } = await import("@/lib/notify/transactional");
  const seller = await findFirmSeller(listing.portfolio.firmId);
  if (offer && seller && listing.publicNumber) {
    await notifyOfferReceived({
      offerId: offer.id,
      sellerUserId: seller.id,
      sellerEmail: seller.email,
      publicNumber: listing.publicNumber,
      sealed: isOfferWindowSealed(listing),
      href: `/app/positions/${position.id}`,
    }).catch(() => null);
  }
  return { positionId: position.id };
}
