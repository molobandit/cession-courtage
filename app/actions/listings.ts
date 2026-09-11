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
import { OFFER_WINDOW_DAYS } from "@/lib/listing/constants";
import { nextListingPublicNumber } from "@/lib/listing/next-public-number";
import { persistListingBriefFields } from "@/lib/listing/brief-fields";
import { firstIssue, listingCreateSchema } from "@/lib/validations/actions";
import { valuePortfolio } from "@/lib/valuation/run";

export type ListingFormState = { error?: string };

async function requireSellerActor() {
  const actor = await getActor();
  if (!actor) throw new UnauthenticatedError();
  if (!isOriasVerified(actor)) throw new ForbiddenError("ORIAS non validé.");
  if (!canSell(actor)) throw new ForbiddenError("Réservé aux cédants.");
  return actor;
}

export async function createListingAction(
  _prev: ListingFormState,
  formData: FormData,
): Promise<ListingFormState> {
  let destination: string | null = null;
  try {
    const actor = await requireSellerActor();
    const parsed = listingCreateSchema.safeParse({
      portfolioId: formData.get("portfolioId"),
      askingPrice: formData.get("askingPrice"),
      sellerSupportMonths: formData.get("sellerSupportMonths") ?? 0,
      presentation: formData.get("presentation") ?? "",
      cessionMotive: formData.get("cessionMotive") ?? "",
      negotiable: formData.get("negotiable") ?? "yes",
      certificationRequested: formData.get("certificationRequested"),
      portfolioKind: formData.get("portfolioKind") ?? "",
      branchActivity: formData.get("branchActivity") ?? "",
      desiredCessionDate: formData.get("desiredCessionDate") ?? "",
      precompte: formData.get("precompte") ?? "",
      precompteAmount: formData.get("precompteAmount") ?? "",
      transferVehicle: formData.get("transferVehicle") ?? "",
      oriasCategories: formData.get("oriasCategories") ?? "",
      distribution: formData.get("distribution") ?? "",
      distanceShare: formData.get("distanceShare") ?? "",
      employeeCount: formData.get("employeeCount") ?? "",
      softwareStack: formData.get("softwareStack") ?? "",
      introducersCount: formData.get("introducersCount") ?? "",
      rcProInsurer: formData.get("rcProInsurer") ?? "",
      pendingLitigation: formData.get("pendingLitigation") ?? "",
      socialCommitments: formData.get("socialCommitments") ?? "",
      complianceDema: formData.get("complianceDema") ?? "",
      ddaTraining: formData.get("ddaTraining") ?? "",
      amlProcedure: formData.get("amlProcedure") ?? "",
      sellerDependency: formData.get("sellerDependency") ?? "",
      premisesStatus: formData.get("premisesStatus") ?? "",
      exclusiveMandates: formData.get("exclusiveMandates") ?? "",
      stornoShare: formData.get("stornoShare") ?? "",
      commissionsYear1: formData.get("commissionsYear1"),
      commissionsYear2: formData.get("commissionsYear2"),
      commissionsYear3: formData.get("commissionsYear3"),
      managedAnnualPremium: formData.get("managedAnnualPremium"),
      recurrentSharePercent: formData.get("recurrentSharePercent"),
    });
    if (!parsed.success) return { error: firstIssue(parsed.error) };
    const { portfolioId, askingPrice: asking } = parsed.data;
    const portfolio = await getMyPortfolio(portfolioId, actor);
    const support = parsed.data.sellerSupportMonths;
    const sellerSupportMonths = support >= 6 ? 6 : support >= 3 ? 3 : 0;

    const lines = await prisma.contractLine.findMany({
      where: { portfolioId: portfolio.id },
      select: { department: true },
    });
    const departments = [...new Set(lines.map((l) => l.department))];
    const zone = displayedZoneFor(departments);

    await prisma.portfolio.update({
      where: { id: portfolio.id },
      data: {
        commissionsYear1:
          parsed.data.commissionsYear1 != null ? parsed.data.commissionsYear1.toFixed(2) : undefined,
        commissionsYear2:
          parsed.data.commissionsYear2 != null ? parsed.data.commissionsYear2.toFixed(2) : undefined,
        commissionsYear3:
          parsed.data.commissionsYear3 != null ? parsed.data.commissionsYear3.toFixed(2) : undefined,
        managedAnnualPremium:
          parsed.data.managedAnnualPremium != null
            ? parsed.data.managedAnnualPremium.toFixed(2)
            : undefined,
        recurrentCommissionShare:
          parsed.data.recurrentSharePercent != null
            ? (parsed.data.recurrentSharePercent / 100).toFixed(4)
            : undefined,
      },
    });

    const listing = await prisma.listing.create({
      data: {
        portfolioId: portfolio.id,
        askingPrice: asking.toFixed(2),
        displayedZone: zone.displayedZone,
        status: ListingStatus.DRAFT,
        sellerSupportMonths,
        publicNumber: await nextListingPublicNumber(),
        departments,
        regions: zone.regionCodes,
        isNationwide: zone.isNationwide,
      },
    });
    await valuePortfolio(portfolio.id, listing.id);
    await persistListingBriefFields(listing.id, {
      presentation: parsed.data.presentation,
      cessionMotive: parsed.data.cessionMotive,
      negotiable: parsed.data.negotiable,
      certificationRequested: parsed.data.certificationRequested,
      portfolioKind: parsed.data.portfolioKind,
      branchActivity: parsed.data.branchActivity,
      desiredCessionDate: parsed.data.desiredCessionDate,
      precompte: parsed.data.precompte,
      precompteAmount: parsed.data.precompteAmount,
      regulatory: {
        transferVehicle: parsed.data.transferVehicle ?? null,
        oriasCategories: parsed.data.oriasCategories ?? null,
        distribution: parsed.data.distribution ?? null,
        distanceShare: parsed.data.distanceShare ?? null,
        employeeCount: parsed.data.employeeCount ?? null,
        softwareStack: parsed.data.softwareStack ?? null,
        introducersCount: parsed.data.introducersCount ?? null,
        rcProInsurer: parsed.data.rcProInsurer ?? null,
        pendingLitigation: parsed.data.pendingLitigation ?? null,
        socialCommitments: parsed.data.socialCommitments ?? null,
        complianceDema: parsed.data.complianceDema ?? null,
        ddaTraining: parsed.data.ddaTraining ?? null,
        amlProcedure: parsed.data.amlProcedure ?? null,
        sellerDependency: parsed.data.sellerDependency ?? null,
        premisesStatus: parsed.data.premisesStatus ?? null,
        exclusiveMandates: parsed.data.exclusiveMandates ?? null,
        stornoShare: parsed.data.stornoShare ?? null,
      },
    });
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
