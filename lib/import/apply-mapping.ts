import type { Prisma } from "@prisma/client";
import { hmacClientKey } from "@/lib/import/hmac";
import type { ColumnMapping, TargetField } from "@/lib/import/types";
import {
  addYearsUtc,
  asRate,
  departmentFromPostalCode,
  normalizePostalCode,
  parseClientSegment,
  parseCommissionType,
  parseFrenchDate,
  parseFrenchNumber,
  parseRiskType,
} from "@/lib/import/values";

export type MappedLineError = { row: number; message: string };

export type MappedContractInput = Prisma.ContractLineCreateManyInput;

export type ApplyMappingResult = {
  lines: MappedContractInput[];
  errors: MappedLineError[];
  warnings: string[];
  averageAgeMonths: number;
};

function headerIndex(headers: string[], name: string | undefined): number {
  if (!name) return -1;
  return headers.indexOf(name);
}

function cell(row: string[], headers: string[], mapping: ColumnMapping, field: TargetField): string {
  const index = headerIndex(headers, mapping[field]);
  if (index < 0) return "";
  return (row[index] ?? "").trim();
}

export function applyMapping(
  headers: string[],
  rows: string[][],
  mapping: ColumnMapping,
  portfolioId: string,
): ApplyMappingResult {
  const errors: MappedLineError[] = [];
  const warnings: string[] = [];
  const lines: MappedContractInput[] = [];
  const ages: number[] = [];
  const now = new Date();
  let missingClientKey = 0;

  rows.forEach((row, i) => {
    const excelRow = i + 2;
    const carrier = cell(row, headers, mapping, "carrier");
    const riskType = parseRiskType(cell(row, headers, mapping, "riskType"));
    let premium = parseFrenchNumber(cell(row, headers, mapping, "premium"));
    const commissionRateRaw = parseFrenchNumber(cell(row, headers, mapping, "commissionRate"));
    let annualCommission = parseFrenchNumber(cell(row, headers, mapping, "annualCommission"));
    const effectiveDate = parseFrenchDate(cell(row, headers, mapping, "effectiveDate"));
    let renewalDate = parseFrenchDate(cell(row, headers, mapping, "renewalDate"));
    const postal = normalizePostalCode(cell(row, headers, mapping, "postalCode"));
    const clientRef = cell(row, headers, mapping, "clientKey");

    if (!carrier) {
      errors.push({ row: excelRow, message: "Compagnie manquante." });
      return;
    }
    if (!riskType) {
      errors.push({ row: excelRow, message: "Branche / type de risque invalide." });
      return;
    }

    let commissionRate = commissionRateRaw == null ? null : asRate(commissionRateRaw);

    if (annualCommission == null && premium != null && commissionRate != null) {
      annualCommission = Math.round(premium * commissionRate * 100) / 100;
    }
    if (premium == null && annualCommission != null && commissionRate != null && commissionRate > 0) {
      premium = Math.round((annualCommission / commissionRate) * 100) / 100;
    }
    if (commissionRate == null && annualCommission != null && premium != null && premium > 0) {
      commissionRate = asRate((annualCommission / premium) * 100) ?? asRate(annualCommission / premium);
    }
    if (annualCommission != null && premium == null && commissionRate == null) {
      premium = annualCommission;
      commissionRate = 1;
    }

    if (premium == null || premium < 0) {
      errors.push({ row: excelRow, message: "Prime annuelle invalide." });
      return;
    }
    if (commissionRate == null) {
      errors.push({ row: excelRow, message: "Taux de commission invalide." });
      return;
    }
    if (annualCommission == null || annualCommission < 0) {
      errors.push({ row: excelRow, message: "Commission annuelle invalide." });
      return;
    }
    if (!effectiveDate) {
      errors.push({ row: excelRow, message: "Date d’effet invalide." });
      return;
    }
    if (!renewalDate) {
      renewalDate = addYearsUtc(effectiveDate, 1);
    }
    if (!postal) {
      errors.push({ row: excelRow, message: "Code postal invalide." });
      return;
    }

    const clientKey = clientRef ? hmacClientKey(clientRef) : hmacClientKey(`${portfolioId}:${i}`);
    if (!clientRef) missingClientKey += 1;

    const ageMonths =
      (now.getUTCFullYear() - effectiveDate.getUTCFullYear()) * 12 +
      (now.getUTCMonth() - effectiveDate.getUTCMonth());
    if (ageMonths >= 0) ages.push(ageMonths);

    lines.push({
      portfolioId,
      carrier,
      riskType,
      premium: premium.toFixed(2),
      commissionRate: commissionRate.toFixed(4),
      annualCommission: annualCommission.toFixed(2),
      effectiveDate,
      renewalDate,
      clientSegment: parseClientSegment(cell(row, headers, mapping, "clientSegment")),
      postalCode: postal,
      department: departmentFromPostalCode(postal),
      commissionType: parseCommissionType(cell(row, headers, mapping, "commissionType")),
      clientKey,
    });
  });

  if (missingClientKey > 0) {
    warnings.push(
      `${missingClientKey} ligne(s) sans référence client : la concentration top 10 ne sera pas fiable.`,
    );
  }

  const averageAgeMonths =
    ages.length > 0 ? Math.round(ages.reduce((a, b) => a + b, 0) / ages.length) : 0;

  return { lines, errors, warnings, averageAgeMonths };
}
