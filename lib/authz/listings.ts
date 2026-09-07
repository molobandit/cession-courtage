import "server-only";
import { ListingStatus } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { requireOriasVerified, requireSeller, type Actor } from "@/lib/authz/actor";
import { ForbiddenError } from "@/lib/authz/errors";
import { canViewListing, ownsFirm } from "@/lib/authz/policies";

const PUBLIC_STATUSES: ListingStatus[] = [
  ListingStatus.PUBLISHED,
  ListingStatus.OFFERS_OPEN,
  ListingStatus.OFFERS_CLOSED,
  ListingStatus.UNDER_NEGOTIATION,
];

const listingPublicInclude = {
  portfolio: {
    select: {
      firmId: true,
      annualCommissions: true,
      contractCount: true,
      clientCount: true,
      averageAgeMonths: true,
      churnRate12m: true,
      contractLines: {
        select: {
          id: true,
          riskType: true,
          carrier: true,
          clientSegment: true,
          department: true,
          annualCommission: true,
          clientKey: true,
        },
      },
    },
  },
  lines: { select: { contractLineId: true } },
  valuations: { orderBy: { computedAt: "desc" as const }, take: 1 },
};

/** Persist OFFERS_CLOSED when the 21-day window has elapsed (lazy, on GET). */
export async function closeExpiredOfferWindows(now = new Date()): Promise<number> {
  const result = await prisma.listing.updateMany({
    where: {
      status: ListingStatus.OFFERS_OPEN,
      offerWindowClosesAt: { lte: now },
    },
    data: { status: ListingStatus.OFFERS_CLOSED },
  });
  return result.count;
}

export async function listPublicListings() {
  await closeExpiredOfferWindows();
  return prisma.listing.findMany({
    where: { status: { in: PUBLIC_STATUSES }, publishedAt: { not: null } },
    orderBy: { publishedAt: "desc" },
    select: {
      id: true,
      publicNumber: true,
      status: true,
      askingPrice: true,
      displayedZone: true,
      isPartial: true,
      isNationwide: true,
      sellerSupportMonths: true,
      publishedAt: true,
      offerWindowClosesAt: true,
      portfolio: {
        select: {
          annualCommissions: true,
          contractCount: true,
          averageAgeMonths: true,
        },
      },
    },
  });
}

export async function getPublicListing(publicNumber: number) {
  await closeExpiredOfferWindows();
  const listing = await prisma.listing.findFirst({
    where: { publicNumber, status: { in: PUBLIC_STATUSES } },
    include: listingPublicInclude,
  });
  return listing;
}

/**
 * Public number lookup: published (or owner) → listing; otherwise null (404, never 403).
 */
export async function getListingByPublicNumber(publicNumber: number, actor: Actor | null) {
  await closeExpiredOfferWindows();
  const listing = await prisma.listing.findFirst({
    where: { publicNumber },
    include: listingPublicInclude,
  });
  if (!listing) return null;
  if (canViewListing(actor, listing)) return listing;
  return null;
}

export async function findMyListing(listingId: string, actor: Actor) {
  await closeExpiredOfferWindows();
  const listing = await prisma.listing.findUnique({
    where: { id: listingId },
    include: {
      portfolio: { select: { id: true, firmId: true, label: true, annualCommissions: true } },
      offers: { select: { id: true, status: true } },
    },
  });
  if (!listing || !ownsFirm(actor, listing.portfolio.firmId)) return null;
  return listing;
}

export async function requireMyListing(listingId: string, actor?: Actor) {
  const user = actor ?? (await requireSeller());
  const listing = await findMyListing(listingId, user);
  if (!listing) throw new ForbiddenError("Cette annonce ne vous est pas accessible.");
  return listing;
}

export async function listBuyerMatches(actor?: Actor) {
  const user = actor ?? (await requireOriasVerified());
  await closeExpiredOfferWindows();
  return prisma.match.findMany({
    where: { mandate: { buyerId: user.id } },
    orderBy: { score: "desc" },
    include: {
      listing: {
        select: {
          id: true,
          publicNumber: true,
          status: true,
          askingPrice: true,
          displayedZone: true,
          offerWindowClosesAt: true,
        },
      },
      mandate: { select: { id: true, maxBudget: true } },
    },
  });
}
