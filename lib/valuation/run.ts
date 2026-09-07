import "server-only";
import { Prisma, type RiskType } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { computeValuation } from "@/lib/valuation/compute";
import { DEFAULT_MULTIPLES } from "@/lib/valuation/defaults";
import { averageAgeMonths } from "@/lib/valuation/metrics";
import { ALGORITHM_VERSION, type ValuationBreakdown } from "@/lib/valuation/types";

export async function loadValuationMultiples(): Promise<Record<RiskType, number>> {
  const rows = await prisma.valuationMultiple.findMany();
  const multiples = { ...DEFAULT_MULTIPLES };
  for (const row of rows) {
    multiples[row.riskType] = Number(row.multiple);
  }
  return multiples;
}

function money(n: number): string {
  return n.toFixed(2);
}

export async function persistValuation(input: {
  portfolioId: string;
  listingId?: string | null;
  breakdown: ValuationBreakdown;
}): Promise<string> {
  const created = await prisma.valuation.create({
    data: {
      portfolioId: input.portfolioId,
      listingId: input.listingId ?? null,
      grossValue: money(input.breakdown.grossValue),
      lowValue: money(input.breakdown.lowValue),
      midValue: money(input.breakdown.midValue),
      highValue: money(input.breakdown.highValue),
      qualityScore: input.breakdown.qualityScore,
      breakdown: input.breakdown as unknown as Prisma.InputJsonValue,
      algorithmVersion: input.breakdown.algorithmVersion ?? ALGORITHM_VERSION,
    },
  });
  return created.id;
}

export async function valuePortfolio(portfolioId: string, listingId?: string | null) {
  const portfolio = await prisma.portfolio.findUnique({
    where: { id: portfolioId },
    include: {
      firm: { select: { distributionMode: true, complianceScore: true } },
      contractLines: {
        select: {
          id: true,
          carrier: true,
          riskType: true,
          annualCommission: true,
          commissionType: true,
          clientKey: true,
          effectiveDate: true,
        },
      },
    },
  });
  if (!portfolio) throw new Error("Portefeuille introuvable.");

  let lines = portfolio.contractLines;
  let sellerSupportMonths = 0;

  if (listingId) {
    const listing = await prisma.listing.findUnique({
      where: { id: listingId },
      include: { lines: { select: { contractLineId: true } } },
    });
    if (!listing || listing.portfolioId !== portfolioId) {
      throw new Error("Annonce introuvable pour ce portefeuille.");
    }
    sellerSupportMonths = listing.sellerSupportMonths;
    if (listing.isPartial && listing.lines.length > 0) {
      const allowed = new Set(listing.lines.map((row) => row.contractLineId));
      lines = lines.filter((line) => allowed.has(line.id));
    }
  }

  const multiples = await loadValuationMultiples();
  const age =
    listingId && lines.length > 0
      ? averageAgeMonths(lines.map((line) => line.effectiveDate))
      : portfolio.averageAgeMonths;

  const breakdown = computeValuation({
    lines: lines.map((line) => ({
      carrier: line.carrier,
      riskType: line.riskType,
      annualCommission: Number(line.annualCommission),
      commissionType: line.commissionType,
      clientKey: line.clientKey,
      effectiveDate: line.effectiveDate,
    })),
    firm: portfolio.firm,
    sellerSupportMonths,
    churnRate12m: Number(portfolio.churnRate12m),
    averageAgeMonths: age,
    multiples,
  });

  const valuationId = await persistValuation({
    portfolioId,
    listingId: listingId ?? null,
    breakdown,
  });
  return { valuationId, breakdown };
}
