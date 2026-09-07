import "server-only";
import { prisma } from "@/lib/prisma";
import { requireOriasVerified, type Actor } from "@/lib/authz/actor";
import { ForbiddenError } from "@/lib/authz/errors";
import { identitiesRevealed, isDealParticipant } from "@/lib/authz/policies";

export async function listMyDeals(actor?: Actor) {
  const user = actor ?? (await requireOriasVerified());
  const deals = await prisma.deal.findMany({
    where: { OR: [{ sellerId: user.id }, { buyerId: user.id }] },
    orderBy: { createdAt: "desc" },
    include: {
      listing: { select: { publicNumber: true, displayedZone: true, askingPrice: true } },
      seller: { select: { id: true, fullName: true, email: true, publicAlias: true, kycStatus: true, firm: { select: { legalName: true } } } },
      buyer: { select: { id: true, fullName: true, email: true, publicAlias: true, kycStatus: true, firm: { select: { legalName: true } } } },
    },
  });
  return deals.map((deal) => presentDeal(user, deal));
}

export async function getMyDeal(dealId: string, actor?: Actor) {
  const user = actor ?? (await requireOriasVerified());
  const deal = await prisma.deal.findUnique({
    where: { id: dealId },
    include: {
      listing: {
        select: {
          id: true,
          publicNumber: true,
          displayedZone: true,
          askingPrice: true,
          status: true,
        },
      },
      seller: { select: { id: true, fullName: true, email: true, publicAlias: true, kycStatus: true, firm: { select: { legalName: true } } } },
      buyer: { select: { id: true, fullName: true, email: true, publicAlias: true, kycStatus: true, firm: { select: { legalName: true } } } },
      documents: { orderBy: { createdAt: "desc" } },
      messages: { orderBy: { createdAt: "asc" }, include: { sender: { select: { id: true, publicAlias: true } } } },
      retentionReports: { orderBy: { monthIndex: "asc" } },
      dataRoomViews: { orderBy: { viewedAt: "desc" }, take: 20 },
    },
  });
  if (!deal || !isDealParticipant(user, deal)) {
    throw new ForbiddenError("Ce dossier ne vous est pas accessible.");
  }
  return presentDeal(user, deal);
}

export async function findMyDeal(dealId: string, actor: Actor) {
  try {
    return await getMyDeal(dealId, actor);
  } catch {
    return null;
  }
}

type DealParty = {
  id: string;
  fullName: string | null;
  email: string;
  publicAlias: string;
  kycStatus?: string;
  firm: { legalName: string } | null;
};

function presentParty(
  actor: Actor,
  deal: { stage: Parameters<typeof identitiesRevealed>[0]; sellerId: string; buyerId: string; sellerAlias: string; buyerAlias: string },
  party: DealParty,
  side: "seller" | "buyer",
) {
  const self = party.id === actor.id;
  if (self || identitiesRevealed(deal.stage)) {
    return {
      kind: "identified" as const,
      id: party.id,
      fullName: party.fullName,
      email: party.email,
      firmName: party.firm?.legalName ?? null,
      publicAlias: party.publicAlias,
      kycStatus: party.kycStatus ?? null,
    };
  }
  return {
    kind: "alias" as const,
    label: side === "buyer" ? deal.buyerAlias : deal.sellerAlias,
  };
}

export function counterpartyDisplayName(party: {
  kind: "alias" | "identified";
  label?: string;
  firmName?: string | null;
  fullName?: string | null;
  email?: string;
}): string {
  if (party.kind === "alias") return party.label ?? "Contrepartie";
  return party.firmName ?? party.fullName ?? party.email ?? "Contrepartie";
}

function presentDeal(
  actor: Actor,
  deal: {
    id: string;
    stage: Parameters<typeof identitiesRevealed>[0];
    sellerId: string;
    buyerId: string;
    sellerAlias: string;
    buyerAlias: string;
    agreedPrice: unknown;
    upfrontAmount: unknown;
    deferredAmount: unknown;
    adjustedDeferredAmount?: unknown;
    retentionTargetRate?: unknown;
    ndaAcceptedAt: Date | null;
    escrowStage: string;
    escrowProviderRef: string | null;
    createdAt: Date;
    listing: { id?: string; publicNumber: number; displayedZone: string; askingPrice: unknown; status?: string };
    seller: DealParty;
    buyer: DealParty;
    documents?: {
      id: string;
      type: string;
      fileName: string;
      signedAt: Date | null;
      createdAt: Date;
      uploadedById: string;
    }[];
    messages?: { id: string; body: string; createdAt: Date; senderId: string; sender: { id: string; publicAlias: string } }[];
    retentionReports?: {
      id: string;
      monthIndex: number;
      contractsRetained: number;
      contractsTransferred: number;
      actualCommissions: unknown;
      retentionRate: unknown;
      reportedAt: Date;
    }[];
    dataRoomViews?: { id: string; viewedAt: Date; viewerId: string; documentId: string | null }[];
  },
) {
  const revealed = identitiesRevealed(deal.stage);
  return {
    id: deal.id,
    stage: deal.stage,
    sellerId: deal.sellerId,
    buyerId: deal.buyerId,
    agreedPrice: deal.agreedPrice,
    upfrontAmount: deal.upfrontAmount,
    deferredAmount: deal.deferredAmount,
    adjustedDeferredAmount: deal.adjustedDeferredAmount ?? null,
    retentionTargetRate: deal.retentionTargetRate ?? 0.9,
    ndaAcceptedAt: deal.ndaAcceptedAt,
    escrowStage: deal.escrowStage,
    escrowProviderRef: deal.escrowProviderRef,
    createdAt: deal.createdAt,
    listing: deal.listing,
    identitiesRevealed: revealed,
    seller: presentParty(actor, deal, deal.seller, "seller"),
    buyer: presentParty(actor, deal, deal.buyer, "buyer"),
    documents: deal.documents ?? [],
    messages: (deal.messages ?? []).map((m) => ({
      id: m.id,
      body: m.body,
      createdAt: m.createdAt,
      senderId: m.senderId,
      senderLabel:
        revealed || m.senderId === actor.id
          ? m.sender.publicAlias
          : m.senderId === deal.sellerId
            ? deal.sellerAlias
            : deal.buyerAlias,
    })),
    retentionReports: deal.retentionReports ?? [],
    dataRoomViews: revealed || deal.stage !== "NDA" ? (deal.dataRoomViews ?? []) : [],
  };
}
