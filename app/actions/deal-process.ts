"use server";

import { DocumentType } from "@prisma/client";
import { revalidatePath } from "next/cache";
import { getActor, isOriasVerified } from "@/lib/authz/actor";
import { ForbiddenError, UnauthenticatedError } from "@/lib/authz/errors";
import { isDealParticipant } from "@/lib/authz/policies";
import {
  ACCEPTED_PIECE_TYPES,
  FUNDS_ORIGINS,
  MAX_PIECE_BYTES,
  SIGNOFF_LABELS,
  roomDocsDone,
  stageTasks,
  type Side,
  type SignoffKind,
} from "@/lib/deal/process";
import { advanceDeal, advanceDealsOf, fundEscrow, loadDealProcess, type DealProcess } from "@/lib/deal/process-load";
import { DATA_ROOM_KINDS, companyDocLabel } from "@/lib/listing/company-doc-kinds";
import { insertCompanyDoc } from "@/lib/listing/company-docs";
import { parseFrenchNumber } from "@/lib/import/values";
import { safeFileName, sha256Buffer } from "@/lib/import/persist";
import { ASKING_MAX, ASKING_MIN } from "@/lib/listing/constants";
import { notifyDealEvent } from "@/lib/position/events";
import { prisma } from "@/lib/prisma";
import { deleteObject, putObject, StorageUnavailableError } from "@/lib/storage/objects";

/**
 * Actions du dossier de cession.
 *
 * Chacune enregistre un fait — une pièce, une proposition, une validation, une
 * signature — puis laisse le dossier décider s'il franchit l'étape. Aucune ne
 * fait avancer le dossier par elle-même : c'est ce qui manquait aux anciens
 * boutons, qui passaient à l'étape suivante sans rien exiger.
 */

export type DealProcessState = { error?: string; ok?: string };

class ProcessError extends Error {}

async function context(formData: FormData) {
  const actor = await getActor();
  if (!actor) throw new UnauthenticatedError();
  if (!isOriasVerified(actor)) throw new ForbiddenError("ORIAS non validé.");
  const dealId = String(formData.get("dealId") ?? "");
  const p = await loadDealProcess(dealId);
  if (!p || !isDealParticipant(actor, p.deal)) throw new ForbiddenError("Ce dossier ne vous est pas accessible.");
  const side: Side = actor.id === p.deal.sellerId ? "seller" : "buyer";
  return { actor, p, side, dealId: p.deal.id };
}

function fail(error: unknown, fallback: string): DealProcessState {
  if (error instanceof UnauthenticatedError) return { error: "Connectez-vous pour continuer." };
  if (error instanceof ForbiddenError || error instanceof ProcessError || error instanceof StorageUnavailableError) {
    return { error: error.message };
  }
  console.error(fallback, error);
  return { error: fallback };
}

/** La tâche doit exister à l'étape courante, revenir à cette partie et être ouverte. */
function requireTask(p: DealProcess, side: Side, key: string) {
  const t = stageTasks(p.snapshot).find((x) => x.key === key);
  if (!t) throw new ProcessError("Cette action n’est pas à l’ordre du jour à cette étape du dossier.");
  if (t.owner !== side) throw new ProcessError("Cette action revient à l’autre partie.");
  if (!t.available) throw new ProcessError(t.waitingReason ?? "Cette action n’est pas encore possible.");
  return t;
}

async function recordSignoff(input: {
  dealId: string;
  userId: string;
  kind: SignoffKind;
  contentHash?: string | null;
  signatureName?: string | null;
  at?: Date;
}) {
  const data = {
    contentHash: input.contentHash ?? null,
    signatureName: input.signatureName ?? null,
    ipAddress: await clientIp(),
    createdAt: input.at ?? new Date(),
  };
  await prisma.dealSignoff.upsert({
    where: { dealId_kind_userId: { dealId: input.dealId, kind: input.kind, userId: input.userId } },
    update: data,
    create: { dealId: input.dealId, kind: input.kind, userId: input.userId, ...data },
  });
  await prisma.auditLog.create({
    data: { actorId: input.userId, action: `DEAL_${input.kind}`, entityType: "Deal", entityId: input.dealId, metadata: { contentHash: input.contentHash ?? null } },
  });
}

async function clientIp(): Promise<string | null> {
  try {
    const { headers } = await import("next/headers");
    const h = await headers();
    return h.get("cf-connecting-ip") ?? h.get("x-forwarded-for")?.split(",")[0]?.trim() ?? null;
  } catch {
    return null;
  }
}

async function afterFact(dealId: string, actorId: string, event?: { key: string; title: string; body: string }) {
  if (event) {
    await notifyDealEvent({ dealId, actorId, ...event }).catch((e) => console.error("notifyDealEvent", e));
  }
  await advanceDeal(dealId, actorId);
  revalidatePath(`/app/dossiers/${dealId}`);
  revalidatePath("/app");
}

const QUI: Record<Side, string> = { seller: "Le cédant", buyer: "L’acquéreur" };

function consent(formData: FormData) {
  if (formData.get("consent") !== "on") throw new ProcessError("Cochez la case pour confirmer.");
}

// ---------------------------------------------------------------------------
// Pièces
// ---------------------------------------------------------------------------

function contentTypeOf(file: File): string | null {
  const nom = file.name.toLowerCase();
  if ((ACCEPTED_PIECE_TYPES as readonly string[]).includes(file.type)) return file.type;
  if (nom.endsWith(".pdf")) return "application/pdf";
  if (nom.endsWith(".jpg") || nom.endsWith(".jpeg")) return "image/jpeg";
  if (nom.endsWith(".png")) return "image/png";
  return null;
}

async function readPiece(formData: FormData) {
  const file = formData.get("file");
  if (!(file instanceof File) || file.size === 0) throw new ProcessError("Choisissez un fichier.");
  if (file.size > MAX_PIECE_BYTES) throw new ProcessError("Fichier trop volumineux (10 Mo au maximum).");
  const type = contentTypeOf(file);
  if (!type) throw new ProcessError("Formats acceptés : PDF, JPG ou PNG.");
  return { bytes: new Uint8Array(await file.arrayBuffer()), nom: safeFileName(file.name), type };
}

/**
 * Pièce du cabinet cédant, déposée depuis le dossier.
 *
 * Elle rejoint les pièces de l'annonce : c'est la même salle de données pour
 * tout acquéreur qui prendra ce portefeuille, et le cédant ne la dépose qu'une fois.
 */
export async function uploadRoomDocumentAction(_prev: DealProcessState, formData: FormData): Promise<DealProcessState> {
  try {
    const { actor, p, side, dealId } = await context(formData);
    if (side !== "seller") throw new ProcessError("Les pièces du cabinet sont déposées par le cédant.");
    if (p.deal.stage === "CLOSED") throw new ProcessError("La cession est close.");
    const kind = String(formData.get("kind") ?? "");
    if (!(DATA_ROOM_KINDS as readonly string[]).includes(kind)) throw new ProcessError("Type de pièce inconnu.");
    const { bytes, nom } = await readPiece(formData);
    const id = crypto.randomUUID();
    const storageKey = `cabinet/${actor.id}/${p.deal.listingId}/${id}/${nom}`;
    await putObject(storageKey, bytes);
    await insertCompanyDoc({
      id,
      listingId: p.deal.listingId,
      kind: kind as (typeof DATA_ROOM_KINDS)[number],
      fileName: nom,
      storageKey,
      sha256: sha256Buffer(bytes),
      uploadedById: actor.id,
    });
    const avant = roomDocsDone(p.snapshot);
    const complet = avant.missing.length === 1 && avant.missing[0] === kind;
    await notifyDealEvent({
      dealId,
      actorId: actor.id,
      key: `room:${new Date().toISOString().slice(0, 13)}`,
      title: complet ? "Pièces du cabinet complètes" : "Nouvelle pièce du cabinet",
      body: complet
        ? "Toutes les pièces du cabinet sont déposées : examinez-les et confirmez votre prix."
        : `Le cédant a déposé « ${companyDocLabel(kind)} ».`,
    }).catch((e) => console.error("notifyDealEvent", e));
    await advanceDealsOf({ listingId: p.deal.listingId }, actor.id);
    revalidatePath(`/app/dossiers/${dealId}`);
    return { ok: "Pièce déposée." };
  } catch (error) {
    return fail(error, "Dépôt impossible pour le moment.");
  }
}

/** Pièce complémentaire, demandée par l'acquéreur en plus de celles du cabinet. */
export async function uploadDealPieceAction(_prev: DealProcessState, formData: FormData): Promise<DealProcessState> {
  try {
    const { actor, p, dealId } = await context(formData);
    if (p.deal.stage === "CLOSED") throw new ProcessError("La cession est close.");
    const { bytes, nom, type } = await readPiece(formData);
    const storageKey = `deals/${dealId}/pieces/${crypto.randomUUID()}-${nom}`;
    await putObject(storageKey, bytes);
    await prisma.document.create({
      data: {
        dealId,
        type: DocumentType.OTHER,
        fileName: nom,
        storageKey,
        sha256: sha256Buffer(bytes),
        uploadedById: actor.id,
        slot: "other",
        contentType: type,
        sizeBytes: bytes.byteLength,
      },
    });
    await notifyDealEvent({
      dealId,
      actorId: actor.id,
      key: `piece:${new Date().toISOString().slice(0, 13)}`,
      title: "Nouvelle pièce dans le dossier",
      body: `« ${nom} » a été ajoutée au dossier.`,
    }).catch((e) => console.error("notifyDealEvent", e));
    revalidatePath(`/app/dossiers/${dealId}`);
    return { ok: "Pièce déposée." };
  } catch (error) {
    return fail(error, "Dépôt impossible pour le moment.");
  }
}

export async function removeDealPieceAction(_prev: DealProcessState, formData: FormData): Promise<DealProcessState> {
  try {
    const { actor, p, dealId } = await context(formData);
    const documentId = String(formData.get("documentId") ?? "");
    const doc = p.deal.documents.find((d) => d.id === documentId);
    if (!doc || doc.slot !== "other") throw new ProcessError("Pièce introuvable.");
    if (doc.uploadedById !== actor.id) throw new ProcessError("Seul l’auteur du dépôt peut retirer une pièce.");
    if (p.deal.stage === "CLOSED") throw new ProcessError("La cession est close : les pièces ne se retirent plus.");
    await prisma.document.delete({ where: { id: doc.id } });
    await deleteObject(doc.storageKey).catch(() => undefined);
    revalidatePath(`/app/dossiers/${dealId}`);
    return { ok: "Pièce retirée." };
  } catch (error) {
    return fail(error, "Retrait impossible pour le moment.");
  }
}

// ---------------------------------------------------------------------------
// Vérifications
// ---------------------------------------------------------------------------

export async function saveDealCarrierCodesAction(_prev: DealProcessState, formData: FormData): Promise<DealProcessState> {
  try {
    const { actor, p, side, dealId } = await context(formData);
    if (p.deal.stage !== "DATA_ROOM") throw new ProcessError("Les codes courtier se renseignent pendant les vérifications.");
    if (side !== "seller") throw new ProcessError("Les codes courtier sont ceux du cédant.");
    const codes = p.carriers.map((c, i) => {
      const code = String(formData.get(`code_${i}`) ?? "").trim().slice(0, 40);
      if (code && !/^[A-Za-z0-9 ._/-]+$/.test(code)) {
        throw new ProcessError(`Code courtier invalide pour ${c.name}.`);
      }
      return { name: c.name, code };
    });
    await prisma.deal.update({ where: { id: dealId }, data: { transferCarriers: codes } });
    await afterFact(dealId, actor.id);
    return { ok: "Codes enregistrés." };
  } catch (error) {
    return fail(error, "Enregistrement impossible pour le moment.");
  }
}

export async function confirmPriceAction(_prev: DealProcessState, formData: FormData): Promise<DealProcessState> {
  try {
    const { actor, p, side, dealId } = await context(formData);
    requireTask(p, side, "price-confirm");
    consent(formData);
    await recordSignoff({ dealId, userId: actor.id, kind: "PRICE_CONFIRMED" });
    await afterFact(dealId, actor.id, {
      key: `price-confirmed:${Date.now()}`,
      title: "Prix confirmé",
      body: "L’acquéreur a examiné les pièces et confirme son prix.",
    });
    return { ok: "Prix confirmé." };
  } catch (error) {
    return fail(error, "Confirmation impossible pour le moment.");
  }
}

export async function signDeedAction(_prev: DealProcessState, formData: FormData): Promise<DealProcessState> {
  try {
    const { actor, p, side, dealId } = await context(formData);
    requireTask(p, side, `sign-${side}`);
    consent(formData);
    const nom = String(formData.get("signatureName") ?? "").trim().replace(/\s+/g, " ");
    if (nom.length < 3 || nom.length > 120) throw new ProcessError("Écrivez le nom et le prénom du signataire.");
    const representant = p.parties[side].representative?.trim().toLowerCase();
    if (representant && nom.toLowerCase() !== representant) {
      throw new ProcessError(`Le protocole est signé par le représentant indiqué au dossier : ${p.parties[side].representative}.`);
    }
    await recordSignoff({ dealId, userId: actor.id, kind: "DEED_SIGNED", contentHash: p.snapshot.deedHash, signatureName: nom });
    await afterFact(dealId, actor.id, {
      key: `deed-signed:${side}:${p.snapshot.deedHash}`,
      title: "Protocole signé",
      body: `${QUI[side]} ${SIGNOFF_LABELS.DEED_SIGNED}.`,
    });
    return { ok: "Protocole signé." };
  } catch (error) {
    return fail(error, "Signature impossible pour le moment.");
  }
}

// ---------------------------------------------------------------------------
// Paiement et transfert, solde
// ---------------------------------------------------------------------------

export async function fundEscrowAction(_prev: DealProcessState, formData: FormData): Promise<DealProcessState> {
  try {
    const { actor, p, side, dealId } = await context(formData);
    const t = requireTask(p, side, "escrow-fund");
    if (t.done) throw new ProcessError("Le comptant est déjà séquestré.");
    const origine = String(formData.get("fundsOrigin") ?? "");
    if (!FUNDS_ORIGINS.some((o) => o.value === origine)) {
      throw new ProcessError("Indiquez l’origine des fonds : c’est une obligation de vigilance.");
    }
    consent(formData);
    await prisma.deal.update({ where: { id: dealId }, data: { fundsOrigin: origine } });
    await fundEscrow(dealId);
    await prisma.auditLog.create({
      data: { actorId: actor.id, action: "DEAL_ESCROW_FUNDED", entityType: "Deal", entityId: dealId, metadata: { amount: String(p.deal.upfrontAmount), fundsOrigin: origine } },
    });
    await afterFact(dealId, actor.id, {
      key: "escrow-funded",
      title: "Prix versé sur le compte sécurisé",
      body: "Le prix est sur le compte sécurisé. Envoyez les attestations signées aux compagnies.",
    });
    return { ok: "Prix versé sur le compte sécurisé." };
  } catch (error) {
    return fail(error, "Versement impossible pour le moment.");
  }
}

export async function sendAttestationsAction(_prev: DealProcessState, formData: FormData): Promise<DealProcessState> {
  try {
    const { actor, p, side, dealId } = await context(formData);
    requireTask(p, side, "attestations-sent");
    consent(formData);
    await recordSignoff({ dealId, userId: actor.id, kind: "ATTESTATIONS_SENT" });
    await afterFact(dealId, actor.id, {
      key: "attestations-sent",
      title: "Attestations envoyées aux compagnies",
      body: `Le cédant a adressé les ${p.carriers.length} attestations. Confirmez dès que les contrats sont rattachés à votre code.`,
    });
    return { ok: "Envoi enregistré." };
  } catch (error) {
    return fail(error, "Enregistrement impossible pour le moment.");
  }
}

export async function confirmCarrierTransferAction(_prev: DealProcessState, formData: FormData): Promise<DealProcessState> {
  try {
    const { actor, p, side, dealId } = await context(formData);
    requireTask(p, side, "transfer-confirm");
    consent(formData);
    await recordSignoff({ dealId, userId: actor.id, kind: "TRANSFER_CONFIRMED" });
    await afterFact(dealId, actor.id, {
      key: "transfer-confirmed",
      title: "Contrats rattachés",
      body: "L’acquéreur confirme le rattachement des contrats. La période de conservation commence.",
    });
    return { ok: "Transfert confirmé." };
  } catch (error) {
    return fail(error, "Confirmation impossible pour le moment.");
  }
}
