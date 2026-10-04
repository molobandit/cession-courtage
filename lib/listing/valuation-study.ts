import "server-only";
import { CommissionType } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { computePortfolioValuation } from "@/lib/valuation/run";
import { studyFromLines, studyZone, type ValuationStudy } from "@/lib/listing/valuation-study-model";

export type { ValuationStudy } from "@/lib/listing/valuation-study-model";
export { studyFromLines, studyHeadline, studyKeyPoints, studyZone, roundedRange } from "@/lib/listing/valuation-study-model";

export async function loadValuationStudy(input: {
  portfolioId: string;
  listingId?: string | null;
}): Promise<ValuationStudy | null> {
  const portfolio = await prisma.portfolio.findUnique({
    where: { id: input.portfolioId },
    select: {
      id: true,
      importedAt: true,
      contractLines: {
        select: {
          id: true,
          carrier: true,
          riskType: true,
          clientSegment: true,
          department: true,
          clientKey: true,
          annualCommission: true,
          renewalDate: true,
          effectiveDate: true,
          commissionType: true,
        },
      },
    },
  });
  if (!portfolio) return null;

  const listing = input.listingId
    ? await prisma.listing.findFirst({
        where: { id: input.listingId, portfolioId: portfolio.id },
        select: {
          id: true,
          publicNumber: true,
          displayedZone: true,
          isNationwide: true,
          isPartial: true,
          precompte: true,
          lines: { select: { contractLineId: true } },
        },
      })
    : null;

  let rows = portfolio.contractLines.map((row) => ({
    id: row.id,
    carrier: row.carrier,
    riskType: row.riskType,
    clientSegment: row.clientSegment,
    department: row.department,
    clientKey: row.clientKey,
    annualCommission: Number(row.annualCommission),
    renewalDate: row.renewalDate,
    effectiveDate: row.effectiveDate,
    commissionType: row.commissionType,
  }));
  if (listing?.isPartial && listing.lines.length > 0) {
    const keep = new Set(listing.lines.map((l) => l.contractLineId));
    rows = rows.filter((r) => keep.has(r.id));
  }

  /*
   * L'étude enregistrée si elle existe, sinon le même calcul, en lecture seule.
   *
   * Cette fonction sert un PDF que n'importe quel acquéreur peut ouvrir : une
   * consultation ne doit pas écrire de valorisation en base, ni en écrire une
   * par visiteur.
   */
  const enregistree = await prisma.valuation.findFirst({
    where: { portfolioId: portfolio.id, listingId: listing?.id ?? null },
    orderBy: { computedAt: "desc" },
    select: { lowValue: true, midValue: true, highValue: true },
  });
  const valuation =
    enregistree ??
    (await computePortfolioValuation(portfolio.id, listing?.id ?? null).catch((error) => {
      console.error("loadValuationStudy", error);
      return null;
    }));
  if (!valuation) return null;

  return studyFromLines({
    lines: rows.map((row) => ({
      ...row,
      commissionType: row.commissionType ?? CommissionType.LINEAR,
    })),
    publicNumber: listing?.publicNumber ?? null,
    issuedAt: new Date(),
    dataCutoff: portfolio.importedAt,
    zone: studyZone({
      isNationwide: listing?.isNationwide,
      displayedZone: listing?.displayedZone,
      departments: rows.map((r) => r.department),
    }),
    listingPrecompte: listing?.precompte ?? null,
    lowValue: Number(valuation.lowValue),
    midValue: Number(valuation.midValue),
    highValue: Number(valuation.highValue),
  });
}
