import "server-only";
import { DealStage, DocumentType, ListingStatus, type Prisma } from "@prisma/client";
import { createHash } from "node:crypto";
import { identitiesRevealedFor } from "@/lib/authz/policies";
import { ESCROW_UPFRONT_SHARE } from "@/lib/deal/pipeline";
import {
  nextStage,
  stageComplete,
  type ProcessSnapshot,
} from "@/lib/deal/process";
import { ensureDealChecklist } from "@/lib/deal/seed-checklist";
import {
  buildConfidentialityAgreement,
  buildLetterOfIntent,
  buildTransferDeed,
  missingPartyFields,
  type DocumentContext,
  type DocumentParty,
  type GeneratedDocument,
} from "@/lib/direct/documents";
import { loadDocumentParty } from "@/lib/direct/parties";
import { readTransferCarriers, type TransferCarrier } from "@/lib/direct/services";
import { listingLots, readCarriers } from "@/lib/listing/lot-availability";
import { fullyCommitted } from "@/lib/listing/lots";
import { holdEscrowFunds, releaseEscrowFunds, signDealDocument, verifyPartyIdentity } from "@/lib/partners/runtime";
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
      deposits: { select: { buyerId: true } },
    },
  },
  signoffs: { orderBy: { createdAt: "asc" } },
  documents: { orderBy: { createdAt: "asc" } },
  dueDiligence: { orderBy: [{ category: "asc" }, { label: "asc" }] },
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
  const codes = new Map(saisis.map((c) => [c.name, c.code]));
  return [...new Set(noms)].sort((a, b) => a.localeCompare(b, "fr")).map((name) => ({ name, code: codes.get(name) ?? "" }));
}

function masked(alias: string): DocumentParty {
  const plusTard = "communiqué à la levée de l’anonymat";
  return {
    legalName: alias,
    legalForm: null,
    siren: plusTard,
    address: plusTard,
    postalCode: null,
    city: null,
    oriasNumber: plusTard,
    representative: plusTard,
    jobTitle: null,
    email: null,
  };
}

/** Empreinte d'une pièce générée : son contenu, sans les dates d'édition ni de signature. */
export function documentHash(doc: GeneratedDocument): string {
  const { signedAt: _s, ...contenu } = doc;
  return createHash("sha256").update(JSON.stringify(contenu)).digest("hex");
}

export async function loadDealProcess(dealId: string) {
  let deal = await prisma.deal.findUnique({ where: { id: dealId }, include: DEAL_INCLUDE });
  if (!deal) return null;
  if (deal.dueDiligence.length === 0) {
    // Dossier ouvert avant le bordereau : on le crée une fois, puis on relit.
    await ensureDealChecklist(dealId);
    deal = await prisma.deal.findUniqueOrThrow({ where: { id: dealId }, include: DEAL_INCLUDE });
  }

  const [sellerParty, buyerParty, carriers] = await Promise.all([
    loadDocumentParty(deal.sellerId),
    loadDocumentParty(deal.buyerId),
    dealCarriers(deal),
  ]);
  const hasDeposit = deal.listing.deposits.some((d) => d.buyerId === deal.buyerId);
  const revealed = identitiesRevealedFor({ stage: deal.stage, hasDeposit });

  const loiAccepted = deal.stage !== "NDA" && deal.stage !== "DATA_ROOM" && deal.stage !== "LOI";
  const context = (viewerId: string | null): DocumentContext => {
    const cacher = !revealed && viewerId !== null;
    return {
      dealId: deal.id,
      reference: dealReferenceFor(deal),
      portfolioLabel: deal.listing.portfolio.label,
      salePrice: loiAccepted ? Number(deal.agreedPrice) : Number(deal.loiPrice ?? deal.agreedPrice),
      upfrontPercent: UPFRONT_PERCENT,
      escrow: true,
      seller: cacher && viewerId !== deal.sellerId ? masked(deal.sellerAlias) : sellerParty,
      buyer: cacher && viewerId !== deal.buyerId ? masked(deal.buyerAlias) : buyerParty,
      carriers,
      effectiveDate: deal.loiEffectiveDate,
      deedSignedAt: null,
      issuedAt: new Date(),
      conditions: deal.loiConditions,
    };
  };

  const deed = buildTransferDeed(context(null));
  const douzeMois = deal.retentionReports.find((r) => r.monthIndex === 12) ?? null;

  const snapshot: ProcessSnapshot = {
    stage: deal.stage,
    sellerId: deal.sellerId,
    buyerId: deal.buyerId,
    signoffs: deal.signoffs.map((s) => ({ kind: s.kind, userId: s.userId, createdAt: s.createdAt, contentHash: s.contentHash })),
    pieces: deal.documents.map((d) => ({ slot: d.slot, uploadedById: d.uploadedById, createdAt: d.createdAt })),
    checklist: deal.dueDiligence.map((i) => ({ id: i.id, label: i.label, required: i.required, providedAt: i.providedAt })),
    loi: {
      proposedAt: deal.loiProposedAt,
      declinedAt: deal.loiDeclinedAt,
      declineReason: deal.loiDeclineReason,
      price: deal.loiPrice === null ? null : Number(deal.loiPrice),
      effectiveDate: deal.loiEffectiveDate,
    },
    missingIdentity: { seller: missingPartyFields(sellerParty), buyer: missingPartyFields(buyerParty) },
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
    case "DATA_ROOM":
      await prisma.deal.update({ where: { id: deal.id }, data: { ndaAcceptedAt: new Date() } });
      await archiveGenerated(deal.id, buildConfidentialityAgreement(p.context(null)), DocumentType.NDA, deal.sellerId);
      return;
    case "KYC": {
      const prix = Number(deal.loiPrice ?? deal.agreedPrice);
      const comptant = Math.round(prix * ESCROW_UPFRONT_SHARE * 100) / 100;
      await prisma.deal.update({
        where: { id: deal.id },
        data: {
          agreedPrice: prix.toFixed(2),
          upfrontAmount: comptant.toFixed(2),
          deferredAmount: (Math.round((prix - comptant) * 100) / 100).toFixed(2),
        },
      });
      await archiveGenerated(
        deal.id,
        buildLetterOfIntent({ ...p.context(null), salePrice: prix }),
        DocumentType.LOI,
        deal.buyerId,
      );
      await prisma.auditLog.create({
        data: { actorId: deal.sellerId, action: "IDENTIFYING_DATA_VIEW", entityType: "Deal", entityId: deal.id, metadata: { reason: "loi_accepted" } },
      });
      return;
    }
    case "DEED":
      await verifyPartyIdentity(deal.sellerId);
      await verifyPartyIdentity(deal.buyerId);
      return;
    case "ESCROW": {
      const doc = await archiveGenerated(deal.id, buildTransferDeed(p.context(null)), DocumentType.DEED, deal.sellerId);
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

/** Séquestre du comptant, déclenché par l'acquéreur. */
export async function fundEscrow(dealId: string) {
  await holdEscrowFunds(dealId);
}
