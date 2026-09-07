import "server-only";
import { prisma } from "@/lib/prisma";
import { requireOriasVerified, requireSeller, type Actor } from "@/lib/authz/actor";
import { ForbiddenError } from "@/lib/authz/errors";
import { ownsFirm } from "@/lib/authz/policies";

export async function listMyPortfolios(actor?: Actor) {
  const user = actor ?? (await requireSeller());
  if (!user.firmId) return [];
  return prisma.portfolio.findMany({
    where: { firmId: user.firmId },
    orderBy: { importedAt: "desc" },
    select: {
      id: true,
      label: true,
      contractCount: true,
      clientCount: true,
      annualCommissions: true,
      averageAgeMonths: true,
      churnRate12m: true,
      importedAt: true,
      listings: {
        select: { id: true, status: true, askingPrice: true, publicNumber: true },
        orderBy: { createdAt: "desc" },
        take: 3,
      },
      valuations: {
        where: { listingId: null },
        orderBy: { computedAt: "desc" },
        take: 1,
        select: { midValue: true, qualityScore: true },
      },
    },
  });
}

export async function getMyPortfolio(portfolioId: string, actor?: Actor) {
  const user = actor ?? (await requireSeller());
  const portfolio = await prisma.portfolio.findUnique({
    where: { id: portfolioId },
    include: {
      firm: { select: { id: true, legalName: true, distributionMode: true, complianceScore: true } },
      valuations: {
        where: { listingId: null },
        orderBy: { computedAt: "desc" },
        take: 1,
      },
    },
  });
  if (!portfolio || !ownsFirm(user, portfolio.firmId)) {
    throw new ForbiddenError("Ce portefeuille ne vous est pas accessible.");
  }
  return portfolio;
}

export async function findMyPortfolio(portfolioId: string, actor: Actor) {
  if (!actor.firmId) return null;
  const portfolio = await prisma.portfolio.findUnique({
    where: { id: portfolioId },
    include: {
      firm: { select: { id: true, legalName: true, distributionMode: true, complianceScore: true } },
      valuations: {
        where: { listingId: null },
        orderBy: { computedAt: "desc" },
        take: 1,
      },
      listings: { orderBy: { createdAt: "desc" }, take: 5 },
    },
  });
  if (!portfolio || !ownsFirm(actor, portfolio.firmId)) return null;
  return portfolio;
}

export async function listMyListings(actor?: Actor) {
  const user = actor ?? (await requireOriasVerified());
  if (!user.firmId) return [];
  return prisma.listing.findMany({
    where: { portfolio: { firmId: user.firmId } },
    orderBy: { createdAt: "desc" },
    select: {
      id: true,
      publicNumber: true,
      status: true,
      askingPrice: true,
      displayedZone: true,
      isPartial: true,
      publishedAt: true,
      offerWindowClosesAt: true,
      portfolio: { select: { id: true, label: true, annualCommissions: true } },
    },
  });
}
