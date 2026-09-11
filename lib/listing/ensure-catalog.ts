import { prisma } from "@/lib/prisma";
import { buildCatalogListings, CATALOG_FIRM } from "@/lib/listing/catalog-listings";

/**
 * Completes the public catalogue to ~80 fiches on first load.
 * Idempotent: if lst_catalog_01 exists, nothing is written.
 */
export async function ensurePublicCatalog(): Promise<void> {
  try {
    await ensurePublicCatalogUnsafe();
  } catch (error) {
    console.error("ensurePublicCatalog", error);
  }
}

async function ensurePublicCatalogUnsafe(): Promise<void> {
  const already = await prisma.listing.findUnique({
    where: { id: "lst_catalog_80" },
    select: { id: true },
  });
  if (already) return;

  const rows = buildCatalogListings();

  await prisma.firm.upsert({
    where: { id: CATALOG_FIRM.id },
    create: {
      id: CATALOG_FIRM.id,
      legalName: CATALOG_FIRM.legalName,
      siren: CATALOG_FIRM.siren,
      legalForm: CATALOG_FIRM.legalForm,
      address: CATALOG_FIRM.address,
      postalCode: CATALOG_FIRM.postalCode,
      city: CATALOG_FIRM.city,
      department: CATALOG_FIRM.department,
      region: CATALOG_FIRM.region,
      foundedAt: new Date(CATALOG_FIRM.foundedAt),
      headcount: CATALOG_FIRM.headcount,
      annualRevenue: CATALOG_FIRM.annualRevenue,
      distributionMode: "REMOTE",
      complianceScore: CATALOG_FIRM.complianceScore,
    },
    update: {},
  });

  const chunk = 8;
  for (let i = 0; i < rows.length; i += chunk) {
    const batch = rows.slice(i, i + chunk);
    await prisma.portfolio.createMany({
      data: batch.map((row) => ({
        id: row.portfolioId,
        firmId: row.firmId,
        label: row.label,
        contractCount: row.contractCount,
        clientCount: row.clientCount,
        annualCommissions: row.annualCommissions,
        averageAgeMonths: row.averageAgeMonths,
        churnRate12m: row.churnRate12m,
        importedAt: new Date(row.publishedAt),
      })),
    });
    await prisma.contractLine.createMany({
      data: batch.flatMap((row) =>
        row.lines.map((line) => ({
          id: line.id,
          portfolioId: row.portfolioId,
          carrier: line.carrier,
          riskType: line.riskType,
          premium: line.premium,
          commissionRate: line.commissionRate,
          annualCommission: line.annualCommission,
          effectiveDate: new Date(line.effectiveDate),
          renewalDate: new Date(line.renewalDate),
          clientSegment: line.clientSegment,
          postalCode: line.postalCode,
          commissionType: line.commissionType,
          clientKey: line.clientKey,
          department: line.department,
        })),
      ),
    });
    await prisma.listing.createMany({
      data: batch.map((row) => ({
        id: row.listingId,
        portfolioId: row.portfolioId,
        askingPrice: row.askingPrice,
        displayedZone: row.displayedZone,
        status: "OFFERS_OPEN",
        isPartial: row.isPartial,
        publishedAt: new Date(row.publishedAt),
        offerWindowClosesAt: new Date(row.offerWindowClosesAt),
        publicNumber: row.publicNumber,
        sellerSupportMonths: row.sellerSupportMonths,
        departments: JSON.parse(row.departmentsJson) as string[],
        regions: JSON.parse(row.regionsJson) as string[],
        isNationwide: row.isNationwide,
        createdAt: new Date(row.publishedAt),
        certificationStatus: row.certificationStatus,
      })),
    });
  }
}
