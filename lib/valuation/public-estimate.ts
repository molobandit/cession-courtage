import { RANGE_HIGH_FACTOR, RANGE_LOW_FACTOR } from "@/lib/valuation/types";

/**
 * Estimateur public de /valoriser. Volontairement plus grossier que la cascade
 * de compute.ts : un multiple par segment de clientele, puis la meme fourchette.
 * Sert a donner un ordre de grandeur avant inscription, jamais a fixer un prix.
 */

export type PublicSegment = "INDIVIDUAL" | "PROFESSIONAL" | "COMPANY";

/** Multiples publics, en euros de valeur par euro de commission annuelle. */
export const PUBLIC_SEGMENT_MULTIPLES: Record<PublicSegment, number> = {
  INDIVIDUAL: 1.9,
  PROFESSIONAL: 2.3,
  COMPANY: 2.6,
};

export const PUBLIC_SEGMENT_LABELS: Record<PublicSegment, string> = {
  INDIVIDUAL: "Particuliers",
  PROFESSIONAL: "Professionnels",
  COMPANY: "Entreprises",
};

export type PublicEstimate = {
  low: number;
  mid: number;
  high: number;
  multiple: number;
};

function round2(value: number): number {
  return Math.round(value * 100) / 100;
}

/**
 * @param annualCommissions commissions encaissees sur douze mois, en euros
 */
export function estimatePublicRange(
  annualCommissions: number,
  segment: PublicSegment,
): PublicEstimate {
  const multiple = PUBLIC_SEGMENT_MULTIPLES[segment];
  if (!Number.isFinite(annualCommissions) || annualCommissions <= 0) {
    return { low: 0, mid: 0, high: 0, multiple };
  }
  const mid = annualCommissions * multiple;
  return {
    low: round2(mid * RANGE_LOW_FACTOR),
    mid: round2(mid),
    high: round2(mid * RANGE_HIGH_FACTOR),
    multiple,
  };
}
