import type { ColumnMapping, TargetField } from "@/lib/import/types";
import { TARGET_FIELDS } from "@/lib/import/types";

/**
 * Libelles de colonnes reconnus automatiquement.
 *
 * Les logiciels de courtage exportent sous des intitules tres varies, en
 * francais comme en anglais, avec ou sans abreviation. Cette liste evite a
 * l'utilisateur d'avoir a tout associer a la main ; la correspondance reste
 * modifiable a l'ecran dans tous les cas.
 */
const SYNONYMS: Record<TargetField, string[]> = {
  carrier: [
    "compagnie", "assureur", "fournisseur", "carrier", "partenaire", "cie",
    "porteur", "porteur de risque", "societe", "societe d assurance", "insurer",
    "company", "mandant", "groupe", "enseigne",
  ],
  riskType: [
    "branche", "risque", "type_risque", "type de risque", "garantie", "risk", "produit",
    "product", "categorie", "famille", "nature", "nature du risque", "type de contrat",
    "type contrat", "gamme", "line", "line of business", "lob",
  ],
  premium: [
    "prime", "prime_ttc", "prime annuelle", "cotisation", "premium",
    "prime ht", "cotisation annuelle", "montant prime", "prime totale",
    "cotisation ttc", "encaissement", "chiffre affaires", "ca",
  ],
  commissionRate: [
    "taux", "taux_comm", "taux commission", "tx_com", "commission_rate",
    "taux de commission", "pourcentage", "pct", "taux retrocession", "rate",
    "taux de retrocession", "commission pct",
  ],
  annualCommission: [
    "commission", "comm_annuelle", "commission annuelle", "ca_commissions",
    "commissions", "droit a commission", "retrocession", "honoraires",
    "commission percue", "montant commission", "remuneration", "revenu",
    "commission montant", "gain",
  ],
  effectiveDate: [
    "effet", "date_effet", "date d effet", "date effet", "debut", "date de debut",
    "souscription", "date souscription", "start", "start date", "effective date",
    "date creation", "prise d effet",
  ],
  renewalDate: [
    "echeance", "date_echeance", "renouvellement", "date de renouvellement",
    "date echeance", "fin", "date de fin", "expiration", "renewal", "end date",
    "echeance principale", "anniversaire",
  ],
  clientSegment: [
    "segment", "clientele", "type_client", "type client", "categorie client",
    "marche", "cible", "qualite", "particulier professionnel", "segment client",
  ],
  postalCode: [
    "cp", "code_postal", "code postal", "postal", "postalcode", "zip",
    "cp client", "code postal client", "codepostal", "zipcode",
  ],
  commissionType: [
    "type_comm", "type commission", "mode_commission", "commissiontype",
    "mode de commission", "lineaire precompte", "nature commission",
    "type de remuneration",
  ],
  clientKey: [
    "ref_client", "id_client", "client_id", "numero_client", "n client",
    "cle_client", "clientkey", "reference", "reference client", "matricule",
    "identifiant", "id", "code client", "no client", "numero adherent",
    "numero police", "numero contrat", "reference contrat", "police",
  ],
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
