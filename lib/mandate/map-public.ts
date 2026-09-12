import type { Prisma } from "@prisma/client";
import { asStringArray } from "@/lib/json-array";
import { FINANCING_LABELS, RISK_TYPE_LABELS, SEGMENT_LABELS } from "@/lib/labels";
import type { PublicMandateCard } from "@/lib/mandate/public";

export type PublicMandateRow = {
  id: string;
  publicNumber: number | null;
  maxBudget: { toString(): string } | number | string;
  minCommissions: { toString(): string } | number | string;
  maxCommissions: { toString(): string } | number | string;
  riskTypes: Prisma.JsonValue;
  carriers: Prisma.JsonValue;
  zones: Prisma.JsonValue;
  clientSegments: Prisma.JsonValue;
  financingMode: string;
  buyer: { publicAlias: string };
};

export function mapPublicMandateCard(row: PublicMandateRow): PublicMandateCard | null {
  if (!row.publicNumber) return null;
  const zones = asStringArray(row.zones);
  return {
    id: row.id,
    publicNumber: row.publicNumber,
    buyerAlias: row.buyer.publicAlias,
    maxBudget: Number(row.maxBudget),
    minCommissions: Number(row.minCommissions),
    maxCommissions: Number(row.maxCommissions),
    riskTypes: asStringArray(row.riskTypes).map(
      (r) => RISK_TYPE_LABELS[r as keyof typeof RISK_TYPE_LABELS] ?? r,
    ),
    carriers: asStringArray(row.carriers),
    zones: zones.filter((z) => z !== "NATIONAL"),
    clientSegments: asStringArray(row.clientSegments).map(
      (s) => SEGMENT_LABELS[s as keyof typeof SEGMENT_LABELS] ?? s,
    ),
    financingLabel: FINANCING_LABELS[row.financingMode as keyof typeof FINANCING_LABELS] ?? "Non précisé",
    isNationwide: zones.includes("NATIONAL"),
  };
}
