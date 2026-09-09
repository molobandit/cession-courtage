/**
 * Analyse de composition d'un portefeuille.
 *
 * Ce sont les chiffres qu'un acquereur reclame systematiquement en verification
 * prealable : repartition par compagnie, par branche, par clientele, par
 * departement, poids des dix premiers clients et echeancier des renouvellements.
 *
 * Fonctions pures : la page se contente de leur passer les lignes de contrat.
 */

export type AnalyticsLine = {
  carrier: string;
  riskType: string;
  clientSegment: string;
  department: string;
  clientKey: string;
  annualCommission: number;
  renewalDate: Date;
  effectiveDate: Date;
};

export type Share = {
  label: string;
  /** Commissions annuelles portees par cette categorie, en euros. */
  value: number;
  /** Part du total, entre 0 et 1. */
  share: number;
  contracts: number;
};

function round2(value: number): number {
  return Math.round(value * 100) / 100;
}

/**
 * Repartition des commissions par cle, triee du plus lourd au plus leger.
 * Au dela de `limit`, la queue est repliee sous un libelle unique : au dela de
 * sept categories un lecteur ne compare plus, il lit un tableau.
 */
export function breakdownBy(
  lines: AnalyticsLine[],
  key: (line: AnalyticsLine) => string,
  limit = 7,
  tailLabel = "Autres",
): Share[] {
  const totals = new Map<string, { value: number; contracts: number }>();
  let total = 0;

  for (const line of lines) {
    const k = key(line) || "Non renseigné";
    const current = totals.get(k) ?? { value: 0, contracts: 0 };
    current.value += line.annualCommission;
    current.contracts += 1;
    totals.set(k, current);
    total += line.annualCommission;
  }
  if (total <= 0) return [];

  const sorted = [...totals.entries()]
    .map(([label, v]) => ({ label, value: round2(v.value), contracts: v.contracts }))
    .sort((a, b) => b.value - a.value);

  const head = sorted.slice(0, limit);
  const tail = sorted.slice(limit);

  const shares: Share[] = head.map((item) => ({ ...item, share: item.value / total }));
  if (tail.length > 0) {
    const value = round2(tail.reduce((sum, item) => sum + item.value, 0));
    shares.push({
      label: `${tailLabel} (${tail.length})`,
      value,
      share: value / total,
      contracts: tail.reduce((sum, item) => sum + item.contracts, 0),
    });
  }
  return shares;
}

/** Indice de Herfindahl : somme des parts au carre. Au dela de 0,30, la dependance pese. */
export function herfindahl(shares: Share[]): number {
  return round2(shares.reduce((sum, s) => sum + s.share * s.share, 0) * 10000) / 10000;
}

/** Part des `count` premiers clients dans les commissions. */
export function topClientShare(lines: AnalyticsLine[], count = 10): number {
  const totals = new Map<string, number>();
  let total = 0;
  for (const line of lines) {
    totals.set(line.clientKey, (totals.get(line.clientKey) ?? 0) + line.annualCommission);
    total += line.annualCommission;
  }
  if (total <= 0) return 0;
  const top = [...totals.values()].sort((a, b) => b - a).slice(0, count);
  return Math.round((top.reduce((s, v) => s + v, 0) / total) * 10000) / 10000;
}

export type MaturityBucket = {
  /** Mois au format AAAA-MM. */
  month: string;
  label: string;
  contracts: number;
  commissions: number;
};

const MONTHS_FR = [
  "janv.", "févr.", "mars", "avr.", "mai", "juin",
  "juil.", "août", "sept.", "oct.", "nov.", "déc.",
];

/**
 * Echeancier des renouvellements sur douze mois glissants.
 * Un acquereur veut savoir quand la clientele se rejoue : c'est la que se
 * decide la retention qu'il paiera.
 */
export function maturitySchedule(lines: AnalyticsLine[], from: Date): MaturityBucket[] {
  const buckets: MaturityBucket[] = [];
  const index = new Map<string, MaturityBucket>();

  for (let i = 0; i < 12; i += 1) {
    const d = new Date(Date.UTC(from.getUTCFullYear(), from.getUTCMonth() + i, 1));
    const month = `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, "0")}`;
    const bucket: MaturityBucket = {
      month,
      label: `${MONTHS_FR[d.getUTCMonth()]} ${String(d.getUTCFullYear()).slice(2)}`,
      contracts: 0,
      commissions: 0,
    };
    buckets.push(bucket);
    index.set(month, bucket);
  }

  for (const line of lines) {
    const d = line.renewalDate;
    const month = `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, "0")}`;
    const bucket = index.get(month);
    if (!bucket) continue;
    bucket.contracts += 1;
    bucket.commissions = round2(bucket.commissions + line.annualCommission);
  }
  return buckets;
}

/**
 * Fourchettes de multiples constatees sur le marche francais, par clientele
 * dominante. Sert a situer le multiple effectif du portefeuille.
 */
export const MARKET_MULTIPLES: Record<string, { low: number; high: number; label: string }> = {
  INDIVIDUAL: { low: 1.5, high: 2.5, label: "Particuliers" },
  PROFESSIONAL: { low: 2.5, high: 4, label: "Professionnels" },
  COMPANY: { low: 2.5, high: 4, label: "Entreprises" },
};

export type MarketPosition = {
  /** Multiple effectif : valorisation mediane rapportee aux commissions. */
  effective: number;
  low: number;
  high: number;
  segmentLabel: string;
  /** Position sur la fourchette, bornee entre 0 et 1. */
  position: number;
  verdict: "sous" | "dans" | "au-dessus";
};

export function marketPosition(
  midValue: number,
  annualCommissions: number,
  dominantSegment: string,
): MarketPosition | null {
  if (annualCommissions <= 0 || midValue <= 0) return null;
  const range = MARKET_MULTIPLES[dominantSegment] ?? MARKET_MULTIPLES.INDIVIDUAL;
  const effective = Math.round((midValue / annualCommissions) * 100) / 100;
  const span = range.high - range.low;
  const position = Math.min(1, Math.max(0, (effective - range.low) / span));
  return {
    effective,
    low: range.low,
    high: range.high,
    segmentLabel: range.label,
    position,
    verdict: effective < range.low ? "sous" : effective > range.high ? "au-dessus" : "dans",
  };
}

/** Clientele majoritaire, en part de commissions. */
export function dominantSegment(lines: AnalyticsLine[]): string {
  const shares = breakdownBy(lines, (l) => l.clientSegment, 10);
  return shares[0]?.label ?? "INDIVIDUAL";
}
