import { RiskType } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { buildChecklist } from "@/lib/deal/due-diligence";

/** Crée le bordereau si le dossier n’en a pas encore (rejouable). */
export async function ensureDealChecklist(dealId: string): Promise<void> {
  const existing = await prisma.dueDiligenceItem.count({ where: { dealId } });
  if (existing > 0) return;

  const deal = await prisma.deal.findUnique({
    where: { id: dealId },
    select: { listing: { select: { portfolioId: true } } },
  });
  const portfolioId = deal?.listing.portfolioId;
  if (!portfolioId) return;

  const lines = await prisma.contractLine.findMany({
    where: { portfolioId },
    select: { carrier: true, riskType: true },
  });
  const carriers = [...new Set(lines.map((line) => line.carrier))].sort();
  const hasDecennial = lines.some((line) => line.riskType === RiskType.DECENNIAL);
  const entries = buildChecklist(carriers, hasDecennial);

  for (const entry of entries) {
    await prisma.dueDiligenceItem.create({
      data: {
        dealId,
        category: entry.category,
        label: entry.label,
        required: entry.required,
      },
    });
  }
}
