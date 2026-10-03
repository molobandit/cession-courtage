"use server";

import { revalidatePath } from "next/cache";
import { getActor, isOriasVerified } from "@/lib/authz/actor";
import { isDealParticipant, ownsFirm } from "@/lib/authz/policies";
import { ForbiddenError, UnauthenticatedError } from "@/lib/authz/errors";
import { firstIssue, messageSchema } from "@/lib/validations/actions";
import {
  isListingMailboxParty,
  listingSellerUserId,
} from "@/lib/authz/messages";
import { prisma } from "@/lib/prisma";
import { notifyDealEvent, notifyListingMessage } from "@/lib/position/events";
import { offPlatformPhoneError } from "@/lib/chat/phone-block";

/*
 * Les étapes du dossier de cession vivent dans `deal-process.ts` : chacune y
 * exige ses pièces et ses validations. Il ne reste ici que les messageries.
 */

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
    await notifyDealEvent({
      dealId: deal.id,
      actorId: actor.id,
      key: `message:${new Date().toISOString().slice(0, 13)}`,
      title: "Nouveau message",
      body: "Vous avez reçu un message dans le dossier de cession.",
    }).catch((e) => console.error("notifyDealEvent", e));
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
      return { error: "Messagerie réservée au cédant et aux acquéreurs qui ont pris position." };
    }

    const seller = ownsFirm(actor, listing.portfolio.firmId);
    let recipientId: string | null = String(formData.get("recipientId") ?? "").trim() || null;
    if (seller) {
      if (!recipientId) return { error: "Choisissez l’acquéreur à qui répondre." };
      // Ont droit à une réponse les acquéreurs qui se sont positionnés sur l’annonce.
      const [offer, position] = await Promise.all([
        prisma.offer.findUnique({
          where: { listingId_buyerId: { listingId, buyerId: recipientId } },
          select: { id: true },
        }),
        prisma.buyerPosition.findUnique({
          where: { listingId_buyerId: { listingId, buyerId: recipientId } },
          select: { id: true },
        }),
      ]);
      if (!offer && !position) return { error: "Destinataire hors ayants droit." };
    } else {
      const sellerId = await listingSellerUserId(listing.portfolio.firmId);
      if (!sellerId) return { error: "Cédant introuvable." };
      recipientId = sellerId;
    }

    await prisma.message.create({
      data: { listingId, senderId: actor.id, recipientId, body: body.slice(0, 4000) },
    });
    if (recipientId) {
      await notifyListingMessage({
        listingId,
        buyerId: seller ? recipientId : actor.id,
        recipientId,
      }).catch((e) => console.error("notifyListingMessage", e));
    }
    revalidatePath(`/annonces/${listing.publicNumber}`);
    revalidatePath("/app/positions/[id]", "page");
    revalidatePath(`/app/annonces/${listing.id}`);
    return {};
  } catch (error) {
    return { error: error instanceof Error ? error.message : "Envoi impossible." };
  }
}
