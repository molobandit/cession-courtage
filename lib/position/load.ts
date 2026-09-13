import "server-only";
import { prisma } from "@/lib/prisma";
import { positionState, type PositionFacts } from "@/lib/position/progress";

/**
 * Prise de position : création idempotente et lecture des faits qui la font avancer.
 *
 * Une position n'a pas d'état propre à tenir à jour : son avancement se déduit
 * du dépôt, de l'offre et du dossier de cession. Rien à synchroniser, donc rien
 * qui puisse diverger entre l'écran de l'acquéreur et celui du cédant.
 */

export async function ensurePosition(input: {
  listingId: string;
  buyerId: string;
  proposalId?: string | null;
}): Promise<{ id: string; created: boolean }> {
  const existante = await prisma.buyerPosition.findUnique({
    where: { listingId_buyerId: { listingId: input.listingId, buyerId: input.buyerId } },
    select: { id: true, proposalId: true },
  });
  if (existante) {
    if (input.proposalId && !existante.proposalId) {
      await prisma.buyerPosition.update({
        where: { id: existante.id },
        data: { proposalId: input.proposalId },
      });
    }
    return { id: existante.id, created: false };
  }
  // D1 sans transaction : l'unicité (annonce, acquéreur) fait qu'un double clic
  // retombe sur la même position au lieu d'en créer deux.
  const creee = await prisma.buyerPosition
    .create({
      data: { listingId: input.listingId, buyerId: input.buyerId, proposalId: input.proposalId ?? null },
      select: { id: true },
    })
    .catch(async () =>
      prisma.buyerPosition.findUniqueOrThrow({
        where: { listingId_buyerId: { listingId: input.listingId, buyerId: input.buyerId } },
        select: { id: true },
      }),
    );
  return { id: creee.id, created: true };
}

const POSITION_SELECT = {
  id: true,
  listingId: true,
  buyerId: true,
  proposalId: true,
  createdAt: true,
  updatedAt: true,
  buyer: { select: { id: true, publicAlias: true, email: true } },
  listing: {
    select: {
      id: true,
      publicNumber: true,
      status: true,
      askingPrice: true,
      displayedZone: true,
      isPartial: true,
      offerWindowClosesAt: true,
      portfolio: { select: { label: true, annualCommissions: true, firmId: true } },
    },
  },
} as const;

async function factsFor(listingId: string, buyerId: string, listingStatus: PositionFacts["listingStatus"]) {
  const [deposit, offer, deal] = await Promise.all([
    prisma.interestDeposit.findUnique({
      where: { listingId_buyerId: { listingId, buyerId } },
      select: { id: true, amount: true, outcome: true },
    }),
    prisma.offer.findUnique({
      where: { listingId_buyerId: { listingId, buyerId } },
      select: { id: true, status: true, amount: true, upfrontPercent: true, submittedAt: true },
    }),
    prisma.deal.findUnique({
      where: { listingId_buyerId: { listingId, buyerId } },
      select: { id: true, stage: true, agreedPrice: true, sellerId: true },
    }),
  ]);
  const facts: PositionFacts = {
    hasDeposit: Boolean(deposit),
    offerStatus: offer?.status ?? null,
    dealStage: deal?.stage ?? null,
    listingStatus,
  };
  return { deposit, offer, deal, facts, state: positionState(facts) };
}

export async function loadPosition(id: string) {
  const position = await prisma.buyerPosition.findUnique({ where: { id }, select: POSITION_SELECT });
  if (!position) return null;
  const detail = await factsFor(position.listingId, position.buyerId, position.listing.status);
  return { position, ...detail };
}

/** Positions d'un acquéreur, avec leur avancement, pour le tableau de bord. */
export async function listMyPositions(buyerId: string) {
  const positions = await prisma.buyerPosition.findMany({
    where: { buyerId },
    orderBy: { updatedAt: "desc" },
    select: POSITION_SELECT,
  });
  return Promise.all(
    positions.map(async (position) => ({
      position,
      ...(await factsFor(position.listingId, position.buyerId, position.listing.status)),
    })),
  );
}

/** Candidats d'une annonce, pour son cédant. */
export async function listListingPositions(listingId: string) {
  const positions = await prisma.buyerPosition.findMany({
    where: { listingId },
    orderBy: { createdAt: "asc" },
    select: POSITION_SELECT,
  });
  return Promise.all(
    positions.map(async (position) => ({
      position,
      ...(await factsFor(position.listingId, position.buyerId, position.listing.status)),
    })),
  );
}

/** Position d'un acquéreur sur une annonce, s'il en a une. */
export async function findPositionId(listingId: string, buyerId: string): Promise<string | null> {
  const p = await prisma.buyerPosition.findUnique({
    where: { listingId_buyerId: { listingId, buyerId } },
    select: { id: true },
  });
  return p?.id ?? null;
}

/** Où en est un acquéreur sur une annonce, s'il y a pris position. */
export async function positionSnapshot(listingId: string, buyerId: string) {
  const position = await prisma.buyerPosition.findUnique({
    where: { listingId_buyerId: { listingId, buyerId } },
    select: { id: true, listing: { select: { status: true } } },
  });
  if (!position) return null;
  const { state } = await factsFor(listingId, buyerId, position.listing.status);
  return { id: position.id, state };
}
