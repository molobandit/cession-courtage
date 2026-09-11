"use server";

import { revalidatePath } from "next/cache";
import { canBuy, getActor, isOriasVerified } from "@/lib/authz/actor";
import { ForbiddenError, UnauthenticatedError } from "@/lib/authz/errors";
import { isTradableListingStatus, ownsFirm } from "@/lib/authz/policies";
import { hasContactSubscription } from "@/lib/billing/contact-access";
import { INTEREST_DEPOSIT_LABEL, INTEREST_DEPOSIT_RATE, interestDepositFor } from "@/lib/billing/rates";
import { prisma } from "@/lib/prisma";
import { idSchema } from "@/lib/validations/actions";

export type DepositFormState = { error?: string; placed?: boolean };

/**
 * Pose le depot d'interet de 2,5 % sur une annonce.
 *
 * C'est ce depot qui leve l'anonymat entre le cedant et l'acquereur, sans
 * attendre la LOI. Aucun encaissement reel : l'enregistrement vaut engagement,
 * conformement a la regle du projet.
 *
 * L'appartenance et les droits sont verifies au niveau de la requete, jamais a
 * l'affichage : un identifiant devine ne permet rien.
 */
export async function placeInterestDepositAction(
  _prev: DepositFormState,
  formData: FormData,
): Promise<DepositFormState> {
  try {
    const actor = await getActor();
    if (!actor) throw new UnauthenticatedError();
    if (!isOriasVerified(actor)) throw new ForbiddenError("ORIAS non validé.");
    if (!canBuy(actor)) throw new ForbiddenError("Réservé aux acquéreurs.");

    if (!(await hasContactSubscription(actor))) {
      return {
        error: "Un abonnement annuel est requis avant de déposer un engagement.",
      };
    }

    const parsed = idSchema.safeParse(formData.get("listingId"));
    if (!parsed.success) return { error: "Annonce introuvable." };

    const listing = await prisma.listing.findUnique({
      where: { id: parsed.data },
      select: {
        id: true,
        status: true,
        askingPrice: true,
        publicNumber: true,
        portfolio: { select: { firmId: true } },
      },
    });
    if (!listing || !isTradableListingStatus(listing.status)) {
      return { error: "Annonce introuvable." };
    }
    if (ownsFirm(actor, listing.portfolio.firmId)) {
      return { error: "Vous ne pouvez pas déposer sur votre propre annonce." };
    }

    const amount = interestDepositFor(Number(listing.askingPrice));
    if (amount <= 0) return { error: "Montant de dépôt invalide." };

    // D1 n'a pas de transactions : l'unicite du couple annonce/acquereur et cet
    // upsert rendent un rejeu inoffensif. Le montant du premier depot est
    // conserve, un changement de prix demande ne le revalorise pas.
    const deposit = await prisma.interestDeposit.upsert({
      where: { listingId_buyerId: { listingId: listing.id, buyerId: actor.id } },
      update: {},
      create: {
        listingId: listing.id,
        buyerId: actor.id,
        amount: amount.toFixed(2),
        rate: INTEREST_DEPOSIT_RATE.toFixed(4),
      },
    });

    const { findFirmSeller, notifyDepositPlaced } = await import("@/lib/notify/transactional");
    const seller = await findFirmSeller(listing.portfolio.firmId);
    if (seller) {
      await notifyDepositPlaced({
        depositKey: deposit.id,
        publicNumber: listing.publicNumber ?? 0,
        amountLabel: INTEREST_DEPOSIT_LABEL,
        seller: { userId: seller.id, email: seller.email },
        counterparty: { userId: actor.id, email: actor.email },
      }).catch(() => null);
    }

    await prisma.auditLog.create({
      data: {
        actorId: actor.id,
        action: "listing.deposit.placed",
        entityType: "Listing",
        entityId: listing.id,
        metadata: { amount, rate: INTEREST_DEPOSIT_RATE },
      },
    });

    revalidatePath(`/annonces/${listing.publicNumber}`);
    revalidatePath("/app");
    return { placed: true };
  } catch (error) {
    if (error instanceof UnauthenticatedError) return { error: "Authentification requise." };
    if (error instanceof ForbiddenError) return { error: error.message };
    return { error: "Dépôt impossible." };
  }
}
