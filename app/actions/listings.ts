"use server";

import { ListingStatus } from "@prisma/client";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { canSell, getActor, getMyPortfolio, isOriasVerified } from "@/lib/authz";
import { findMyListing } from "@/lib/authz/listings";
import { ForbiddenError, UnauthenticatedError } from "@/lib/authz/errors";
import { displayedZoneFor } from "@/lib/geo";
import { rematchListing } from "@/lib/matching/run";
import { prisma } from "@/lib/prisma";
import { parseFrenchNumber } from "@/lib/import/values";
import { ASKING_MAX, ASKING_MIN, OFFER_WINDOW_DAYS } from "@/lib/listing/constants";
import { valuePortfolio } from "@/lib/valuation/run";

export type ListingFormState = { error?: string };

async function requireSellerActor() {
  const actor = await getActor();
  if (!actor) throw new UnauthenticatedError();
  if (!isOriasVerified(actor)) throw new ForbiddenError("ORIAS non validé.");
  if (!canSell(actor)) throw new ForbiddenError("Réservé aux cédants.");
  return actor;
}

function parseAsking(raw: string): number | null {
  const n = parseFrenchNumber(raw);
  if (n == null) return null;
  const rounded = Math.round(n);
  if (rounded < ASKING_MIN || rounded > ASKING_MAX) return null;
  return rounded;
}

export async function createListingAction(
  _prev: ListingFormState,
  formData: FormData,
): Promise<ListingFormState> {
  let destination: string | null = null;
  try {
    const actor = await requireSellerActor();
    const portfolioId = String(formData.get("portfolioId") ?? "");
    const portfolio = await getMyPortfolio(portfolioId, actor);
    const asking = parseAsking(String(formData.get("askingPrice") ?? ""));
    if (asking == null) {
      return { error: `Le prix demandé doit être compris entre ${ASKING_MIN.toLocaleString("fr-FR")} et ${ASKING_MAX.toLocaleString("fr-FR")} €.` };
    }
    const support = Number(formData.get("sellerSupportMonths") ?? 0);
    const sellerSupportMonths = support >= 6 ? 6 : support >= 3 ? 3 : 0;

    const lines = await prisma.contractLine.findMany({
      where: { portfolioId: portfolio.id },
      select: { department: true },
    });
    const departments = [...new Set(lines.map((l) => l.department))];
    const zone = displayedZoneFor(departments);

    const listing = await prisma.listing.create({
      data: {
        portfolioId: portfolio.id,
        askingPrice: asking.toFixed(2),
        displayedZone: zone.displayedZone,
        status: ListingStatus.DRAFT,
        sellerSupportMonths,
        departments,
        regions: zone.regionCodes,
        isNationwide: zone.isNationwide,
      },
    });
    await valuePortfolio(portfolio.id, listing.id);
    destination = `/app/annonces/${listing.id}`;
  } catch (error) {
    return { error: error instanceof Error ? error.message : "Création impossible." };
  }
  if (destination) redirect(destination);
  return { error: "Création impossible." };
}

export async function publishListingAction(
  _prev: ListingFormState,
  formData: FormData,
): Promise<ListingFormState> {
  try {
    const actor = await requireSellerActor();
    const listing = await findMyListing(String(formData.get("listingId") ?? ""), actor);
    if (!listing) return { error: "Annonce introuvable." };
    if (listing.status !== ListingStatus.DRAFT && listing.status !== ListingStatus.WITHDRAWN) {
      return { error: "Cette annonce ne peut plus être publiée ainsi." };
    }
    await prisma.listing.update({
      where: { id: listing.id },
      data: { status: ListingStatus.PUBLISHED, publishedAt: listing.publishedAt ?? new Date() },
    });
    await rematchListing(listing.id);
    revalidatePath(`/app/annonces/${listing.id}`);
    revalidatePath("/annonces");
    return {};
  } catch (error) {
    return { error: error instanceof Error ? error.message : "Publication impossible." };
  }
}

export async function openOfferWindowAction(
  _prev: ListingFormState,
  formData: FormData,
): Promise<ListingFormState> {
  try {
    const actor = await requireSellerActor();
    const listing = await findMyListing(String(formData.get("listingId") ?? ""), actor);
    if (!listing) return { error: "Annonce introuvable." };
    if (listing.status !== ListingStatus.PUBLISHED && listing.status !== ListingStatus.DRAFT) {
      return { error: "La fenêtre d'offres ne peut pas être ouverte." };
    }
    const closes = new Date(Date.now() + OFFER_WINDOW_DAYS * 24 * 60 * 60 * 1000);
    await prisma.listing.update({
      where: { id: listing.id },
      data: {
        status: ListingStatus.OFFERS_OPEN,
        publishedAt: listing.publishedAt ?? new Date(),
        offerWindowClosesAt: closes,
      },
    });
    await rematchListing(listing.id);
    revalidatePath(`/app/annonces/${listing.id}`);
    revalidatePath("/annonces");
    return {};
  } catch (error) {
    return { error: error instanceof Error ? error.message : "Ouverture impossible." };
  }
}

export async function withdrawListingAction(
  _prev: ListingFormState,
  formData: FormData,
): Promise<ListingFormState> {
  try {
    const actor = await requireSellerActor();
    const listing = await findMyListing(String(formData.get("listingId") ?? ""), actor);
    if (!listing) return { error: "Annonce introuvable." };
    if (listing.status === ListingStatus.SOLD || listing.status === ListingStatus.UNDER_NEGOTIATION) {
      return { error: "Un dossier est déjà en cours." };
    }
    await prisma.listing.update({
      where: { id: listing.id },
      data: { status: ListingStatus.WITHDRAWN },
    });
    revalidatePath(`/app/annonces/${listing.id}`);
    revalidatePath("/annonces");
    return {};
  } catch (error) {
    return { error: error instanceof Error ? error.message : "Retrait impossible." };
  }
}
