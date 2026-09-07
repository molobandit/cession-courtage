"use server";

import { DealStage, ListingStatus, OfferStatus } from "@prisma/client";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { canBuy, getActor, isOriasVerified, listOffersForListing } from "@/lib/authz";
import { ownsFirm } from "@/lib/authz/policies";
import { isOfferWindowSealed } from "@/lib/authz/policies";
import { ForbiddenError, UnauthenticatedError } from "@/lib/authz/errors";
import { parseFrenchNumber } from "@/lib/import/values";
import { prisma } from "@/lib/prisma";
import { ASKING_MAX, ASKING_MIN } from "@/lib/listing/constants";

export type OfferFormState = { error?: string };

async function requireBuyerActor() {
  const actor = await getActor();
  if (!actor) throw new UnauthenticatedError();
  if (!isOriasVerified(actor)) throw new ForbiddenError("ORIAS non validé.");
  if (!canBuy(actor)) throw new ForbiddenError("Réservé aux acquéreurs.");
  return actor;
}

export async function submitOfferAction(
  _prev: OfferFormState,
  formData: FormData,
): Promise<OfferFormState> {
  try {
    const actor = await requireBuyerActor();
    const listingId = String(formData.get("listingId") ?? "");
    const listing = await prisma.listing.findUnique({
      where: { id: listingId },
      include: { portfolio: { select: { firmId: true } } },
    });
    if (!listing) return { error: "Annonce introuvable." };
    if (ownsFirm(actor, listing.portfolio.firmId)) {
      return { error: "Vous ne pouvez pas enchérir sur votre propre annonce." };
    }
    if (listing.status !== ListingStatus.OFFERS_OPEN || !isOfferWindowSealed(listing)) {
      return { error: "La fenêtre d'offres n'est pas ouverte." };
    }
    const amount = parseFrenchNumber(String(formData.get("amount") ?? ""));
    const upfront = parseFrenchNumber(String(formData.get("upfrontPercent") ?? ""));
    const message = String(formData.get("message") ?? "").trim();
    if (amount == null || amount < ASKING_MIN || amount > ASKING_MAX) {
      return { error: "Montant d'offre hors fourchette (2 000–200 000 €)." };
    }
    if (upfront == null || upfront < 0 || upfront > 100) {
      return { error: "Le comptant doit être entre 0 et 100 %." };
    }
    if (message.length < 10) return { error: "Précisez un message d'au moins 10 caractères." };

    await prisma.offer.upsert({
      where: { listingId_buyerId: { listingId, buyerId: actor.id } },
      update: {
        amount: amount.toFixed(2),
        upfrontPercent: upfront.toFixed(2),
        message,
        status: OfferStatus.SUBMITTED,
        submittedAt: new Date(),
      },
      create: {
        listingId,
        buyerId: actor.id,
        amount: amount.toFixed(2),
        upfrontPercent: upfront.toFixed(2),
        message,
      },
    });
    revalidatePath(`/annonces/${listing.publicNumber}`);
    revalidatePath("/app");
    return {};
  } catch (error) {
    return { error: error instanceof Error ? error.message : "Dépôt impossible." };
  }
}

export async function withdrawOfferAction(
  _prev: OfferFormState,
  formData: FormData,
): Promise<OfferFormState> {
  try {
    const actor = await requireBuyerActor();
    const offerId = String(formData.get("offerId") ?? "");
    const offer = await prisma.offer.findUnique({ where: { id: offerId } });
    if (!offer || offer.buyerId !== actor.id) return { error: "Offre introuvable." };
    if (offer.status !== OfferStatus.SUBMITTED) return { error: "Cette offre ne peut plus être retirée." };
    await prisma.offer.update({ where: { id: offerId }, data: { status: OfferStatus.WITHDRAWN } });
    revalidatePath("/app");
    return {};
  } catch (error) {
    return { error: error instanceof Error ? error.message : "Retrait impossible." };
  }
}

export async function acceptOfferAction(
  _prev: OfferFormState,
  formData: FormData,
): Promise<OfferFormState> {
  let destination: string | null = null;
  try {
    const actor = await getActor();
    if (!actor) throw new UnauthenticatedError();
    const offerId = String(formData.get("offerId") ?? "");
    const offer = await prisma.offer.findUnique({
      where: { id: offerId },
      include: {
        listing: { include: { portfolio: { select: { firmId: true } } } },
        buyer: { select: { id: true, publicAlias: true } },
      },
    });
    if (!offer) return { error: "Offre introuvable." };
    if (!ownsFirm(actor, offer.listing.portfolio.firmId)) {
      return { error: "Seul le cédant peut retenir une offre." };
    }
    const access = await listOffersForListing(offer.listingId, actor);
    if (access.access === "sealed") {
      return { error: "La fenêtre est encore ouverte : les offres restent scellées." };
    }
    if (offer.status !== OfferStatus.SUBMITTED) return { error: "Offre non recevable." };

    const quota = await prisma.subscription.findFirst({
      where: { userId: actor.id, status: "ACTIVE" },
    });
    if (quota?.dealQuota != null && quota.dealsUsed >= quota.dealQuota) {
      return { error: "Quota de dossiers du forfait atteint." };
    }

    const amount = Number(offer.amount);
    const upfront = amount * (Number(offer.upfrontPercent) / 100);
    const seller = await prisma.user.findUnique({ where: { id: actor.id } });
    const deal = await prisma.$transaction(async (tx) => {
      await tx.offer.update({ where: { id: offer.id }, data: { status: OfferStatus.ACCEPTED } });
      await tx.offer.updateMany({
        where: { listingId: offer.listingId, id: { not: offer.id }, status: OfferStatus.SUBMITTED },
        data: { status: OfferStatus.DECLINED },
      });
      await tx.listing.update({
        where: { id: offer.listingId },
        data: { status: ListingStatus.UNDER_NEGOTIATION },
      });
      const created = await tx.deal.create({
        data: {
          listingId: offer.listingId,
          sellerId: actor.id,
          buyerId: offer.buyerId,
          agreedPrice: amount.toFixed(2),
          upfrontAmount: upfront.toFixed(2),
          deferredAmount: (amount - upfront).toFixed(2),
          stage: DealStage.NDA,
          sellerAlias: `Cédant #${seller?.publicAlias ?? "C"}`,
          buyerAlias: `Acquéreur #${offer.buyer.publicAlias}`,
        },
      });
      if (quota) {
        await tx.subscription.update({
          where: { id: quota.id },
          data: { dealsUsed: { increment: 1 } },
        });
      }
      return created;
    });
    destination = `/app/dossiers/${deal.id}`;
  } catch (error) {
    return { error: error instanceof Error ? error.message : "Acceptation impossible." };
  }
  if (destination) redirect(destination);
  return { error: "Acceptation impossible." };
}
