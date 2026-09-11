"use server";

import { revalidatePath } from "next/cache";
import { getActor, isInvestor } from "@/lib/authz/actor";
import { ForbiddenError, UnauthenticatedError } from "@/lib/authz/errors";
import { isPublicListingStatus, ownsFirm } from "@/lib/authz/policies";
import { INTEREST_DEPOSIT_RATE, interestDepositFor } from "@/lib/billing/rates";
import { prisma } from "@/lib/prisma";
import { idSchema } from "@/lib/validations/actions";

export type InvestorFormState = { error?: string; ok?: boolean };

export async function placeInvestorDepositAction(
  _prev: InvestorFormState,
  formData: FormData,
): Promise<InvestorFormState> {
  try {
    const actor = await getActor();
    if (!actor) throw new UnauthenticatedError();
    if (!isInvestor(actor)) throw new ForbiddenError("Réservé aux investisseurs.");

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
    if (!listing || !isPublicListingStatus(listing.status)) {
      return { error: "Annonce introuvable." };
    }
    if (ownsFirm(actor, listing.portfolio.firmId)) {
      return { error: "Vous ne pouvez pas vous positionner sur votre propre annonce." };
    }

    const amount = interestDepositFor(Number(listing.askingPrice));
    if (amount <= 0) return { error: "Montant de dépôt invalide." };

    await prisma.investorPosition.upsert({
      where: { listingId_investorId: { listingId: listing.id, investorId: actor.id } },
      update: {},
      create: {
        listingId: listing.id,
        investorId: actor.id,
        depositAmount: amount.toFixed(2),
      },
    });

    await prisma.auditLog.create({
      data: {
        actorId: actor.id,
        action: "listing.investor.deposit",
        entityType: "Listing",
        entityId: listing.id,
        metadata: { amount, rate: INTEREST_DEPOSIT_RATE },
      },
    });

    revalidatePath(`/annonces/${listing.publicNumber}`);
    revalidatePath("/app/mes-dossiers");
    revalidatePath("/investisseurs/opportunites");
    return { ok: true };
  } catch (error) {
    if (error instanceof UnauthenticatedError) return { error: "Authentification requise." };
    if (error instanceof ForbiddenError) return { error: error.message };
    return { error: "Dépôt impossible." };
  }
}
