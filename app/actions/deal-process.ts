"use server";

import { DocumentType } from "@prisma/client";
import { revalidatePath } from "next/cache";
import { getActor, isOriasVerified } from "@/lib/authz/actor";
import { ForbiddenError, UnauthenticatedError } from "@/lib/authz/errors";
import { isDealParticipant } from "@/lib/authz/policies";
import { offPlatformPhoneError } from "@/lib/chat/phone-block";
import {
  ACCEPTED_PIECE_TYPES,
  MAX_PIECE_BYTES,
  SIGNOFF_LABELS,
  slotRule,
  stageTasks,
  type Side,
  type SignoffKind,
} from "@/lib/deal/process";
import { advanceDeal, fundEscrow, loadDealProcess, type DealProcess } from "@/lib/deal/process-load";
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
}) {
  const data = {
    contentHash: input.contentHash ?? null,
    signatureName: input.signatureName ?? null,
    ipAddress: await clientIp(),
    createdAt: new Date(),
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
// Confidentialité
// ---------------------------------------------------------------------------

export async function signNdaAction(_prev: DealProcessState, formData: FormData): Promise<DealProcessState> {
  try {
    const { actor, p, side, dealId } = await context(formData);
    requireTask(p, side, `nda-${side}`);
    consent(formData);
    await recordSignoff({ dealId, userId: actor.id, kind: "NDA_SIGNED" });
    await afterFact(dealId, actor.id, {
      key: `nda:${side}`,
      title: "Accord de confidentialité signé",
      body: `${QUI[side]} ${SIGNOFF_LABELS.NDA_SIGNED}. À vous de signer pour ouvrir la salle de données.`,
    });
    return { ok: "Accord signé." };
  } catch (error) {
    return fail(error, "Signature impossible pour le moment.");
  }
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

function slotTitle(p: DealProcess, slot: string): string {
  const dd = /^dd:(.+)$/.exec(slot);
  if (dd) return p.deal.dueDiligence.find((i) => i.id === dd[1])?.label ?? "Pièce du bordereau";
  if (slot.startsWith("kyc:")) return "Pièce d’identification";
  if (slot.startsWith("transfer:")) return "Attestation de transfert";
  return "Pièce complémentaire";
}

export async function uploadDealPieceAction(_prev: DealProcessState, formData: FormData): Promise<DealProcessState> {
  try {
    const { actor, p, side, dealId } = await context(formData);
    const slot = String(formData.get("slot") ?? "");
    const rule = slotRule(slot, {
      dueDiligenceIds: p.deal.dueDiligence.map((i) => i.id),
      carriers: p.carriers.map((c) => c.name),
    });
    if (!rule) throw new ProcessError("Emplacement de pièce inconnu.");
    if (rule.owner !== side) throw new ProcessError("Cette pièce est déposée par l’autre partie.");
    if (!rule.stages.includes(p.deal.stage)) throw new ProcessError("Ce dépôt n’est pas ouvert à cette étape du dossier.");

    const file = formData.get("file");
    if (!(file instanceof File) || file.size === 0) throw new ProcessError("Choisissez un fichier.");
    if (file.size > MAX_PIECE_BYTES) throw new ProcessError("Fichier trop volumineux (10 Mo au maximum).");
    const type = contentTypeOf(file);
    if (!type) throw new ProcessError("Formats acceptés : PDF, JPG ou PNG.");

    const bytes = new Uint8Array(await file.arrayBuffer());
    const nom = safeFileName(file.name);
    const storageKey = `deals/${dealId}/pieces/${crypto.randomUUID()}-${nom}`;
    await putObject(storageKey, bytes);

    // Une pièce en remplace une autre sur le même emplacement, sauf les pièces libres.
    const anciennes = slot === "other" ? [] : p.deal.documents.filter((d) => d.slot === slot);
    await prisma.document.create({
      data: {
        dealId,
        type: slot.startsWith("transfer:") ? DocumentType.TRANSFER_CERTIFICATE : DocumentType.OTHER,
        fileName: nom,
        storageKey,
        sha256: sha256Buffer(bytes),
        uploadedById: actor.id,
        slot,
        contentType: type,
        sizeBytes: bytes.byteLength,
      },
    });
    for (const ancienne of anciennes) {
      await prisma.document.delete({ where: { id: ancienne.id } });
      await deleteObject(ancienne.storageKey).catch(() => undefined);
    }
    const dd = /^dd:(.+)$/.exec(slot);
    if (dd) {
      await prisma.dueDiligenceItem.update({ where: { id: dd[1]! }, data: { providedAt: new Date() } });
    }

    const heure = new Date().toISOString().slice(0, 13);
    await afterFact(dealId, actor.id, {
      key: `piece:${slot.split(":")[0]}:${heure}`,
      title: "Nouvelles pièces déposées",
      body: `${QUI[side]} a déposé « ${slotTitle(p, slot)} »${anciennes.length ? " (version remplacée)" : ""}. Elles sont consultables dans le dossier.`,
    });
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
    if (!doc || !doc.slot || doc.slot.startsWith("generated:")) throw new ProcessError("Pièce introuvable.");
    if (doc.uploadedById !== actor.id) throw new ProcessError("Seul l’auteur du dépôt peut retirer une pièce.");
    const rule = slotRule(doc.slot, {
      dueDiligenceIds: p.deal.dueDiligence.map((i) => i.id),
      carriers: p.carriers.map((c) => c.name),
    });
    if (!rule || !rule.stages.includes(p.deal.stage)) {
      throw new ProcessError("Cette pièce fait partie d’une étape franchie : elle ne se retire plus.");
    }
    await prisma.document.delete({ where: { id: doc.id } });
    await deleteObject(doc.storageKey).catch(() => undefined);
    const dd = /^dd:(.+)$/.exec(doc.slot);
    if (dd && !p.deal.documents.some((d) => d.slot === doc.slot && d.id !== doc.id)) {
      await prisma.dueDiligenceItem.update({ where: { id: dd[1]! }, data: { providedAt: null } });
    }
    revalidatePath(`/app/dossiers/${dealId}`);
    return { ok: "Pièce retirée." };
  } catch (error) {
    return fail(error, "Retrait impossible pour le moment.");
  }
}

// ---------------------------------------------------------------------------
// Salle de données
// ---------------------------------------------------------------------------

export async function reviewDataRoomAction(_prev: DealProcessState, formData: FormData): Promise<DealProcessState> {
  try {
    const { actor, p, side, dealId } = await context(formData);
    requireTask(p, side, "dd-review");
    consent(formData);
    await recordSignoff({ dealId, userId: actor.id, kind: "DATA_ROOM_REVIEWED" });
    await afterFact(dealId, actor.id, {
      key: `dd-review:${Date.now()}`,
      title: "Salle de données validée",
      body: "L’acquéreur a examiné les pièces. Il prépare sa lettre d’intention.",
    });
    return { ok: "Examen validé." };
  } catch (error) {
    return fail(error, "Validation impossible pour le moment.");
  }
}

// ---------------------------------------------------------------------------
// Lettre d'intention
// ---------------------------------------------------------------------------

export async function proposeLoiAction(_prev: DealProcessState, formData: FormData): Promise<DealProcessState> {
  try {
    const { actor, p, side, dealId } = await context(formData);
    if (p.deal.stage !== "LOI") throw new ProcessError("La lettre d’intention n’est pas à cette étape du dossier.");
    if (side !== "buyer") throw new ProcessError("La lettre d’intention est proposée par l’acquéreur.");
    if (p.snapshot.signoffs.some((s) => s.kind === "LOI_ACCEPTED" && p.deal.loiProposedAt && s.createdAt >= p.deal.loiProposedAt)) {
      throw new ProcessError("La lettre d’intention est déjà acceptée.");
    }

    const prix = parseFrenchNumber(String(formData.get("price") ?? ""));
    if (prix === null || !Number.isFinite(prix) || prix < ASKING_MIN || prix > ASKING_MAX) {
      throw new ProcessError(`Indiquez un prix entre ${ASKING_MIN.toLocaleString("fr-FR")} et ${ASKING_MAX.toLocaleString("fr-FR")} €.`);
    }
    const dateBrute = String(formData.get("effectiveDate") ?? "");
    const date = /^\d{4}-\d{2}-\d{2}$/.test(dateBrute) ? new Date(`${dateBrute}T00:00:00.000Z`) : null;
    const aujourdhui = new Date(new Date().toISOString().slice(0, 10) + "T00:00:00.000Z");
    if (!date || Number.isNaN(date.getTime()) || date < aujourdhui) {
      throw new ProcessError("Indiquez une date d’effet à venir.");
    }
    const conditions = String(formData.get("conditions") ?? "").trim().slice(0, 1500);
    const telephone = conditions ? offPlatformPhoneError(conditions) : null;
    if (telephone) throw new ProcessError(telephone);

    await prisma.deal.update({
      where: { id: dealId },
      data: {
        loiPrice: prix.toFixed(2),
        loiEffectiveDate: date,
        loiConditions: conditions || null,
        loiProposedAt: new Date(),
        loiDeclinedAt: null,
        loiDeclineReason: null,
      },
    });
    await afterFact(dealId, actor.id, {
      key: `loi-proposed:${Date.now()}`,
      title: "Lettre d’intention reçue",
      body: `L’acquéreur propose ${prix.toLocaleString("fr-FR")} € avec un transfert au ${date.toLocaleDateString("fr-FR", { timeZone: "UTC" })}. Acceptez-la ou refusez-la avec un motif.`,
    });
    return { ok: "Lettre d’intention envoyée au cédant." };
  } catch (error) {
    return fail(error, "Envoi impossible pour le moment.");
  }
}

export async function answerLoiAction(_prev: DealProcessState, formData: FormData): Promise<DealProcessState> {
  try {
    const { actor, p, side, dealId } = await context(formData);
    requireTask(p, side, "loi-accept");
    const decision = String(formData.get("decision") ?? "");
    if (decision === "decline") {
      const motif = String(formData.get("reason") ?? "").trim().slice(0, 500);
      if (motif.length < 5) throw new ProcessError("Indiquez le motif du refus : l’acquéreur pourra ajuster sa proposition.");
      const telephone = offPlatformPhoneError(motif);
      if (telephone) throw new ProcessError(telephone);
      await prisma.deal.update({
        where: { id: dealId },
        data: { loiProposedAt: null, loiDeclinedAt: new Date(), loiDeclineReason: motif },
      });
      await afterFact(dealId, actor.id, {
        key: `loi-declined:${Date.now()}`,
        title: "Lettre d’intention refusée",
        body: `Le cédant a refusé votre proposition : « ${motif} ». Vous pouvez en envoyer une nouvelle.`,
      });
      return { ok: "Refus envoyé à l’acquéreur." };
    }
    if (decision !== "accept") throw new ProcessError("Choisissez d’accepter ou de refuser.");
    consent(formData);
    await recordSignoff({ dealId, userId: actor.id, kind: "LOI_ACCEPTED" });
    await afterFact(dealId, actor.id, {
      key: `loi-accepted:${Date.now()}`,
      title: "Lettre d’intention acceptée",
      body: "Le cédant a accepté votre lettre d’intention. Le prix est figé ; déposez vos pièces d’identification.",
    });
    return { ok: "Lettre d’intention acceptée." };
  } catch (error) {
    return fail(error, "Réponse impossible pour le moment.");
  }
}

// ---------------------------------------------------------------------------
// Conformité
// ---------------------------------------------------------------------------

export async function reviewKycAction(_prev: DealProcessState, formData: FormData): Promise<DealProcessState> {
  try {
    const { actor, p, side, dealId } = await context(formData);
    const controle: Side = side === "seller" ? "buyer" : "seller";
    requireTask(p, side, `kyc-review-${controle}`);
    consent(formData);
    await recordSignoff({ dealId, userId: actor.id, kind: "KYC_REVIEWED" });
    await afterFact(dealId, actor.id, {
      key: `kyc-review:${side}:${Date.now()}`,
      title: "Pièces d’identification contrôlées",
      body: `${QUI[side]} a contrôlé vos pièces d’identification.`,
    });
    return { ok: "Contrôle enregistré." };
  } catch (error) {
    return fail(error, "Contrôle impossible pour le moment.");
  }
}

// ---------------------------------------------------------------------------
// Protocole
// ---------------------------------------------------------------------------

export async function saveDealCarrierCodesAction(_prev: DealProcessState, formData: FormData): Promise<DealProcessState> {
  try {
    const { actor, p, side, dealId } = await context(formData);
    if (p.deal.stage !== "DEED") throw new ProcessError("Les codes courtier se renseignent pendant la rédaction du protocole.");
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

export async function approveDeedAction(_prev: DealProcessState, formData: FormData): Promise<DealProcessState> {
  try {
    const { actor, p, side, dealId } = await context(formData);
    requireTask(p, side, `deed-approve-${side}`);
    consent(formData);
    await recordSignoff({ dealId, userId: actor.id, kind: "DEED_APPROVED", contentHash: p.snapshot.deedHash });
    await afterFact(dealId, actor.id, {
      key: `deed-approved:${side}:${p.snapshot.deedHash}`,
      title: "Protocole approuvé",
      body: `${QUI[side]} ${SIGNOFF_LABELS.DEED_APPROVED}. Relisez-le et approuvez-le à votre tour.`,
    });
    return { ok: "Protocole approuvé." };
  } catch (error) {
    return fail(error, "Approbation impossible pour le moment.");
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
// Séquestre, transfert, conservation
// ---------------------------------------------------------------------------

export async function fundEscrowAction(_prev: DealProcessState, formData: FormData): Promise<DealProcessState> {
  try {
    const { actor, p, side, dealId } = await context(formData);
    const t = requireTask(p, side, "escrow-fund");
    if (t.done) throw new ProcessError("Le comptant est déjà séquestré.");
    consent(formData);
    await fundEscrow(dealId);
    await prisma.auditLog.create({
      data: { actorId: actor.id, action: "DEAL_ESCROW_FUNDED", entityType: "Deal", entityId: dealId, metadata: { amount: String(p.deal.upfrontAmount) } },
    });
    await afterFact(dealId, actor.id, {
      key: "escrow-funded",
      title: "Comptant séquestré",
      body: "Le comptant est bloqué sur le compte séquestre. Adressez les attestations de transfert aux compagnies.",
    });
    return { ok: "Comptant séquestré." };
  } catch (error) {
    return fail(error, "Séquestre impossible pour le moment.");
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
      body: "L’acquéreur confirme que les compagnies ont rattaché les contrats à son code. La période de conservation commence.",
    });
    return { ok: "Transfert confirmé." };
  } catch (error) {
    return fail(error, "Confirmation impossible pour le moment.");
  }
}

export async function acceptRetentionAction(_prev: DealProcessState, formData: FormData): Promise<DealProcessState> {
  try {
    const { actor, p, side, dealId } = await context(formData);
    requireTask(p, side, "retention-accept");
    consent(formData);
    await recordSignoff({ dealId, userId: actor.id, kind: "RETENTION_ACCEPTED" });
    await afterFact(dealId, actor.id);
    return { ok: "Déclaration validée." };
  } catch (error) {
    return fail(error, "Validation impossible pour le moment.");
  }
}
