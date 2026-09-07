import type { ColumnMapping, TargetField } from "@/lib/import/types";
import { TARGET_FIELDS } from "@/lib/import/types";

const SYNONYMS: Record<TargetField, string[]> = {
  carrier: ["compagnie", "assureur", "fournisseur", "carrier", "partenaire", "cie"],
  riskType: ["branche", "risque", "type_risque", "type de risque", "garantie", "risk", "produit"],
  premium: ["prime", "prime_ttc", "prime annuelle", "cotisation", "premium"],
  commissionRate: ["taux", "taux_comm", "taux commission", "tx_com", "commission_rate", "taux de commission"],
  annualCommission: [
    "commission",
    "comm_annuelle",
    "commission annuelle",
    "ca_commissions",
    "commissions",
    "droit a commission",
  ],
  effectiveDate: ["effet", "date_effet", "date d'effet", "date effet", "debut", "début"],
  renewalDate: ["echeance", "échéance", "date_echeance", "renouvellement", "date de renouvellement"],
  clientSegment: ["segment", "clientele", "clientèle", "type_client", "type client"],
  postalCode: ["cp", "code_postal", "code postal", "postal", "postalcode"],
  commissionType: ["type_comm", "type commission", "mode_commission", "commissiontype"],
  clientKey: ["ref_client", "id_client", "client_id", "numero_client", "n° client", "cle_client", "clientkey"],
};

function norm(value: string): string {
  return value
    .normalize("NFD")
    .replace(/\p{M}/gu, "")
    .toLowerCase()
    .replace(/['’]/g, " ")
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

export function suggestColumnMapping(headers: string[]): ColumnMapping {
  const mapping: ColumnMapping = {};
  const used = new Set<string>();
  const folded = headers.map((header) => ({ header, n: norm(header) }));

  const take = (field: TargetField, predicate: (n: string) => boolean) => {
    if (mapping[field]) return;
    const match = folded.find(({ header, n }) => !used.has(header) && predicate(n));
    if (match) {
      mapping[field] = match.header;
      used.add(match.header);
    }
  };

  for (const field of TARGET_FIELDS) {
    const synonyms = SYNONYMS[field].map(norm);
    take(field, (n) => synonyms.includes(n));
  }
  for (const field of TARGET_FIELDS) {
    const synonyms = SYNONYMS[field].map(norm);
    take(field, (n) => synonyms.some((syn) => syn.length >= 3 && n.includes(syn)));
  }
  return mapping;
}

export function mappingIsComplete(mapping: ColumnMapping): string | null {
  if (!mapping.carrier) return "Associez la colonne Compagnie.";
  if (!mapping.riskType) return "Associez la colonne Type de risque.";
  if (!mapping.postalCode) return "Associez la colonne Code postal.";
  if (!mapping.effectiveDate) return "Associez la colonne Date d'effet.";
  if (!mapping.annualCommission && !(mapping.premium && mapping.commissionRate)) {
    return "Associez la commission annuelle, ou la prime et le taux.";
  }
  return null;
}

export function mappingFromForm(formData: FormData): ColumnMapping {
  const mapping: ColumnMapping = {};
  for (const field of TARGET_FIELDS) {
    const value = String(formData.get(`map_${field}`) ?? "").trim();
    if (value) mapping[field] = value;
  }
  return mapping;
}

export function parseStoredMapping(value: unknown): ColumnMapping {
  if (!value || typeof value !== "object" || Array.isArray(value)) return {};
  const mapping: ColumnMapping = {};
  const record = value as Record<string, unknown>;
  for (const field of TARGET_FIELDS) {
    const mapped = record[field];
    if (typeof mapped === "string" && mapped.trim()) mapping[field] = mapped.trim();
  }
  return mapping;
}

export function mappingUsesHeaders(mapping: ColumnMapping, headers: string[]): boolean {
  const headerSet = new Set(headers);
  return TARGET_FIELDS.every((field) => {
    const mapped = mapping[field];
    return !mapped || headerSet.has(mapped);
  });
}
