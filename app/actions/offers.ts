"use server";

import { DealStage, ListingStatus, OfferStatus } from "@prisma/client";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { canBuy, getActor, isOriasVerified, listOffersForListing } from "@/lib/authz";
import { ownsFirm } from "@/lib/authz/policies";
import { isOfferWindowSealed } from "@/lib/authz/policies";
import { ForbiddenError, UnauthenticatedError } from "@/lib/authz/errors";
import { hasContactSubscription } from "@/lib/billing/contact-access";
import { prisma } from "@/lib/prisma";
import { firstIssue, offerIdSchema, offerSchema } from "@/lib/validations/actions";

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
    if (!(await hasContactSubscription(actor))) {
      return {
        error:
          "Un abonnement annuel est requis pour accéder au détail de l’offre, au contact et à la messagerie.",
      };
    }
    const parsed = offerSchema.safeParse({
      listingId: formData.get("listingId"),
      amount: formData.get("amount"),
      upfrontPercent: formData.get("upfrontPercent"),
      message: formData.get("message"),
    });
    if (!parsed.success) return { error: firstIssue(parsed.error) };
    const { listingId, amount, upfrontPercent: upfront, message } = parsed.data;

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
    const parsed = offerIdSchema.safeParse({ offerId: formData.get("offerId") });
    if (!parsed.success) return { error: firstIssue(parsed.error) };
    const { offerId } = parsed.data;
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
    const parsedId = offerIdSchema.safeParse({ offerId: formData.get("offerId") });
    if (!parsedId.success) return { error: firstIssue(parsedId.error) };

    const offer = await prisma.offer.findUnique({
      where: { id: parsedId.data.offerId },
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

    const dealKey = { listingId: offer.listingId, buyerId: offer.buyerId };
    const existingDeal = await prisma.deal.findUnique({
      where: { listingId_buyerId: dealKey },
      select: { id: true },
    });

    // Le dossier existe déjà : l'action a donc abouti, on y renvoie sans rien refaire.
    if (existingDeal) {
      redirect(`/app/dossiers/${existingDeal.id}`);
    }

    // D1 n'offre pas de transaction. Une acceptation interrompue laisse l'offre
    // en ACCEPTED sans dossier : cet état précis est reprenable.
    const resumable = offer.status === OfferStatus.ACCEPTED;
    if (offer.status !== OfferStatus.SUBMITTED && !resumable) {
      return { error: "Offre non recevable." };
    }

    const quota = await prisma.subscription.findFirst({
      where: { userId: actor.id, status: "ACTIVE" },
    });
    if (!resumable && quota?.dealQuota != null && quota.dealsUsed >= quota.dealQuota) {
      return { error: "Quota de dossiers du forfait atteint." };
    }

    const amount = Number(offer.amount);
    const upfront = amount * (Number(offer.upfrontPercent) / 100);
    const seller = await prisma.user.findUnique({
      where: { id: actor.id },
      select: { publicAlias: true },
    });

    // Les étapes s'exécutent en requêtes indépendantes. L'ordre est choisi pour
    // qu'un échec en cours de route laisse un état reprenable, et la contrainte
    // unique (listingId, buyerId) empêche tout doublon à la reprise.

    // 1. Point d'engagement.
    if (!resumable) {
      await prisma.offer.update({
        where: { id: offer.id },
        data: { status: OfferStatus.ACCEPTED },
      });
    }

    // 2. Création du dossier, sans doublon possible.
    const deal = await prisma.deal.upsert({
      where: { listingId_buyerId: dealKey },
      update: {},
      create: {
        listingId: offer.listingId,
        sellerId: actor.id,
        buyerId: offer.buyerId,
        agreedPrice: amount.toFixed(2),
        upfrontAmount: upfront.toFixed(2),
        deferredAmount: (amount - upfront).toFixed(2),
        stage: DealStage.NDA,
        sellerAlias: `Cédant ${seller?.publicAlias ?? "C"}`,
        buyerAlias: `Acquéreur ${offer.buyer.publicAlias}`,
      },
    });

    // 3. Conséquences dérivables : rejouables sans dommage.
    await prisma.offer.updateMany({
      where: { listingId: offer.listingId, id: { not: offer.id }, status: OfferStatus.SUBMITTED },
      data: { status: OfferStatus.DECLINED },
    });
    await prisma.listing.update({
      where: { id: offer.listingId },
      data: { status: ListingStatus.UNDER_NEGOTIATION },
    });
    if (quota && !resumable) {
      await prisma.subscription.update({
        where: { id: quota.id },
        data: { dealsUsed: { increment: 1 } },
      });
    }

    destination = `/app/dossiers/${deal.id}`;
  } catch (error) {
    // redirect() lève une erreur de contrôle interne à Next : ne pas l'avaler.
    if (error && typeof error === "object" && "digest" in error) throw error;
    return { error: error instanceof Error ? error.message : "Acceptation impossible." };
  }
  if (destination) redirect(destination);
  return { error: "Acceptation impossible." };
}
