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
import { ASKING_MAX, ASKING_MIN, OFFER_WINDOW_DAYS } from "@/lib/listing/constants";
import { nextListingPublicNumber } from "@/lib/listing/next-public-number";
import { persistListingBriefFields } from "@/lib/listing/brief-fields";
import { firstIssue, listingCreateSchema } from "@/lib/validations/actions";
import { valuePortfolio } from "@/lib/valuation/run";
import { AGREEMENTS_REQUIRED_MESSAGE, loadAgreementsStatus } from "@/lib/account/agreements-load";
import { notifyAdminsListingSubmitted } from "@/lib/listing/review";

export type ListingFormState = { error?: string };

async function requireSellerActor() {
  const actor = await getActor();
  if (!actor) throw new UnauthenticatedError();
  if (!isOriasVerified(actor)) throw new ForbiddenError("ORIAS non validé.");
  if (!canSell(actor)) throw new ForbiddenError("Réservé aux cédants.");
  return actor;
}

const LISTING_FORM_FIELDS = [
  "presentation", "cessionMotive", "portfolioKind", "branchActivity", "desiredCessionDate", "precompte",
  "precompteAmount", "transferVehicle", "oriasCategories", "distribution", "distanceShare", "employeeCount",
  "softwareStack", "introducersCount", "rcProInsurer", "pendingLitigation", "socialCommitments", "complianceDema",
  "ddaTraining", "amlProcedure", "sellerDependency", "premisesStatus", "exclusiveMandates", "stornoShare",
] as const;

/** Lecture commune à la création et à la modification : mêmes règles, mêmes messages. */
function parseListingForm(formData: FormData) {
  const texte: Record<string, FormDataEntryValue> = {};
  for (const champ of LISTING_FORM_FIELDS) texte[champ] = formData.get(champ) ?? "";
  return listingCreateSchema.safeParse({
    ...texte,
    portfolioId: formData.get("portfolioId"),
    sellerSupportMonths: formData.get("sellerSupportMonths") ?? 0,
    negotiable: formData.get("negotiable") ?? "yes",
    certificationRequested: formData.get("certificationRequested"),
    commissionsYear1: formData.get("commissionsYear1"),
    commissionsYear2: formData.get("commissionsYear2"),
    commissionsYear3: formData.get("commissionsYear3"),
    managedAnnualPremium: formData.get("managedAnnualPremium"),
    recurrentSharePercent: formData.get("recurrentSharePercent"),
  });
}

type ListingFormData = Extract<ReturnType<typeof parseListingForm>, { success: true }>["data"];

function supportMonths(data: ListingFormData): number {
  const support = data.sellerSupportMonths;
  return support >= 6 ? 6 : support >= 3 ? 3 : 0;
}

async function saveFinancials(portfolioId: string, data: ListingFormData) {
  await prisma.portfolio.update({
    where: { id: portfolioId },
    data: {
      commissionsYear1: data.commissionsYear1 != null ? data.commissionsYear1.toFixed(2) : undefined,
      commissionsYear2: data.commissionsYear2 != null ? data.commissionsYear2.toFixed(2) : undefined,
      commissionsYear3: data.commissionsYear3 != null ? data.commissionsYear3.toFixed(2) : undefined,
      managedAnnualPremium: data.managedAnnualPremium != null ? data.managedAnnualPremium.toFixed(2) : undefined,
      recurrentCommissionShare:
        data.recurrentSharePercent != null ? (data.recurrentSharePercent / 100).toFixed(4) : undefined,
    },
  });
}

async function saveBrief(listingId: string, data: ListingFormData) {
  await persistListingBriefFields(listingId, {
    presentation: data.presentation,
    cessionMotive: data.cessionMotive,
    negotiable: data.negotiable,
    certificationRequested: data.certificationRequested,
    portfolioKind: data.portfolioKind,
    branchActivity: data.branchActivity,
    desiredCessionDate: data.desiredCessionDate,
    precompte: data.precompte,
    precompteAmount: data.precompteAmount,
    regulatory: {
      transferVehicle: data.transferVehicle ?? null,
      oriasCategories: data.oriasCategories ?? null,
      distribution: data.distribution ?? null,
      distanceShare: data.distanceShare ?? null,
      employeeCount: data.employeeCount ?? null,
      softwareStack: data.softwareStack ?? null,
      introducersCount: data.introducersCount ?? null,
      rcProInsurer: data.rcProInsurer ?? null,
      pendingLitigation: data.pendingLitigation ?? null,
      socialCommitments: data.socialCommitments ?? null,
      complianceDema: data.complianceDema ?? null,
      ddaTraining: data.ddaTraining ?? null,
      amlProcedure: data.amlProcedure ?? null,
      sellerDependency: data.sellerDependency ?? null,
      premisesStatus: data.premisesStatus ?? null,
      exclusiveMandates: data.exclusiveMandates ?? null,
      stornoShare: data.stornoShare ?? null,
    },
  });
}

/**
 * Prix de travail d'un brouillon. Le cédant ne fixe pas le prix : l'équipe le
 * détermine à la relecture. En attendant, la colonne (obligatoire) porte le
 * point médian de l'étude, que l'équipe voit comme proposition.
 */
async function provisionalPrice(portfolioId: string, annualCommissions: number): Promise<number> {
  const etude = await prisma.valuation.findFirst({
    where: { portfolioId },
    orderBy: { computedAt: "desc" },
    select: { midValue: true },
  });
  const milieu = etude ? Number(etude.midValue) : annualCommissions * 2.5;
  return Math.min(ASKING_MAX, Math.max(ASKING_MIN, Math.round(milieu)));
}

export async function createListingAction(
  _prev: ListingFormState,
  formData: FormData,
): Promise<ListingFormState> {
  let destination: string | null = null;
  try {
    const actor = await requireSellerActor();
    const parsed = parseListingForm(formData);
    if (!parsed.success) return { error: firstIssue(parsed.error) };
    const { portfolioId } = parsed.data;
    const portfolio = await getMyPortfolio(portfolioId, actor);
    const asking = await provisionalPrice(portfolio.id, Number(portfolio.annualCommissions));

    const lines = await prisma.contractLine.findMany({
      where: { portfolioId: portfolio.id },
      select: { department: true },
    });
    const departments = [...new Set(lines.map((l) => l.department))];
    const zone = displayedZoneFor(departments);

    await saveFinancials(portfolio.id, parsed.data);

    const listing = await prisma.listing.create({
      data: {
        portfolioId: portfolio.id,
        askingPrice: asking.toFixed(2),
        displayedZone: zone.displayedZone,
        status: ListingStatus.DRAFT,
        sellerSupportMonths: supportMonths(parsed.data),
        publicNumber: await nextListingPublicNumber(),
        departments,
        regions: zone.regionCodes,
        isNationwide: zone.isNationwide,
      },
    });
    await valuePortfolio(portfolio.id, listing.id);
    await saveBrief(listing.id, parsed.data);
    destination = `/app/annonces/${listing.id}`;
  } catch (error) {
    return { error: error instanceof Error ? error.message : "Création impossible." };
  }
  if (destination) redirect(destination);
  return { error: "Création impossible." };
}

/**
 * Correction d'une annonce en brouillon, notamment après un renvoi de
 * l'équipe. Une annonce en relecture ou en ligne ne se modifie pas : ce que
 * les acquéreurs ont lu doit rester ce qui a été relu.
 */
export async function updateListingAction(
  _prev: ListingFormState,
  formData: FormData,
): Promise<ListingFormState> {
  let destination: string | null = null;
  try {
    const actor = await requireSellerActor();
    const listing = await findMyListing(String(formData.get("listingId") ?? ""), actor);
    if (!listing) return { error: "Annonce introuvable." };
    if (listing.status !== ListingStatus.DRAFT && listing.status !== ListingStatus.WITHDRAWN) {
      return { error: "Seule une annonce en brouillon se modifie. Retirez-la d’abord si elle est en ligne." };
    }
    formData.set("portfolioId", listing.portfolioId);
    const parsed = parseListingForm(formData);
    if (!parsed.success) return { error: firstIssue(parsed.error) };

    await saveFinancials(listing.portfolioId, parsed.data);
    await prisma.listing.update({
      where: { id: listing.id },
      data: { sellerSupportMonths: supportMonths(parsed.data) },
    });
    if (listing.sellerSupportMonths !== supportMonths(parsed.data)) {
      await valuePortfolio(listing.portfolioId, listing.id);
    }
    await saveBrief(listing.id, parsed.data);
    revalidatePath(`/app/annonces/${listing.id}`);
    destination = `/app/annonces/${listing.id}?modifiee=1`;
  } catch (error) {
    return { error: error instanceof Error ? error.message : "Modification impossible." };
  }
  if (destination) redirect(destination);
  return { error: "Modification impossible." };
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
      return { error: "Ce dossier ne peut plus être soumis ainsi." };
    }
    const engagements = await loadAgreementsStatus(actor);
    if (!engagements.valid) return { error: AGREEMENTS_REQUIRED_MESSAGE };

    /*
     * Le cédant soumet son dossier ; il ne publie pas. L'équipe réalise
     * l'étude, fixe le prix et met l'annonce en ligne. Le cédant est prévenu
     * dès la décision.
     */
    await prisma.listing.update({
      where: { id: listing.id },
      data: { status: ListingStatus.PENDING_REVIEW, submittedForReviewAt: new Date(), reviewNote: null },
    });
    await notifyAdminsListingSubmitted(listing.id, listing.publicNumber).catch((e: unknown) => console.error("notifyAdminsListingSubmitted", e));
    revalidatePath(`/app/annonces/${listing.id}`);
    revalidatePath("/admin/annonces");
    return {};
  } catch (error) {
    return { error: error instanceof Error ? error.message : "Envoi impossible." };
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
    if (listing.status !== ListingStatus.PUBLISHED) {
      return { error: "L’annonce doit d’abord être mise en ligne par l’équipe." };
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
