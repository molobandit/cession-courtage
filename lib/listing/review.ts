import "server-only";
import { ListingStatus } from "@prisma/client";
import { OFFER_WINDOW_DAYS } from "@/lib/listing/constants";
import { rematchListing } from "@/lib/matching/run";
import { notifyPositionEvent } from "@/lib/notify/transactional";
import { prisma } from "@/lib/prisma";

/**
 * Relecture des annonces avant publication.
 *
 * Mise en vente gratuite, publication après relecture : l'annonce qui arrive
 * en salle est sincère, anonyme et complète. La décision part aussitôt au
 * cédant ; acceptée, la séance d'offres de vingt et un jours s'ouvre.
 */

export async function notifyAdminsListingSubmitted(listingId: string, publicNumber: number) {
  const admins = await prisma.user.findMany({ where: { role: "ADMIN", erasedAt: null }, select: { id: true, email: true } });
  for (const a of admins) {
    await notifyPositionEvent({
      key: `listing-submitted:${listingId}:${Date.now()}`,
      userId: a.id,
      email: a.email,
      title: `Annonce à relire · dossier n° ${publicNumber}`,
      body: "Un cédant a soumis son annonce. Relisez-la avant publication.",
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

export async function approveListing(listingId: string, adminId: string) {
  const c = await cedantDe(listingId);
  if (!c || c.listing.status !== ListingStatus.PENDING_REVIEW) throw new Error("Cette annonce n’est pas en attente de relecture.");
  const maintenant = new Date();
  await prisma.listing.update({
    where: { id: listingId },
    data: {
      status: ListingStatus.OFFERS_OPEN,
      publishedAt: maintenant,
      offerWindowClosesAt: new Date(maintenant.getTime() + OFFER_WINDOW_DAYS * 24 * 60 * 60 * 1000),
      reviewedAt: maintenant,
      reviewNote: null,
    },
  });
  await prisma.auditLog.create({ data: { actorId: adminId, action: "listing.review.approved", entityType: "Listing", entityId: listingId } });
  await rematchListing(listingId).catch((e: unknown) => console.error("rematchListing", e));
  if (c.cedant) {
    await notifyPositionEvent({
      key: `listing-approved:${listingId}:${maintenant.getTime()}`,
      userId: c.cedant.id,
      email: c.cedant.email,
      title: `Annonce en ligne · dossier n° ${c.listing.publicNumber}`,
      body: `Votre annonce est publiée : la séance d’offres est ouverte pour ${OFFER_WINDOW_DAYS} jours.`,
      href: `/app/annonces/${listingId}`,
    }).catch((e: unknown) => console.error("notify", e));
  }
}

export async function rejectListing(listingId: string, adminId: string, note: string) {
  const c = await cedantDe(listingId);
  if (!c || c.listing.status !== ListingStatus.PENDING_REVIEW) throw new Error("Cette annonce n’est pas en attente de relecture.");
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
      title: `Annonce à corriger · dossier n° ${c.listing.publicNumber}`,
      body: `Motif : ${note}. Corrigez l’annonce puis soumettez-la de nouveau.`,
      href: `/app/annonces/${listingId}`,
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
