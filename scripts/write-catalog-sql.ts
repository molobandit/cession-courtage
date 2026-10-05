import { writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { buildCatalogListings, CATALOG_FIRM, CATALOG_SELLER } from "../lib/listing/catalog-listings";

function sql(value: string | number | boolean | null): string {
  if (value === null) return "NULL";
  if (typeof value === "boolean") return value ? "1" : "0";
  if (typeof value === "number") return String(value);
  return `'${value.replaceAll("'", "''")}'`;
}

const rows = buildCatalogListings();
const lines: string[] = [
  "-- Catalogue public de démonstration. Idempotent.",
  "-- wrangler d1 execute cession-courtage --remote --file ./scripts/d1-catalog-listings.sql",
  "PRAGMA foreign_keys = OFF;",
  /*
   * Ce qui pend aux annonces part avant elles.
   *
   * D1 n'a pas applique la cle etrangere lors d'un rechargement en ligne : les
   * positions des annonces supprimees ont survecu, pointant dans le vide, et
   * Prisma a refuse la requete entiere du tableau de bord. On ne compte donc
   * plus sur la cascade, on supprime dans l'ordre.
   */
  "DELETE FROM DealSignoff WHERE dealId IN (SELECT id FROM Deal WHERE listingId LIKE 'lst_catalog_%');",
  "DELETE FROM Deal WHERE listingId LIKE 'lst_catalog_%';",
  "DELETE FROM InterestDeposit WHERE listingId LIKE 'lst_catalog_%';",
  "DELETE FROM BuyerPosition WHERE listingId LIKE 'lst_catalog_%';",
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
  /*
   * Un cédant pour le catalogue. Sans lui, une offre déposée sur l'une des 80
   * fiches n'avait personne pour la retenir : le parcours d'achat s'arrêtait
   * après l'offre. Le mot de passe est celui des autres comptes de
   * démonstration, recopié depuis l'un d'eux sans jamais apparaître ici. Jamais
   * supprimé par ce script : il porte des dossiers une fois utilisé.
   */
  `INSERT OR IGNORE INTO User (id, email, passwordHash, role, oriasNumber, oriasVerifiedAt, firmId, kycStatus, publicAlias, fullName, jobTitle, phone, createdAt, updatedAt, financialCapacityStatus) SELECT ${[
    CATALOG_SELLER.id,
    CATALOG_SELLER.email,
  ].map(sql).join(", ")}, (SELECT passwordHash FROM User WHERE email = 'marie.lefort@parisienne-courtage.demo'), ${[
    "SELLER",
    CATALOG_SELLER.oriasNumber,
    CATALOG_FIRM.foundedAt,
    CATALOG_FIRM.id,
    "VERIFIED",
    CATALOG_SELLER.publicAlias,
    CATALOG_SELLER.fullName,
    CATALOG_SELLER.jobTitle,
    CATALOG_SELLER.phone,
    CATALOG_FIRM.foundedAt,
    CATALOG_FIRM.foundedAt,
    "NONE",
  ].map(sql).join(", ")};`,
  /*
   * Le cabinet est supprimé puis recréé à chaque exécution, ce qui détache le
   * cédant (firmId passe à NULL). L'insertion au-dessus ne le rattrape pas,
   * puisqu'elle ignore une ligne déjà présente : on le rattache ici, et on y
   * remet aussi son identité, pour qu'un compte déjà créé prenne le nom et les
   * coordonnées à jour sans qu'on y touche à la main.
   */
  `UPDATE User SET firmId = ${sql(CATALOG_FIRM.id)}, kycStatus = 'VERIFIED', oriasVerifiedAt = ${sql(CATALOG_FIRM.foundedAt)}, email = ${sql(CATALOG_SELLER.email)}, fullName = ${sql(CATALOG_SELLER.fullName)}, jobTitle = ${sql(CATALOG_SELLER.jobTitle)}, phone = ${sql(CATALOG_SELLER.phone)} WHERE id = ${sql(CATALOG_SELLER.id)};`,
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
      row.status,
      row.isPartial,
      row.publishedAt,
      null,
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
