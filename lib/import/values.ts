import { ClientSegment, CommissionType, RiskType } from "@prisma/client";

function fold(value: string): string {
  return value
    .normalize("NFD")
    .replace(/\p{M}/gu, "")
    .toLowerCase()
    .replace(/['’]/g, " ")
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

const RISK_LABELS: Record<string, RiskType> = {
  auto: RiskType.AUTO,
  automobile: RiskType.AUTO,
  habitation: RiskType.HOME,
  mrh: RiskType.HOME,
  home: RiskType.HOME,
  moto: RiskType.MOTORCYCLE,
  motorcycle: RiskType.MOTORCYCLE,
  "deux roues": RiskType.MOTORCYCLE,
  sante: RiskType.HEALTH_INDIVIDUAL,
  "sante individuelle": RiskType.HEALTH_INDIVIDUAL,
  "sante particulier": RiskType.HEALTH_INDIVIDUAL,
  "sante particuliers": RiskType.HEALTH_INDIVIDUAL,
  "sante senior": RiskType.HEALTH_SENIOR,
  "sante seniors": RiskType.HEALTH_SENIOR,
  "sante collective": RiskType.HEALTH_GROUP,
  "sante groupe": RiskType.HEALTH_GROUP,
  "mutuelle entreprise": RiskType.HEALTH_GROUP,
  prevoyance: RiskType.PROVIDENT,
  provident: RiskType.PROVIDENT,
  emprunteur: RiskType.LOAN_INSURANCE,
  "assurance emprunteur": RiskType.LOAN_INSURANCE,
  adi: RiskType.LOAN_INSURANCE,
  "rc pro": RiskType.PROFESSIONAL_LIABILITY,
  "rc professionnelle": RiskType.PROFESSIONAL_LIABILITY,
  "responsabilite civile professionnelle": RiskType.PROFESSIONAL_LIABILITY,
  mrp: RiskType.PROFESSIONAL_MULTIRISK,
  "multirisque pro": RiskType.PROFESSIONAL_MULTIRISK,
  "multirisque professionnelle": RiskType.PROFESSIONAL_MULTIRISK,
  decennale: RiskType.DECENNIAL,
  "garantie decennale": RiskType.DECENNIAL,
  "protection juridique": RiskType.LEGAL_PROTECTION,
  pj: RiskType.LEGAL_PROTECTION,
  obseques: RiskType.FUNERAL,
  funeral: RiskType.FUNERAL,
  epargne: RiskType.SAVINGS,
  savings: RiskType.SAVINGS,
  retraite: RiskType.RETIREMENT,
  flotte: RiskType.FLEET,
  fleet: RiskType.FLEET,
  pno: RiskType.LANDLORD,
  "proprietaire non occupant": RiskType.LANDLORD,
  autre: RiskType.OTHER,
  other: RiskType.OTHER,
};

const SEGMENT_LABELS: Record<string, ClientSegment> = {
  particulier: ClientSegment.INDIVIDUAL,
  particuliers: ClientSegment.INDIVIDUAL,
  individual: ClientSegment.INDIVIDUAL,
  professionnel: ClientSegment.PROFESSIONAL,
  professionnels: ClientSegment.PROFESSIONAL,
  tpe: ClientSegment.PROFESSIONAL,
  pme: ClientSegment.PROFESSIONAL,
  pro: ClientSegment.PROFESSIONAL,
  entreprise: ClientSegment.COMPANY,
  entreprises: ClientSegment.COMPANY,
  societe: ClientSegment.COMPANY,
  company: ClientSegment.COMPANY,
};

const COMMISSION_LABELS: Record<string, CommissionType> = {
  lineaire: CommissionType.LINEAR,
  linear: CommissionType.LINEAR,
  precomptee: CommissionType.ADVANCED,
  "pre comptee": CommissionType.ADVANCED,
  avancee: CommissionType.ADVANCED,
  advanced: CommissionType.ADVANCED,
};

export function parseFrenchNumber(raw: string | null | undefined): number | null {
  if (raw == null) return null;
  let s = String(raw).trim();
  if (!s) return null;
  s = s.replace(/[\s\u00a0]/g, "").replace(/[€%]/g, "");
  if (/^-?\d{1,3}(\.\d{3})+(,\d+)?$/.test(s)) {
    s = s.replace(/\./g, "").replace(",", ".");
  } else if (s.includes(",") && !s.includes(".")) {
    s = s.replace(",", ".");
  } else if (/^-?\d{1,3}(,\d{3})+(\.\d+)?$/.test(s)) {
    s = s.replace(/,/g, "");
  }
  const n = Number(s);
  return Number.isFinite(n) ? n : null;
}

export function parseFrenchDate(raw: string | null | undefined): Date | null {
  if (raw == null) return null;
  const s = String(raw).trim();
  if (!s) return null;
  const fr = s.match(/^(\d{1,2})[/\-.](\d{1,2})[/\-.](\d{4})$/);
  if (fr) {
    const d = Number(fr[1]);
    const m = Number(fr[2]);
    const y = Number(fr[3]);
    const date = new Date(Date.UTC(y, m - 1, d));
    if (date.getUTCFullYear() === y && date.getUTCMonth() === m - 1 && date.getUTCDate() === d) {
      return date;
    }
    return null;
  }
  const iso = s.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (iso) {
    const y = Number(iso[1]);
    const m = Number(iso[2]);
    const d = Number(iso[3]);
    return new Date(Date.UTC(y, m - 1, d));
  }
  const parsed = Date.parse(s);
  if (Number.isNaN(parsed)) return null;
  const date = new Date(parsed);
  return new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
}

export function parseRiskType(raw: string | null | undefined): RiskType | null {
  if (!raw) return null;
  const key = fold(raw);
  if (!key) return null;
  if (key in RISK_LABELS) return RISK_LABELS[key];
  const asEnum = (Object.values(RiskType) as string[]).find((v) => fold(v) === key);
  return (asEnum as RiskType) ?? null;
}

export function parseClientSegment(raw: string | null | undefined): ClientSegment {
  if (!raw) return ClientSegment.INDIVIDUAL;
  const key = fold(raw);
  return SEGMENT_LABELS[key] ?? ClientSegment.INDIVIDUAL;
}

export function parseCommissionType(raw: string | null | undefined): CommissionType {
  if (!raw) return CommissionType.LINEAR;
  const key = fold(raw);
  return COMMISSION_LABELS[key] ?? CommissionType.LINEAR;
}

export function normalizePostalCode(raw: string | null | undefined): string | null {
  if (!raw) return null;
  const digits = raw.replace(/\D/g, "");
  if (digits.length < 4) return null;
  return digits.slice(0, 5).padStart(5, "0");
}

/** Département INSEE depuis un code postal (Corse 2A/2B, DOM 3 chiffres). */
export function departmentFromPostalCode(postalCode: string): string {
  if (postalCode.startsWith("97") || postalCode.startsWith("98")) {
    return postalCode.slice(0, 3);
  }
  if (postalCode.startsWith("20")) {
    const n = Number(postalCode);
    if (n >= 20000 && n <= 20190) return "2A";
    return "2B";
  }
  return postalCode.slice(0, 2);
}

export function addYearsUtc(date: Date, years: number): Date {
  return new Date(Date.UTC(date.getUTCFullYear() + years, date.getUTCMonth(), date.getUTCDate()));
}

export function asRate(value: number): number | null {
  const rate = value > 1 ? value / 100 : value;
  if (rate < 0 || rate > 1) return null;
  return rate;
}
