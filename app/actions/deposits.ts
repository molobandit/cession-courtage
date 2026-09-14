"use server";

import { revalidatePath } from "next/cache";
import { canBuy, getActor, isOriasVerified } from "@/lib/authz/actor";
import { ForbiddenError, UnauthenticatedError } from "@/lib/authz/errors";
import { isTradableListingStatus, ownsFirm } from "@/lib/authz/policies";
import { hasContactSubscription } from "@/lib/billing/contact-access";
import { redirect } from "next/navigation";
import { AGREEMENTS_REQUIRED_MESSAGE, loadAgreementsStatus } from "@/lib/account/agreements-load";
import { isDepositMethod, startDepositPayment } from "@/lib/billing/deposit-checkout";
import { checkFinancing } from "@/lib/buyer/financing-load";
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
  let paiement: string | null = null;
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
        offerWindowClosesAt: true,
        portfolio: { select: { firmId: true } },
      },
    });
    if (!listing || !isTradableListingStatus(listing.status)) {
      return { error: "Annonce introuvable." };
    }
    if (ownsFirm(actor, listing.portfolio.firmId)) {
      return { error: "Vous ne pouvez pas déposer sur votre propre annonce." };
    }

    const engagements = await loadAgreementsStatus(actor);
    if (!engagements.valid) return { error: AGREEMENTS_REQUIRED_MESSAGE };
    const financement = await checkFinancing(actor.id, 0);
    if (!financement.ok) return { error: financement.raison };
    const methode = formData.get("paymentMethod");
    if (!isDepositMethod(methode)) return { error: "Choisissez de payer le dépôt par carte ou par prélèvement." };

    const suite = await startDepositPayment({
      buyer: actor,
      listing,
      method: methode,
      cancelPath: `/annonces/${listing.publicNumber}#position`,
    });
    if (suite.kind === "redirect") {
      paiement = suite.url;
    } else {
      revalidatePath(`/annonces/${listing.publicNumber}`);
      if (suite.positionId) revalidatePath(`/app/positions/${suite.positionId}`);
      revalidatePath("/app");
      return { placed: true };
    }
  } catch (error) {
    if (error instanceof UnauthenticatedError) return { error: "Authentification requise." };
    if (error instanceof ForbiddenError) return { error: error.message };
    console.error("placeInterestDepositAction", error);
    return { error: "Dépôt impossible." };
  }
  if (paiement) redirect(paiement);
  return { error: "Dépôt impossible." };
}
