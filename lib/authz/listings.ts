import "server-only";
import { prisma } from "@/lib/prisma";
import { requireOriasVerified, requireSeller, type Actor } from "@/lib/authz/actor";
import { ForbiddenError } from "@/lib/authz/errors";
import { ownsFirm } from "@/lib/authz/policies";

const PUBLIC_STATUSES = ["PUBLISHED", "OFFERS_OPEN", "UNDER_NEGOTIATION"] as const;

export async function listPublicListings() {
  return prisma.listing.findMany({
    where: { status: { in: [...PUBLIC_STATUSES] }, publishedAt: { not: null } },
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
  const listing = await prisma.listing.findFirst({
    where: { publicNumber, status: { in: [...PUBLIC_STATUSES] } },
    include: {
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
      valuations: { orderBy: { computedAt: "desc" }, take: 1 },
    },
  });
  return listing;
}

export async function findMyListing(listingId: string, actor: Actor) {
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
