import "server-only";
import { prisma } from "@/lib/prisma";
import { requireOriasVerified, type Actor } from "@/lib/authz/actor";
import { ForbiddenError } from "@/lib/authz/errors";
import { closeExpiredOfferWindows } from "@/lib/authz/listings";
import { offerAccessFor } from "@/lib/authz/policies";

export async function listMyOffers(actor?: Actor) {
  const user = actor ?? (await requireOriasVerified());
  return prisma.offer.findMany({
    where: { buyerId: user.id },
    orderBy: { submittedAt: "desc" },
    select: {
      id: true,
      amount: true,
      upfrontPercent: true,
      status: true,
      submittedAt: true,
      listing: {
        select: {
          id: true,
          publicNumber: true,
          status: true,
          displayedZone: true,
          askingPrice: true,
          offerWindowClosesAt: true,
        },
      },
    },
  });
}

/**
 * Query-level sealed offers: the seller gets no rows (and no count) while the
 * window is open. A buyer only ever receives their own offer.
 */
export async function listOffersForListing(listingId: string, actor?: Actor) {
  const user = actor ?? (await requireOriasVerified());
  await closeExpiredOfferWindows();
  const listing = await prisma.listing.findUnique({
    where: { id: listingId },
    select: {
      id: true,
      status: true,
      offerWindowClosesAt: true,
      portfolio: { select: { firmId: true } },
    },
  });
  if (!listing) throw new ForbiddenError("Annonce introuvable.");

  const access = offerAccessFor(user, listing);
  if (access === "sealed") {
    return { access, offers: [] as const };
  }
  if (access === "none") {
    throw new ForbiddenError("Vous ne pouvez pas consulter ces offres.");
  }

  const offers = await prisma.offer.findMany({
    where: access === "own" ? { listingId, buyerId: user.id } : { listingId },
    orderBy: { submittedAt: "desc" },
    select: {
      id: true,
      buyerId: true,
      amount: true,
      upfrontPercent: true,
      message: true,
      status: true,
      submittedAt: true,
      buyer: { select: { id: true, publicAlias: true, role: true } },
    },
  });

  return { access, offers };
}
