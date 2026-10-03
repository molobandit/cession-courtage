"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { canBuy, getActor, isOriasVerified } from "@/lib/authz";
import { ownsFirm } from "@/lib/authz/policies";
import { hasContactSubscription } from "@/lib/billing/contact-access";
import { listingAcceptsOffers } from "@/lib/offer/acceptance";
import { notifyPositionTaken } from "@/lib/position/events";
import { ensurePosition } from "@/lib/position/load";
import { prisma } from "@/lib/prisma";

export type PositionActionState = { error?: string };

/**
 * « Prendre position » : ouvre le dossier de l'acquéreur sur une annonce.
 *
 * Le bouton ne faisait qu'afficher un onglet. Il crée désormais la position,
 * prévient le cédant et mène au dossier, où chaque étape suivante — dépôt,
 * offre, dossier de cession — se fait et se suit jusqu'à la clôture.
 */
export async function takePositionAction(
  _prev: PositionActionState,
  formData: FormData,
): Promise<PositionActionState> {
  const actor = await getActor();
  const listingId = String(formData.get("listingId") ?? "");
  const listing = await prisma.listing.findUnique({
    where: { id: listingId },
    select: { id: true, status: true, publicNumber: true, portfolio: { select: { firmId: true } } },
  });
  if (!listing) return { error: "Annonce introuvable." };
  const fiche = `/annonces/${listing.publicNumber}`;

  if (!actor) redirect(`/connexion?next=${encodeURIComponent(fiche)}`);
  if (!isOriasVerified(actor)) redirect("/en-attente-orias");
  if (!canBuy(actor)) return { error: "Ce compte ne peut pas acquérir de portefeuille." };
  if (ownsFirm(actor, listing.portfolio.firmId)) {
    return { error: "C’est votre propre annonce : suivez les candidats depuis « Mes cessions »." };
  }
  if (!(await hasContactSubscription(actor))) {
    redirect(fiche);
  }

  // Une position déjà prise se rouvre, même si l'annonce ne reçoit plus d'offres.
  const existante = await prisma.buyerPosition.findUnique({
    where: { listingId_buyerId: { listingId, buyerId: actor.id } },
    select: { id: true },
  });
  if (existante) redirect(`/app/positions/${existante.id}`);

  if (!listingAcceptsOffers(listing.status)) {
    return { error: "Ce portefeuille ne reçoit plus de candidatures." };
  }

  // Arrivé depuis sa demande d'acquisition : la position garde la trace de la proposition.
  const proposition = await prisma.mandateProposal.findFirst({
    where: { listingId, mandate: { buyerId: actor.id } },
    select: { id: true },
  });
  const position = await ensurePosition({ listingId, buyerId: actor.id, proposalId: proposition?.id });
  if (position.created) {
    await notifyPositionTaken(listingId, actor.id).catch((e) => console.error("notifyPositionTaken", e));
    await prisma.auditLog.create({
      data: {
        actorId: actor.id,
        action: "position.taken",
        entityType: "Listing",
        entityId: listingId,
        metadata: { positionId: position.id },
      },
    });
  }

  revalidatePath("/app");
  revalidatePath(fiche);
  redirect(`/app/positions/${position.id}`);
}
