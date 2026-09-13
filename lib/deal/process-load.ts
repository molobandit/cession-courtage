import "server-only";
import { DealStage, DocumentType, ListingStatus, type Prisma } from "@prisma/client";
import { createHash } from "node:crypto";
import { ESCROW_UPFRONT_SHARE } from "@/lib/deal/pipeline";
import {
  currentPrice,
  nextStage,
  normalizeStage,
  stageComplete,
  type ProcessSnapshot,
} from "@/lib/deal/process";
import {
  buildConfidentialityAgreement,
  buildLetterOfIntent,
  buildTransferDeed,
  missingPartyFields,
  type DocumentContext,
  type GeneratedDocument,
} from "@/lib/direct/documents";
import { loadDocumentParty } from "@/lib/direct/parties";
import { readTransferCarriers, type TransferCarrier } from "@/lib/direct/services";
import { DATA_ROOM_KINDS } from "@/lib/listing/company-doc-kinds";
import { listingLots, readCarriers } from "@/lib/listing/lot-availability";
import { fullyCommitted } from "@/lib/listing/lots";
import { holdEscrowFunds, releaseEscrowFunds, signDealDocument } from "@/lib/partners/runtime";
import { notifyDealStage } from "@/lib/position/events";
import { prisma } from "@/lib/prisma";
import { adjustedDeferredAmount } from "@/lib/retention/adjust";
import { putObject } from "@/lib/storage/objects";

/**
 * Lecture et avancement du dossier de cession, côté serveur.
 *
 * `lib/deal/process.ts` dit ce qu'exige chaque étape ; ce module rassemble
 * l'état réel du dossier pour le lui soumettre, et franchit l'étape quand tout
 * est fait. Personne n'appelle « étape suivante » : chaque action enregistre
 * son fait (une pièce, une signature), puis demande au dossier s'il peut
 * avancer.
 */

export const UPFRONT_PERCENT = Math.round(ESCROW_UPFRONT_SHARE * 100);

const DEAL_INCLUDE = {
  listing: {
    select: {
      id: true,
      publicNumber: true,
      status: true,
      portfolio: { select: { label: true } },
      deposits: { select: { buyerId: true, ndaAcceptedAt: true, placedAt: true } },
      companyDocuments: { select: { id: true, kind: true, fileName: true, createdAt: true }, orderBy: { createdAt: "asc" } },
    },
  },
  seller: { select: { kycStatus: true, kycReviewNote: true } },
  buyer: { select: { kycStatus: true, kycReviewNote: true } },
  signoffs: { orderBy: { createdAt: "asc" } },
  documents: { orderBy: { createdAt: "asc" } },
  retentionReports: { orderBy: { monthIndex: "asc" } },
} satisfies Prisma.DealInclude;

export type LoadedDeal = Prisma.DealGetPayload<{ include: typeof DEAL_INCLUDE }>;

export function dealReferenceFor(deal: { id: string; listing: { publicNumber: number } }): string {
  return `BP-${deal.listing.publicNumber}-${deal.id.slice(-6).toUpperCase()}`;
}

/** Compagnies cédées par le dossier, avec le code courtier saisi par le cédant. */
export async function dealCarriers(deal: {
  listingId: string;
  carriers: Prisma.JsonValue;
  transferCarriers: Prisma.JsonValue;
}): Promise<TransferCarrier[]> {
  const saisis = readTransferCarriers(deal.transferCarriers);
  // Une fois les codes saisis, la liste est fixée : inutile de relire les lots.
  if (saisis.length > 0) return saisis;
  let noms = readCarriers(deal.carriers);
  if (noms.length === 0) noms = (await listingLots(deal.listingId)).map((l) => l.carrier);
  return [...new Set(noms)].sort((a, b) => a.localeCompare(b, "fr")).map((name) => ({ name, code: "" }));
}

/** Empreinte d'une pièce générée : son contenu, sans les dates d'édition ni de signature. */
export function documentHash(doc: GeneratedDocument): string {
  const { signedAt: _s, ...contenu } = doc;
  return createHash("sha256").update(JSON.stringify(contenu)).digest("hex");
}

export async function loadDealProcess(dealId: string) {
  const deal = await prisma.deal.findUnique({ where: { id: dealId }, include: DEAL_INCLUDE });
  if (!deal) return null;

  // Un dossier resté sur une étape de l'ancien parcours rejoint celle qui la regroupe.
  const etape = normalizeStage(deal.stage);
  if (etape !== deal.stage) {
    await prisma.deal.updateMany({ where: { id: deal.id, stage: deal.stage }, data: { stage: etape } });
    deal.stage = etape;
  }

  const [sellerParty, buyerParty, carriers] = await Promise.all([
    loadDocumentParty(deal.sellerId),
    loadDocumentParty(deal.buyerId),
    dealCarriers(deal),
  ]);
  // Un dossier existe parce que le cédant a retenu l'offre : c'est la lettre
  // d'intention, et les identités s'ouvrent.
  const revealed = true;

  const revision =
    deal.loiProposedAt && deal.loiPrice !== null ? { proposedAt: deal.loiProposedAt, price: Number(deal.loiPrice) } : null;
  const prix = revision && etape === "DATA_ROOM" ? revision.price : Number(deal.agreedPrice);

  const context = (): DocumentContext => ({
    dealId: deal.id,
    reference: dealReferenceFor(deal),
    portfolioLabel: deal.listing.portfolio.label,
    salePrice: prix,
    upfrontPercent: UPFRONT_PERCENT,
    escrow: true,
    seller: sellerParty,
    buyer: buyerParty,
    carriers,
    effectiveDate: deal.loiEffectiveDate,
    deedSignedAt: null,
    issuedAt: new Date(),
    conditions: deal.loiConditions,
  });

  const deed = buildTransferDeed(context());
  const douzeMois = deal.retentionReports.find((r) => r.monthIndex === 12) ?? null;

  const snapshot: ProcessSnapshot = {
    stage: etape,
    sellerId: deal.sellerId,
    buyerId: deal.buyerId,
    signoffs: deal.signoffs.map((s) => ({ kind: s.kind, userId: s.userId, createdAt: s.createdAt, contentHash: s.contentHash })),
    roomDocs: deal.listing.companyDocuments.map((d) => ({ kind: d.kind, createdAt: d.createdAt })),
    roomKinds: DATA_ROOM_KINDS,
    verification: {
      seller: { status: deal.seller.kycStatus, missingIdentity: missingPartyFields(sellerParty), note: deal.seller.kycReviewNote },
      buyer: { status: deal.buyer.kycStatus, missingIdentity: missingPartyFields(buyerParty), note: deal.buyer.kycReviewNote },
    },
    agreedPrice: Number(deal.agreedPrice),
    revision,
    declined: deal.loiDeclinedAt ? { at: deal.loiDeclinedAt, reason: deal.loiDeclineReason } : null,
    carriers,
    deedHash: documentHash(deed),
    escrowStage: deal.escrowStage,
    retention: douzeMois ? { reportedAt: douzeMois.reportedAt, retentionRate: Number(douzeMois.retentionRate) } : null,
  };

  return { deal, snapshot, carriers, revealed, context, parties: { seller: sellerParty, buyer: buyerParty } };
}

export type DealProcess = NonNullable<Awaited<ReturnType<typeof loadDealProcess>>>;

async function archiveGenerated(dealId: string, doc: GeneratedDocument, type: DocumentType, uploadedById: string) {
  const contenu = new TextEncoder().encode(JSON.stringify(doc));
  const storageKey = `deals/${dealId}/generated/${doc.key}.json`;
  try {
    await putObject(storageKey, contenu);
  } catch (error) {
    // L'empreinte suffit à prouver le texte : la pièce se régénère à l'identique.
    console.error("archiveGenerated", error);
  }
  return prisma.document.create({
    data: {
      dealId,
      type,
      fileName: `${doc.key}.json`,
      storageKey,
      sha256: documentHash(doc),
      uploadedById,
      signedAt: new Date(),
      slot: `generated:${doc.key}`,
      contentType: "application/json",
      sizeBytes: contenu.byteLength,
    },
  });
}

/** Effets d'un passage d'étape, une fois l'étape verrouillée. */
async function onEnter(p: DealProcess, entered: DealStage) {
  const { deal } = p;
  switch (entered) {
    case "SIGNATURE": {
      // Le prix est figé : celui de l'offre, ou la révision acceptée.
      const prix = currentPrice(p.snapshot);
      const comptant = Math.round(prix * ESCROW_UPFRONT_SHARE * 100) / 100;
      await prisma.deal.update({
        where: { id: deal.id },
        data: {
          agreedPrice: prix.toFixed(2),
          upfrontAmount: comptant.toFixed(2),
          deferredAmount: (Math.round((prix - comptant) * 100) / 100).toFixed(2),
          loiPrice: prix.toFixed(2),
          ndaAcceptedAt: deal.ndaAcceptedAt ?? new Date(),
        },
      });
      const ctx = { ...p.context(), salePrice: prix };
      await archiveGenerated(deal.id, buildConfidentialityAgreement(ctx), DocumentType.NDA, deal.sellerId);
      await archiveGenerated(deal.id, buildLetterOfIntent(ctx), DocumentType.LOI, deal.buyerId);
      return;
    }
    case "TRANSFER": {
      const doc = await archiveGenerated(deal.id, buildTransferDeed(p.context()), DocumentType.DEED, deal.sellerId);
      await signDealDocument(doc.id);
      return;
    }
    case "CLOSED":
      await closeDeal(p);
      return;
    default:
      return;
  }
}

async function closeDeal(p: DealProcess) {
  const { deal } = p;
  const douzeMois = deal.retentionReports.find((r) => r.monthIndex === 12);
  if (douzeMois) {
    const ajuste = adjustedDeferredAmount({
      deferredAmount: Number(deal.deferredAmount),
      retentionRate: Number(douzeMois.retentionRate),
      targetRate: Number(deal.retentionTargetRate),
    });
    await prisma.deal.update({ where: { id: deal.id }, data: { adjustedDeferredAmount: ajuste.toFixed(2) } });
  }
  await releaseEscrowFunds(deal.id);

  /*
   * L'annonce n'est vendue que lorsque tous ses fournisseurs le sont. Clore
   * la reprise du seul lot AXA ne doit pas retirer du marché le Generali qui
   * attend encore preneur.
   */
  const lots = await listingLots(deal.listingId);
  const clos = await prisma.deal.findMany({
    where: { listingId: deal.listingId, stage: DealStage.CLOSED },
    select: { carriers: true },
  });
  const tous = lots.map((l) => l.carrier);
  const cedes = clos.map((d) => {
    const c = readCarriers(d.carriers);
    return c.length > 0 ? c : tous;
  });
  if (lots.length === 0 || fullyCommitted(lots, cedes)) {
    await prisma.listing.update({ where: { id: deal.listingId }, data: { status: ListingStatus.SOLD } });
  }

  // Le dépôt vient en déduction du prix, il n'est pas remboursé à part.
  await prisma.interestDeposit.updateMany({
    where: { listingId: deal.listingId, buyerId: deal.buyerId, outcome: "PENDING" },
    data: { outcome: "DEDUCTED", settledAt: new Date() },
  });
}

/**
 * Franchit les étapes dont toutes les tâches sont faites.
 *
 * Le passage est verrouillé par une mise à jour conditionnelle sur l'étape
 * courante : deux actions simultanées ne franchissent pas deux fois la même
 * étape, faute de transaction sur D1.
 */
export async function advanceDeal(dealId: string, actorId: string): Promise<DealStage | null> {
  const p = await loadDealProcess(dealId);
  if (!p || !stageComplete(p.snapshot)) return null;
  const suivante = nextStage(p.deal.stage);
  if (!suivante) return null;
  const verrou = await prisma.deal.updateMany({
    where: { id: dealId, stage: p.deal.stage },
    data: { stage: suivante },
  });
  if (verrou.count !== 1) return null;
  /*
   * Une seule étape à la fois : aucune étape ne peut être complète à son
   * ouverture, puisque chacune attend au moins un geste d'une partie. Relire le
   * dossier pour s'en assurer coûterait une quinzaine de requêtes par action.
   */
  await onEnter(p, suivante);
  await notifyDealStage(dealId, actorId, { notifyActor: true }).catch((e) => console.error("notifyDealStage", e));
  return suivante;
}

/**
 * Un fait extérieur au dossier peut compléter une étape : un compte vérifié par
 * la plateforme, une pièce déposée sur l'annonce. Les dossiers concernés sont
 * alors relus.
 */
export async function advanceDealsOf(where: { userId?: string; listingId?: string }, actorId: string) {
  const deals = await prisma.deal.findMany({
    where: {
      stage: { in: ["NDA", "LOI", "KYC", "DATA_ROOM"] },
      ...(where.listingId ? { listingId: where.listingId } : {}),
      ...(where.userId ? { OR: [{ sellerId: where.userId }, { buyerId: where.userId }] } : {}),
    },
    select: { id: true },
    take: 20,
  });
  for (const d of deals) await advanceDeal(d.id, actorId).catch((e) => console.error("advanceDeal", e));
}

/** Séquestre du comptant, déclenché par l'acquéreur. */
export async function fundEscrow(dealId: string) {
  await holdEscrowFunds(dealId);
}
