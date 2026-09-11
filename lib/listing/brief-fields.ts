import "server-only";
import { prisma } from "@/lib/prisma";

export type RegulatoryBrief = {
  transferVehicle: string | null;
  oriasCategories: string | null;
  distribution: string | null;
  distanceShare: string | null;
  employeeCount: string | null;
  softwareStack: string | null;
  introducersCount: string | null;
  rcProInsurer: string | null;
  pendingLitigation: string | null;
  socialCommitments: string | null;
  complianceDema: string | null;
  ddaTraining: string | null;
  amlProcedure: string | null;
  sellerDependency: string | null;
  premisesStatus: string | null;
  exclusiveMandates: string | null;
  stornoShare: string | null;
};

export type ListingBriefFields = {
  presentation: string | null;
  cessionMotive: string | null;
  negotiable: boolean;
  certificationRequested: boolean;
  portfolioKind: string | null;
  branchActivity: string | null;
  desiredCessionDate: string | null;
  precompte: boolean | null;
  precompteAmount: string | null;
  regulatory: RegulatoryBrief;
};

const EMPTY_REG: RegulatoryBrief = {
  transferVehicle: null,
  oriasCategories: null,
  distribution: null,
  distanceShare: null,
  employeeCount: null,
  softwareStack: null,
  introducersCount: null,
  rcProInsurer: null,
  pendingLitigation: null,
  socialCommitments: null,
  complianceDema: null,
  ddaTraining: null,
  amlProcedure: null,
  sellerDependency: null,
  premisesStatus: null,
  exclusiveMandates: null,
  stornoShare: null,
};

const EMPTY: ListingBriefFields = {
  presentation: null,
  cessionMotive: null,
  negotiable: true,
  certificationRequested: false,
  portfolioKind: null,
  branchActivity: null,
  desiredCessionDate: null,
  precompte: null,
  precompteAmount: null,
  regulatory: EMPTY_REG,
};

function parseRegulatory(raw: string | null | undefined): RegulatoryBrief {
  if (!raw) return { ...EMPTY_REG };
  try {
    const parsed = JSON.parse(raw) as Partial<RegulatoryBrief>;
    return { ...EMPTY_REG, ...parsed };
  } catch {
    return { ...EMPTY_REG };
  }
}

export async function persistListingBriefFields(
  listingId: string,
  fields: {
    presentation?: string;
    cessionMotive?: string;
    negotiable: boolean;
    certificationRequested: boolean;
    portfolioKind?: string;
    branchActivity?: string;
    desiredCessionDate?: string;
    precompte?: boolean | null;
    precompteAmount?: string;
    regulatory?: RegulatoryBrief;
  },
): Promise<void> {
  try {
    await prisma.listing.update({
      where: { id: listingId },
      data: {
        presentation: fields.presentation || null,
        cessionMotive: fields.cessionMotive || null,
        negotiable: fields.negotiable,
        certificationRequested: fields.certificationRequested,
        portfolioKind: fields.portfolioKind || null,
        branchActivity: fields.branchActivity || null,
        desiredCessionDate: fields.desiredCessionDate || null,
        precompte: fields.precompte ?? null,
        precompteAmount: fields.precompteAmount || null,
        regulatoryJson: fields.regulatory ? JSON.stringify(fields.regulatory) : null,
      },
    });
    if (fields.certificationRequested) {
      await prisma.listing.updateMany({
        where: { id: listingId, certificationStatus: "NONE" },
        data: { certificationStatus: "PENDING" },
      });
    }
  } catch (error) {
    console.error("persistListingBriefFields", error);
  }
}

export async function loadListingBriefFields(listingId: string): Promise<ListingBriefFields> {
  try {
    const row = await prisma.listing.findUnique({
      where: { id: listingId },
      select: {
        presentation: true,
        cessionMotive: true,
        negotiable: true,
        certificationRequested: true,
        portfolioKind: true,
        branchActivity: true,
        desiredCessionDate: true,
        precompte: true,
        precompteAmount: true,
        regulatoryJson: true,
      },
    });
    if (!row) return EMPTY;
    return {
      presentation: row.presentation,
      cessionMotive: row.cessionMotive,
      negotiable: row.negotiable,
      certificationRequested: row.certificationRequested,
      portfolioKind: row.portfolioKind,
      branchActivity: row.branchActivity,
      desiredCessionDate: row.desiredCessionDate,
      precompte: row.precompte,
      precompteAmount: row.precompteAmount,
      regulatory: parseRegulatory(row.regulatoryJson),
    };
  } catch (error) {
    console.error("loadListingBriefFields", error);
    return EMPTY;
  }
}
