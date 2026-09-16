import "server-only";
import { ListingStatus } from "@prisma/client";
import { OFFER_WINDOW_DAYS } from "@/lib/listing/constants";
import { rematchListing } from "@/lib/matching/run";
import { formatEuroWhole } from "@/lib/format/number";
import { notifyPositionEvent } from "@/lib/notify/transactional";
import { prisma } from "@/lib/prisma";

/**
 * Étude et mise en ligne des annonces.
 *
 * Le cédant soumet son dossier ; l'équipe réalise l'étude du portefeuille,
 * fixe le prix et met l'annonce en ligne. L'annonce qui arrive en salle est
 * sincère, anonyme et complète. La décision part aussitôt au cédant ;
 * acceptée, la séance d'offres de vingt et un jours s'ouvre.
 */

export async function notifyAdminsListingSubmitted(listingId: string, publicNumber: number) {
  const admins = await prisma.user.findMany({ where: { role: "ADMIN", erasedAt: null }, select: { id: true, email: true } });
  for (const a of admins) {
    await notifyPositionEvent({
      key: `listing-submitted:${listingId}:${Date.now()}`,
      userId: a.id,
      email: a.email,
      title: `Dossier à étudier · n° ${publicNumber}`,
      body: "Un cédant a soumis son dossier. Réalisez l’étude, fixez le prix, puis mettez l’annonce en ligne.",
      href: "/admin/annonces",
    });
  }
}

async function cedantDe(listingId: string) {
  const listing = await prisma.listing.findUnique({
    where: { id: listingId },
    select: { id: true, publicNumber: true, status: true, portfolio: { select: { firmId: true } } },
  });
  if (!listing) return null;
  const cedant = await prisma.user.findFirst({
    where: { firmId: listing.portfolio.firmId, role: { in: ["SELLER", "BOTH"] }, erasedAt: null },
    select: { id: true, email: true },
    orderBy: { createdAt: "asc" },
  });
  return { listing, cedant };
}

/** Mise en ligne au prix fixé par l'équipe (euros entiers, fourchette déjà contrôlée). */
export async function approveListing(listingId: string, adminId: string, price: number) {
  const c = await cedantDe(listingId);
  if (!c || c.listing.status !== ListingStatus.PENDING_REVIEW) throw new Error("Ce dossier n’est pas en attente d’étude.");
  const maintenant = new Date();
  await prisma.listing.update({
    where: { id: listingId },
    data: {
      status: ListingStatus.OFFERS_OPEN,
      askingPrice: price.toFixed(2),
      publishedAt: maintenant,
      offerWindowClosesAt: new Date(maintenant.getTime() + OFFER_WINDOW_DAYS * 24 * 60 * 60 * 1000),
      reviewedAt: maintenant,
      reviewNote: null,
    },
  });
  await prisma.auditLog.create({
    data: { actorId: adminId, action: "listing.review.approved", entityType: "Listing", entityId: listingId, metadata: { price } },
  });
  await rematchListing(listingId).catch((e: unknown) => console.error("rematchListing", e));
  if (c.cedant) {
    await notifyPositionEvent({
      key: `listing-approved:${listingId}:${maintenant.getTime()}`,
      userId: c.cedant.id,
      email: c.cedant.email,
      title: `Annonce en ligne · dossier n° ${c.listing.publicNumber}`,
      body: `Notre équipe a terminé l’étude de votre portefeuille. L’annonce est en ligne au prix de ${formatEuroWhole(price)} : la séance d’offres est ouverte pour ${OFFER_WINDOW_DAYS} jours.`,
      href: `/app/annonces/${listingId}`,
    }).catch((e: unknown) => console.error("notify", e));
  }
}

export async function rejectListing(listingId: string, adminId: string, note: string) {
  const c = await cedantDe(listingId);
  if (!c || c.listing.status !== ListingStatus.PENDING_REVIEW) throw new Error("Ce dossier n’est pas en attente d’étude.");
  await prisma.listing.update({
    where: { id: listingId },
    data: { status: ListingStatus.DRAFT, reviewedAt: new Date(), reviewNote: note },
  });
  await prisma.auditLog.create({ data: { actorId: adminId, action: "listing.review.rejected", entityType: "Listing", entityId: listingId, metadata: { note } } });
  if (c.cedant) {
    await notifyPositionEvent({
      key: `listing-rejected:${listingId}:${Date.now()}`,
      userId: c.cedant.id,
      email: c.cedant.email,
      title: `Dossier à compléter · n° ${c.listing.publicNumber}`,
      body: `Motif : ${note.replace(/[.\s]+$/, "")}. Complétez votre dossier puis soumettez-le de nouveau.`,
      href: `/app/annonces/${listingId}/modifier`,
    }).catch((e: unknown) => console.error("notify", e));
  }
}

export async function listListingsToReview() {
  return prisma.listing.findMany({
    where: { status: ListingStatus.PENDING_REVIEW },
    orderBy: { submittedForReviewAt: "asc" },
    select: {
      id: true,
      publicNumber: true,
      askingPrice: true,
      displayedZone: true,
      submittedForReviewAt: true,
      presentation: true,
      isPartial: true,
      valuations: { orderBy: { computedAt: "desc" }, take: 1, select: { lowValue: true, midValue: true, highValue: true } },
      companyDocuments: { select: { kind: true } },
      portfolio: {
        select: {
          label: true,
          annualCommissions: true,
          contractCount: true,
          firm: { select: { legalName: true, siren: true } },
        },
      },
    },
  });
}
