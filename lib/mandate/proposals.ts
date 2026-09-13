import "server-only";
import { prisma } from "@/lib/prisma";

const LISTING_CARD = {
  id: true,
  publicNumber: true,
  status: true,
  askingPrice: true,
  displayedZone: true,
  portfolio: { select: { label: true, annualCommissions: true } },
} as const;

/** Propositions reçues sur une demande, pour son seul auteur. */
export async function listProposalsForMandate(mandateId: string) {
  return prisma.mandateProposal.findMany({
    where: { mandateId },
    orderBy: { createdAt: "desc" },
    select: {
      id: true,
      message: true,
      createdAt: true,
      listing: { select: LISTING_CARD },
      seller: { select: { publicAlias: true } },
    },
  });
}

/** Annonces du cabinet qu'un cédant peut encore proposer. */
export async function listProposableListings(firmId: string | null) {
  if (!firmId) return [];
  return prisma.listing.findMany({
    where: {
      portfolio: { firmId },
      status: { in: ["PUBLISHED", "OFFERS_OPEN", "OFFERS_CLOSED"] },
    },
    orderBy: { publicNumber: "asc" },
    select: LISTING_CARD,
  });
}

/** Ce qu'un cédant a déjà proposé sur cette demande. */
export async function listMyProposalsOnMandate(mandateId: string, sellerId: string) {
  return prisma.mandateProposal.findMany({
    where: { mandateId, sellerId },
    select: { listingId: true },
  });
}

/** Positions vendeur d'un cédant : ses réponses aux demandes d'acquisition. */
export async function listMyProposalsAsSeller(sellerId: string) {
  return prisma.mandateProposal.findMany({
    where: { sellerId },
    orderBy: { createdAt: "desc" },
    select: {
      id: true,
      createdAt: true,
      listing: { select: { publicNumber: true, status: true } },
      mandate: {
        select: {
          publicNumber: true,
          maxBudget: true,
          riskTypes: true,
          zones: true,
          buyer: { select: { publicAlias: true } },
        },
      },
    },
  });
}

/** Portefeuilles qui correspondent à une demande, du meilleur score au moins bon. */
export async function listMatchesForMandate(mandateId: string, take = 6) {
  return prisma.match.findMany({
    where: {
      mandateId,
      listing: { status: { in: ["PUBLISHED", "OFFERS_OPEN", "OFFERS_CLOSED"] } },
    },
    orderBy: { score: "desc" },
    take,
    select: { id: true, score: true, listing: { select: LISTING_CARD } },
  });
}
