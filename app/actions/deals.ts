"use server";

import { DealStage, DocumentType, ListingStatus } from "@prisma/client";
import { createHash } from "node:crypto";
import { revalidatePath } from "next/cache";
import { getActor, isOriasVerified } from "@/lib/authz/actor";
import { isDealParticipant, isStageAtLeast, ownsFirm } from "@/lib/authz/policies";
import { ForbiddenError, UnauthenticatedError } from "@/lib/authz/errors";
import { firstIssue, messageSchema } from "@/lib/validations/actions";
import {
  isListingMailboxParty,
  listingSellerUserId,
} from "@/lib/authz/messages";
import { holdEscrowFunds, releaseEscrowFunds, signDealDocument, verifyPartyIdentity } from "@/lib/partners/runtime";
import { prisma } from "@/lib/prisma";
import { offPlatformPhoneError } from "@/lib/chat/phone-block";
import { putObject } from "@/lib/storage/objects";

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
    // Horodatage passe en parametre : le nom de cle ne doit pas dependre de
    // l'instant d'execution ailleurs que ici.
    const storageKey = `deals/${deal.id}/${Date.now()}-${safe}`;
    // Workers n'a pas de systeme de fichiers : le contenu part dans R2.
    await putObject(storageKey, new Uint8Array(buffer));
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
    await verifyPartyIdentity(actor.id);
    /*
     * Deux temps, comme l'annonce le parcours : « lancer la vérification » à
     * l'accord de prix, « terminer la conformité » à l'étape suivante.
     *
     * Le premier manquait. Rien dans le code n'écrivait jamais `KYC`, si bien
     * qu'un dossier arrivé à la lettre d'intention y restait pour toujours : la
     * garde du protocole exige l'étape KYC, que plus rien ne pouvait produire.
     * Le tunnel s'arrêtait là, sans message d'erreur — l'action répondait même
     * un succès, puisqu'elle enregistrait bien la vérification.
     */
    const suivante =
      deal.stage === DealStage.LOI ? DealStage.KYC : DealStage.DEED;
    await prisma.deal.update({ where: { id: deal.id }, data: { stage: suivante } });
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
    await signDealDocument(documentId);
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
    if (intent === "release") await releaseEscrowFunds(deal.id);
    else await holdEscrowFunds(deal.id);
    if (deal.stage === DealStage.ESCROW && intent === "hold") {
      await prisma.deal.update({ where: { id: deal.id }, data: { stage: DealStage.TRANSFER } });
    }
    revalidatePath(`/app/dossiers/${deal.id}`);
    return {};
  } catch (error) {
    return { error: error instanceof Error ? error.message : "Séquestre impossible." };
  }
}

export async function signLoiAction(
  _prev: DealFormState,
  formData: FormData,
): Promise<DealFormState> {
  try {
    const { actor, deal } = await loadDeal(String(formData.get("dealId") ?? ""));
    if (deal.stage !== DealStage.DATA_ROOM) {
      return { error: "La lettre d'intention n'est possible qu'après ouverture de la salle de données." };
    }
    if (!deal.ndaAcceptedAt) return { error: "Acceptez d'abord l'accord de confidentialité." };
    await prisma.deal.update({ where: { id: deal.id }, data: { stage: DealStage.LOI } });
    await prisma.document.create({
      data: {
        dealId: deal.id,
        type: DocumentType.LOI,
        fileName: "lettre-intention-mock.pdf",
        storageKey: `deals/${deal.id}/loi-mock.pdf`,
        sha256: createHash("sha256").update(`loi:${deal.id}`).digest("hex"),
        uploadedById: actor.id,
        signedAt: new Date(),
      },
    });
    await prisma.auditLog.create({
      data: {
        actorId: actor.id,
        action: "IDENTIFYING_DATA_VIEW",
        entityType: "Deal",
        entityId: deal.id,
        metadata: { reason: "stage_loi" },
      },
    });
    revalidatePath(`/app/dossiers/${deal.id}`);
    return {};
  } catch (error) {
    return { error: error instanceof Error ? error.message : "LOI impossible." };
  }
}

export async function validateDeedAction(
  _prev: DealFormState,
  formData: FormData,
): Promise<DealFormState> {
  try {
    const { deal } = await loadDeal(String(formData.get("dealId") ?? ""));
    if (deal.stage !== DealStage.DEED) return { error: "Le protocole n'est pas à cette étape." };
    await prisma.deal.update({ where: { id: deal.id }, data: { stage: DealStage.SIGNATURE } });
    revalidatePath(`/app/dossiers/${deal.id}`);
    return {};
  } catch (error) {
    return { error: error instanceof Error ? error.message : "Validation impossible." };
  }
}

export async function confirmSignatureAction(
  _prev: DealFormState,
  formData: FormData,
): Promise<DealFormState> {
  try {
    const { deal } = await loadDeal(String(formData.get("dealId") ?? ""));
    if (deal.stage !== DealStage.SIGNATURE) return { error: "La signature n'est pas à cette étape." };
    await prisma.deal.update({ where: { id: deal.id }, data: { stage: DealStage.ESCROW } });
    revalidatePath(`/app/dossiers/${deal.id}`);
    return {};
  } catch (error) {
    return { error: error instanceof Error ? error.message : "Confirmation impossible." };
  }
}

export async function confirmTransferAction(
  _prev: DealFormState,
  formData: FormData,
): Promise<DealFormState> {
  try {
    const { deal } = await loadDeal(String(formData.get("dealId") ?? ""));
    if (deal.stage !== DealStage.TRANSFER) return { error: "Le transfert ORIAS n'est pas à cette étape." };
    await prisma.deal.update({ where: { id: deal.id }, data: { stage: DealStage.RETENTION } });
    revalidatePath(`/app/dossiers/${deal.id}`);
    return {};
  } catch (error) {
    return { error: error instanceof Error ? error.message : "Transfert impossible." };
  }
}

export async function closeDealAction(
  _prev: DealFormState,
  formData: FormData,
): Promise<DealFormState> {
  try {
    const { deal } = await loadDeal(String(formData.get("dealId") ?? ""));
    if (deal.stage !== DealStage.RETENTION) {
      return { error: "La clôture n’est possible qu’après le transfert et la période de vérification." };
    }
    await releaseEscrowFunds(deal.id);
    await prisma.deal.update({ where: { id: deal.id }, data: { stage: DealStage.CLOSED } });
    await prisma.listing.update({
      where: { id: deal.listingId },
      data: { status: ListingStatus.SOLD },
    });
    revalidatePath(`/app/dossiers/${deal.id}`);
    revalidatePath("/app");
    revalidatePath("/annonces");
    return {};
  } catch (error) {
    return { error: error instanceof Error ? error.message : "Clôture impossible." };
  }
}

export async function sendDealMessageAction(
  _prev: DealFormState,
  formData: FormData,
): Promise<DealFormState> {
  try {
    const { actor, deal } = await loadDeal(String(formData.get("dealId") ?? ""));
    const parsedBody = messageSchema.safeParse({ body: formData.get("body") });
    if (!parsedBody.success) return { error: firstIssue(parsedBody.error) };
    const body = parsedBody.data.body;
    if (body.length < 2) return { error: "Message vide." };
    const blockedDeal = offPlatformPhoneError(body);
    if (blockedDeal) return { error: blockedDeal };
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
    const parsedListingBody = messageSchema.safeParse({ body: formData.get("body") });
    if (!parsedListingBody.success) return { error: firstIssue(parsedListingBody.error) };
    const body = parsedListingBody.data.body;
    if (body.length < 2) return { error: "Message vide." };
    const blockedListing = offPlatformPhoneError(body);
    if (blockedListing) return { error: blockedListing };
    const listing = await prisma.listing.findUnique({
      where: { id: listingId },
      include: { portfolio: { select: { firmId: true } } },
    });
    if (!listing) return { error: "Annonce introuvable." };
    if (!(await isListingMailboxParty(actor, listingId))) {
      return { error: "Messagerie réservée au cédant et aux acquéreurs ayant déposé une offre." };
    }

    const seller = ownsFirm(actor, listing.portfolio.firmId);
    let recipientId: string | null = String(formData.get("recipientId") ?? "").trim() || null;
    if (seller) {
      if (!recipientId) return { error: "Choisissez l’acquéreur à qui répondre." };
      const entitled = await prisma.offer.findUnique({
        where: { listingId_buyerId: { listingId, buyerId: recipientId } },
        select: { id: true },
      });
      if (!entitled) return { error: "Destinataire hors ayants droit." };
    } else {
      const sellerId = await listingSellerUserId(listing.portfolio.firmId);
      if (!sellerId) return { error: "Cédant introuvable." };
      recipientId = sellerId;
    }

    await prisma.message.create({
      data: { listingId, senderId: actor.id, recipientId, body: body.slice(0, 4000) },
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
