"use server";

import { revalidatePath } from "next/cache";
import { canSell, getActor, isOriasVerified } from "@/lib/authz";
import { ownsFirm } from "@/lib/authz/policies";
import { offPlatformPhoneError } from "@/lib/chat/phone-block";
import { notifyMandateProposal } from "@/lib/notify/transactional";
import { listingAcceptsOffers } from "@/lib/offer/acceptance";
import { prisma } from "@/lib/prisma";

export type ProposalState = { error?: string; sent?: boolean };

/**
 * Un cédant répond à une demande d'acquisition en proposant l'une de ses annonces.
 *
 * La proposition ne crée pas de dossier : elle signale l'annonce à l'acquéreur,
 * qui entre ensuite dans le parcours habituel — dépôt, offre, dossier. Un
 * raccourci qui ouvrirait un dossier sans dépôt ni offre contournerait les
 * engagements que ce parcours exige des deux côtés.
 */
export async function proposeListingAction(
  _prev: ProposalState,
  formData: FormData,
): Promise<ProposalState> {
  const actor = await getActor();
  if (!actor) return { error: "Connectez-vous pour proposer un portefeuille." };
  if (!isOriasVerified(actor)) return { error: "ORIAS non validé." };
  if (!canSell(actor)) return { error: "Réservé aux cédants." };

  const mandateId = String(formData.get("mandateId") ?? "");
  const listingId = String(formData.get("listingId") ?? "");
  const message = String(formData.get("message") ?? "").trim().slice(0, 1000) || null;
  if (!mandateId || !listingId) return { error: "Choisissez l’annonce à proposer." };
  const bloque = message ? offPlatformPhoneError(message) : null;
  if (bloque) return { error: bloque };

  const mandate = await prisma.buyerMandate.findUnique({
    where: { id: mandateId },
    select: {
      id: true,
      buyerId: true,
      isPublic: true,
      isActive: true,
      publicNumber: true,
      buyer: { select: { email: true } },
    },
  });
  if (!mandate || !mandate.isPublic || !mandate.isActive || !mandate.publicNumber) {
    return { error: "Cette demande n’est plus publiée." };
  }
  if (mandate.buyerId === actor.id) return { error: "C’est votre propre demande." };

  const listing = await prisma.listing.findUnique({
    where: { id: listingId },
    select: { id: true, status: true, publicNumber: true, portfolio: { select: { firmId: true } } },
  });
  // Même réponse que pour une annonce absente : on ne confirme pas l'existence
  // d'une annonce qui n'appartient pas au cabinet.
  if (!listing || !ownsFirm(actor, listing.portfolio.firmId)) return { error: "Annonce introuvable." };
  if (!listingAcceptsOffers(listing.status)) {
    return { error: "Cette annonce ne reçoit plus d’offres : elle ne peut pas être proposée." };
  }

  const existante = await prisma.mandateProposal.findUnique({
    where: { mandateId_listingId: { mandateId, listingId } },
    select: { id: true },
  });
  if (existante) return { error: "Cette annonce est déjà proposée sur cette demande." };

  const proposition = await prisma.mandateProposal.create({
    data: { mandateId, listingId, sellerId: actor.id, message },
    select: { id: true },
  });

  await notifyMandateProposal({
    proposalId: proposition.id,
    buyerUserId: mandate.buyerId,
    buyerEmail: mandate.buyer.email,
    mandateNumber: mandate.publicNumber,
    listingNumber: listing.publicNumber,
    sellerAlias: actor.publicAlias,
  }).catch(() => null);

  await prisma.auditLog.create({
    data: {
      actorId: actor.id,
      action: "mandate.proposal.sent",
      entityType: "BuyerMandate",
      entityId: mandate.id,
      metadata: { listingId },
    },
  });

  revalidatePath(`/annonces/demandes/${mandate.publicNumber}`);
  revalidatePath("/app");
  return { sent: true };
}
