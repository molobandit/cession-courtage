"use server";

import { DealStage, DocumentType } from "@prisma/client";
import { createHash } from "node:crypto";
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { revalidatePath } from "next/cache";
import { canBuy, getActor, isOriasVerified } from "@/lib/authz/actor";
import { DEAL_STAGE_ORDER } from "@/lib/labels";
import { isDealParticipant, isStageAtLeast, ownsFirm } from "@/lib/authz/policies";
import { ForbiddenError, UnauthenticatedError } from "@/lib/authz/errors";
import { mockEscrowHold, mockEscrowRelease, mockSignDocument, mockVerifyKyc } from "@/lib/integrations/mocks";
import { prisma } from "@/lib/prisma";

export type DealFormState = { error?: string };

async function actorOrThrow() {
  const actor = await getActor();
  if (!actor) throw new UnauthenticatedError();
  if (!isOriasVerified(actor)) throw new ForbiddenError("ORIAS non validé.");
  return actor;
}

async function loadDeal(dealId: string) {
  const actor = await actorOrThrow();
  const deal = await prisma.deal.findUnique({ where: { id: dealId } });
  if (!deal || !isDealParticipant(actor, deal)) throw new ForbiddenError("Dossier inaccessible.");
  return { actor, deal };
}

function nextStage(current: DealStage): DealStage | null {
  const i = DEAL_STAGE_ORDER.indexOf(current);
  if (i < 0 || i >= DEAL_STAGE_ORDER.length - 1) return null;
  return DEAL_STAGE_ORDER[i + 1]!;
}

export async function acceptNdaAction(_prev: DealFormState, formData: FormData): Promise<DealFormState> {
  try {
    const { deal } = await loadDeal(String(formData.get("dealId") ?? ""));
    if (deal.stage !== DealStage.NDA) return { error: "L'accord de confidentialité n'est plus à cette étape." };
    await prisma.deal.update({
      where: { id: deal.id },
      data: { ndaAcceptedAt: new Date(), stage: DealStage.DATA_ROOM },
    });
    await prisma.document.create({
      data: {
        dealId: deal.id,
        type: DocumentType.NDA,
        fileName: "accord-confidentialite-mock.pdf",
        storageKey: `deals/${deal.id}/nda-mock.pdf`,
        sha256: createHash("sha256").update(`nda:${deal.id}`).digest("hex"),
        uploadedById: deal.sellerId,
        signedAt: new Date(),
      },
    });
    revalidatePath(`/app/dossiers/${deal.id}`);
    return {};
  } catch (error) {
    return { error: error instanceof Error ? error.message : "Signature impossible." };
  }
}

export async function uploadDataRoomFileAction(
  _prev: DealFormState,
  formData: FormData,
): Promise<DealFormState> {
  try {
    const { actor, deal } = await loadDeal(String(formData.get("dealId") ?? ""));
    if (!isStageAtLeast(deal.stage, DealStage.DATA_ROOM)) {
      return { error: "Salle de données fermée tant que l'NDA n'est pas accepté." };
    }
    if (actor.id !== deal.sellerId) return { error: "Seul le cédant dépose les fichiers." };
    const file = formData.get("file");
    if (!(file instanceof File) || file.size === 0) return { error: "Choisissez un fichier." };
    const buffer = Buffer.from(await file.arrayBuffer());
    const sha256 = createHash("sha256").update(buffer).digest("hex");
    const safe = file.name.replace(/[^a-zA-Z0-9._-]+/g, "_").slice(0, 80) || "document";
    const storageKey = path.posix.join("deals", deal.id, `${Date.now()}-${safe}`);
    const root = path.resolve(process.cwd(), process.env.FILE_STORAGE_DIR ?? "./uploads");
    const full = path.join(root, storageKey);
    await mkdir(path.dirname(full), { recursive: true });
    await writeFile(full, buffer);
    await prisma.document.create({
      data: {
        dealId: deal.id,
        type: DocumentType.OTHER,
        fileName: file.name,
        storageKey,
        sha256,
        uploadedById: actor.id,
      },
    });
    revalidatePath(`/app/dossiers/${deal.id}`);
    return {};
  } catch (error) {
    return { error: error instanceof Error ? error.message : "Dépôt impossible." };
  }
}

export async function logDataRoomViewAction(dealId: string, documentId: string): Promise<void> {
  const { actor, deal } = await loadDeal(dealId);
  if (!isStageAtLeast(deal.stage, DealStage.DATA_ROOM)) return;
  await prisma.dataRoomView.create({
    data: { dealId, viewerId: actor.id, documentId },
  });
  await prisma.auditLog.create({
    data: {
      actorId: actor.id,
      action: "DATA_ROOM_VIEW",
      entityType: "Document",
      entityId: documentId,
      metadata: { dealId },
    },
  });
}

export async function mockKycAction(_prev: DealFormState, formData: FormData): Promise<DealFormState> {
  try {
    const { actor, deal } = await loadDeal(String(formData.get("dealId") ?? ""));
    if (deal.stage !== DealStage.KYC && deal.stage !== DealStage.LOI) {
      return { error: "KYC hors séquence." };
    }
    await mockVerifyKyc(actor.id);
    if (deal.stage === DealStage.KYC) {
      await prisma.deal.update({ where: { id: deal.id }, data: { stage: DealStage.DEED } });
    }
    revalidatePath(`/app/dossiers/${deal.id}`);
    return {};
  } catch (error) {
    return { error: error instanceof Error ? error.message : "KYC impossible." };
  }
}

export async function mockSignDealDocAction(_prev: DealFormState, formData: FormData): Promise<DealFormState> {
  try {
    const { deal } = await loadDeal(String(formData.get("dealId") ?? ""));
    const documentId = String(formData.get("documentId") ?? "");
    await mockSignDocument(documentId);
    if (deal.stage === DealStage.SIGNATURE || deal.stage === DealStage.DEED) {
      const next = deal.stage === DealStage.DEED ? DealStage.SIGNATURE : DealStage.ESCROW;
      await prisma.deal.update({ where: { id: deal.id }, data: { stage: next } });
    }
    revalidatePath(`/app/dossiers/${deal.id}`);
    return {};
  } catch (error) {
    return { error: error instanceof Error ? error.message : "Signature impossible." };
  }
}

export async function mockEscrowAction(_prev: DealFormState, formData: FormData): Promise<DealFormState> {
  try {
    const { deal } = await loadDeal(String(formData.get("dealId") ?? ""));
    const intent = String(formData.get("intent") ?? "hold");
    if (intent === "release") await mockEscrowRelease(deal.id);
    else await mockEscrowHold(deal.id);
    if (deal.stage === DealStage.ESCROW && intent === "hold") {
      await prisma.deal.update({ where: { id: deal.id }, data: { stage: DealStage.TRANSFER } });
    }
    revalidatePath(`/app/dossiers/${deal.id}`);
    return {};
  } catch (error) {
    return { error: error instanceof Error ? error.message : "Séquestre impossible." };
  }
}

export async function advanceDealStageAction(
  _prev: DealFormState,
  formData: FormData,
): Promise<DealFormState> {
  try {
    const { deal } = await loadDeal(String(formData.get("dealId") ?? ""));
    const next = nextStage(deal.stage);
    if (!next) return { error: "Dossier déjà clôturé." };
    if (deal.stage === DealStage.NDA && !deal.ndaAcceptedAt) {
      return { error: "Acceptez d'abord l'accord de confidentialité." };
    }
    await prisma.deal.update({ where: { id: deal.id }, data: { stage: next } });
    if (next === DealStage.LOI) {
      await prisma.auditLog.create({
        data: {
          actorId: deal.buyerId,
          action: "IDENTIFYING_DATA_VIEW",
          entityType: "Deal",
          entityId: deal.id,
          metadata: { reason: "stage_loi" },
        },
      });
    }
    revalidatePath(`/app/dossiers/${deal.id}`);
    return {};
  } catch (error) {
    return { error: error instanceof Error ? error.message : "Changement d'étape impossible." };
  }
}

export async function sendDealMessageAction(
  _prev: DealFormState,
  formData: FormData,
): Promise<DealFormState> {
  try {
    const { actor, deal } = await loadDeal(String(formData.get("dealId") ?? ""));
    const body = String(formData.get("body") ?? "").trim();
    if (body.length < 2) return { error: "Message vide." };
    await prisma.message.create({ data: { dealId: deal.id, senderId: actor.id, body: body.slice(0, 4000) } });
    revalidatePath(`/app/dossiers/${deal.id}`);
    return {};
  } catch (error) {
    return { error: error instanceof Error ? error.message : "Envoi impossible." };
  }
}

export async function sendListingMessageAction(
  _prev: DealFormState,
  formData: FormData,
): Promise<DealFormState> {
  try {
    const actor = await actorOrThrow();
    const listingId = String(formData.get("listingId") ?? "");
    const body = String(formData.get("body") ?? "").trim();
    if (body.length < 2) return { error: "Message vide." };
    const listing = await prisma.listing.findUnique({
      where: { id: listingId },
      include: { portfolio: { select: { firmId: true } } },
    });
    if (!listing) return { error: "Annonce introuvable." };
    const seller = ownsFirm(actor, listing.portfolio.firmId);
    if (!seller && !canBuy(actor)) {
      return { error: "Messagerie réservée au cédant et aux acquéreurs." };
    }
    await prisma.message.create({
      data: { listingId, senderId: actor.id, body: body.slice(0, 4000) },
    });
    revalidatePath(`/annonces/${listing.publicNumber}`);
    revalidatePath(`/app/annonces/${listing.id}`);
    return {};
  } catch (error) {
    return { error: error instanceof Error ? error.message : "Envoi impossible." };
  }
}

export async function recordDataRoomViewAction(
  _prev: DealFormState,
  formData: FormData,
): Promise<DealFormState> {
  try {
    await logDataRoomViewAction(
      String(formData.get("dealId") ?? ""),
      String(formData.get("documentId") ?? ""),
    );
    revalidatePath(`/app/dossiers/${String(formData.get("dealId") ?? "")}`);
    return {};
  } catch (error) {
    return { error: error instanceof Error ? error.message : "Journal impossible." };
  }
}
