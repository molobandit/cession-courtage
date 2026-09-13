"use server";

import { revalidatePath } from "next/cache";
import { canBuy, getActor, isOriasVerified } from "@/lib/authz/actor";
import { ForbiddenError, UnauthenticatedError } from "@/lib/authz/errors";
import { isTradableListingStatus, ownsFirm } from "@/lib/authz/policies";
import { hasContactSubscription } from "@/lib/billing/contact-access";
import { placeDeposit } from "@/lib/listing/place-deposit";
import { prisma } from "@/lib/prisma";
import { idSchema } from "@/lib/validations/actions";

export type DepositFormState = { error?: string; placed?: boolean };

/**
 * Pose le depot d'interet de 2,5 % sur une annonce.
 *
 * C'est ce depot qui leve l'anonymat entre le cedant et l'acquereur, sans
 * attendre la LOI. Sans adaptateur Stripe ou Trustap actif, l'enregistrement
 * vaut engagement, sans debit.
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

    if (formData.get("nda") !== "on") {
      return { error: "Acceptez l’engagement de confidentialité : il protège les pièces que le cédant va vous ouvrir." };
    }
    const { position } = await placeDeposit(actor, listing, true);

    revalidatePath(`/annonces/${listing.publicNumber}`);
    revalidatePath(`/app/positions/${position.id}`);
    revalidatePath("/app");
    return { placed: true };
  } catch (error) {
    if (error instanceof UnauthenticatedError) return { error: "Authentification requise." };
    if (error instanceof ForbiddenError) return { error: error.message };
    return { error: "Dépôt impossible." };
  }
}
