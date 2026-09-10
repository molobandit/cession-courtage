import { writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { buildCatalogListings, CATALOG_FIRM } from "../lib/listing/catalog-listings";

function sql(value: string | number | boolean): string {
  if (typeof value === "boolean") return value ? "1" : "0";
  if (typeof value === "number") return String(value);
  return `'${value.replaceAll("'", "''")}'`;
}

const rows = buildCatalogListings();
const lines: string[] = [
  "-- Catalogue public de demonstration (80 fiches). Idempotent.",
  "-- wrangler d1 execute cession-courtage --remote --file ./scripts/d1-catalog-listings.sql",
  "PRAGMA foreign_keys = OFF;",
  "DELETE FROM ListingLine WHERE listingId LIKE 'lst_catalog_%';",
  "DELETE FROM Valuation WHERE listingId LIKE 'lst_catalog_%';",
  "DELETE FROM Listing WHERE id LIKE 'lst_catalog_%';",
  "DELETE FROM ContractLine WHERE id LIKE 'cl_catalog_%';",
  "DELETE FROM Portfolio WHERE id LIKE 'pf_catalog_%';",
  "DELETE FROM Firm WHERE id = 'firm_catalog';",
  "PRAGMA foreign_keys = ON;",
  "",
  `INSERT INTO Firm (id, legalName, siren, legalForm, address, postalCode, city, department, region, foundedAt, headcount, annualRevenue, distributionMode, complianceScore, createdAt) VALUES (${[
    CATALOG_FIRM.id,
    CATALOG_FIRM.legalName,
    CATALOG_FIRM.siren,
    CATALOG_FIRM.legalForm,
    CATALOG_FIRM.address,
    CATALOG_FIRM.postalCode,
    CATALOG_FIRM.city,
    CATALOG_FIRM.department,
    CATALOG_FIRM.region,
    CATALOG_FIRM.foundedAt,
    CATALOG_FIRM.headcount,
    CATALOG_FIRM.annualRevenue,
    CATALOG_FIRM.distributionMode,
    CATALOG_FIRM.complianceScore,
    CATALOG_FIRM.foundedAt,
  ].map(sql).join(", ")});`,
  "",
];

for (const row of rows) {
  lines.push(
    `INSERT INTO Portfolio (id, firmId, label, contractCount, clientCount, annualCommissions, averageAgeMonths, churnRate12m, importedAt) VALUES (${[
      row.portfolioId,
      row.firmId,
      row.label,
      row.contractCount,
      row.clientCount,
      row.annualCommissions,
      row.averageAgeMonths,
      row.churnRate12m,
      row.publishedAt,
    ].map(sql).join(", ")});`,
  );

  for (const line of row.lines) {
    lines.push(
      `INSERT INTO ContractLine (id, portfolioId, carrier, riskType, premium, commissionRate, annualCommission, effectiveDate, renewalDate, clientSegment, postalCode, commissionType, clientKey, department) VALUES (${[
        line.id,
        row.portfolioId,
        line.carrier,
        line.riskType,
        line.premium,
        line.commissionRate,
        line.annualCommission,
        line.effectiveDate,
        line.renewalDate,
        line.clientSegment,
        line.postalCode,
        line.commissionType,
        line.clientKey,
        line.department,
      ].map(sql).join(", ")});`,
    );
  }

  lines.push(
    `INSERT INTO Listing (id, portfolioId, askingPrice, displayedZone, status, isPartial, publishedAt, offerWindowClosesAt, publicNumber, sellerSupportMonths, departments, regions, isNationwide, createdAt, updatedAt, certificationStatus) VALUES (${[
      row.listingId,
      row.portfolioId,
      row.askingPrice,
      row.displayedZone,
      "OFFERS_OPEN",
      row.isPartial,
      row.publishedAt,
      row.offerWindowClosesAt,
      row.publicNumber,
      row.sellerSupportMonths,
      row.departmentsJson,
      row.regionsJson,
      row.isNationwide,
      row.publishedAt,
      row.publishedAt,
      row.certificationStatus,
    ].map(sql).join(", ")});`,
  );
}

const out = join(dirname(fileURLToPath(import.meta.url)), "d1-catalog-listings.sql");
writeFileSync(out, `${lines.join("\n")}\n`);
console.info(`Wrote ${rows.length} listings to ${out}`);
