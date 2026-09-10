import "server-only";
import { prisma } from "@/lib/prisma";

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
};

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
  },
): Promise<void> {
  try {
    await prisma.$executeRawUnsafe(
      `UPDATE Listing SET
        presentation = ?,
        cessionMotive = ?,
        negotiable = ?,
        certificationRequested = ?,
        portfolioKind = ?,
        branchActivity = ?,
        desiredCessionDate = ?,
        precompte = ?,
        precompteAmount = ?
      WHERE id = ?`,
      fields.presentation || null,
      fields.cessionMotive || null,
      fields.negotiable ? 1 : 0,
      fields.certificationRequested ? 1 : 0,
      fields.portfolioKind || null,
      fields.branchActivity || null,
      fields.desiredCessionDate || null,
      fields.precompte == null ? null : fields.precompte ? 1 : 0,
      fields.precompteAmount || null,
      listingId,
    );
    if (fields.certificationRequested) {
      await prisma.$executeRawUnsafe(
        `UPDATE Listing SET certificationStatus = 'PENDING'
         WHERE id = ? AND certificationStatus = 'NONE'`,
        listingId,
      );
    }
  } catch (error) {
    console.error("persistListingBriefFields", error);
  }
}

export async function loadListingBriefFields(listingId: string): Promise<ListingBriefFields> {
  try {
    const rows = await prisma.$queryRawUnsafe<
      Array<{
        presentation: string | null;
        cessionMotive: string | null;
        negotiable: number | null;
        certificationRequested: number | null;
        portfolioKind: string | null;
        branchActivity: string | null;
        desiredCessionDate: string | null;
        precompte: number | null;
        precompteAmount: string | null;
      }>
    >(
      `SELECT presentation, cessionMotive, negotiable, certificationRequested,
              portfolioKind, branchActivity, desiredCessionDate, precompte, precompteAmount
       FROM Listing WHERE id = ?`,
      listingId,
    );
    const row = rows[0];
    if (!row) return EMPTY;
    return {
      presentation: row.presentation,
      cessionMotive: row.cessionMotive,
      negotiable: row.negotiable !== 0,
      certificationRequested: row.certificationRequested === 1,
      portfolioKind: row.portfolioKind,
      branchActivity: row.branchActivity,
      desiredCessionDate: row.desiredCessionDate,
      precompte: row.precompte == null ? null : row.precompte === 1,
      precompteAmount: row.precompteAmount,
    };
  } catch (error) {
    console.error("loadListingBriefFields", error);
    return EMPTY;
  }
}
