import type { ClientSegment, CommissionType, RiskType } from "@prisma/client";

export const TARGET_FIELDS = [
  "carrier",
  "riskType",
  "premium",
  "commissionRate",
  "annualCommission",
  "effectiveDate",
  "renewalDate",
  "clientSegment",
  "postalCode",
  "commissionType",
  "clientKey",
] as const;

export type TargetField = (typeof TARGET_FIELDS)[number];

export type ColumnMapping = Partial<Record<TargetField, string>>;

export type ParsedTable = {
  headers: string[];
  rows: string[][];
  encoding: "utf-8" | "windows-1252";
  delimiter: "," | ";" | "xlsx";
};

export type FieldMeta = {
  key: TargetField;
  label: string;
  required: boolean;
  help: string;
};

export const FIELD_META: FieldMeta[] = [
  { key: "carrier", label: "Compagnie", required: true, help: "Assureur ou courtier grossiste (AXA, April…)" },
  { key: "riskType", label: "Type de risque", required: true, help: "Branche : santé, auto, RC pro…" },
  { key: "annualCommission", label: "Commission annuelle", required: false, help: "Obligatoire si prime et taux absents" },
  { key: "premium", label: "Prime", required: false, help: "Prime annuelle TTC" },
  { key: "commissionRate", label: "Taux de commission", required: false, help: "Ex. 12,5 %" },
  { key: "effectiveDate", label: "Date d'effet", required: true, help: "JJ/MM/AAAA" },
  { key: "renewalDate", label: "Date d'échéance", required: false, help: "Par défaut : effet + 12 mois" },
  { key: "clientSegment", label: "Segment", required: false, help: "Particulier, professionnel, entreprise" },
  { key: "postalCode", label: "Code postal", required: true, help: "Grain le plus fin autorisé" },
  { key: "commissionType", label: "Type de commission", required: false, help: "Linéaire ou précomptée" },
  { key: "clientKey", label: "Réf. client anonymisée", required: false, help: "Identifiant interne, jamais un nom" },
];

export type MappedLine = {
  carrier: string;
  riskType: RiskType;
  premium: number;
  commissionRate: number;
  annualCommission: number;
  effectiveDate: Date;
  renewalDate: Date;
  clientSegment: ClientSegment;
  postalCode: string;
  commissionType: CommissionType;
  clientKeyRaw: string;
};

export type RowIssue = { row: number; message: string };
