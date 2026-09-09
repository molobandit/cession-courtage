import {
  ClientSegment,
  type RiskType,
} from "@prisma/client";
import { computeValuation } from "../lib/valuation/compute";
import { DEFAULT_MULTIPLES } from "../lib/valuation/defaults";
import type { ValuationBreakdown, ValuationFirm, ValuationLine } from "../lib/valuation/types";

export const RISK_MULTIPLES = DEFAULT_MULTIPLES;

export type { ValuationBreakdown };

export function computeSeedValuation(
  lines: ValuationLine[],
  firm: ValuationFirm,
  sellerSupportMonths: number,
  churnRate12m: number,
  averageAgeMonths: number,
): ValuationBreakdown {
  return computeValuation({
    lines,
    firm,
    sellerSupportMonths,
    churnRate12m,
    averageAgeMonths,
    multiples: DEFAULT_MULTIPLES,
  });
}

export const CARRIERS = [
  "AXA",
  "Allianz",
  "Generali",
  "Swiss Life",
  "April",
  "Alptis",
  "Solly Azar",
  "Néoliane",
  "Netvox",
  "Zephir",
  "Spvie",
  "Entoria",
] as const;

export const RISK_WEIGHTS: { type: RiskType; weight: number }[] = [
  { type: "HEALTH_INDIVIDUAL", weight: 22 },
  { type: "HEALTH_SENIOR", weight: 8 },
  { type: "HEALTH_GROUP", weight: 6 },
  { type: "PROVIDENT", weight: 8 },
  { type: "LOAN_INSURANCE", weight: 10 },
  { type: "AUTO", weight: 10 },
  { type: "HOME", weight: 8 },
  { type: "MOTORCYCLE", weight: 2 },
  { type: "PROFESSIONAL_MULTIRISK", weight: 7 },
  { type: "PROFESSIONAL_LIABILITY", weight: 4 },
  { type: "DECENNIAL", weight: 3 },
  { type: "LEGAL_PROTECTION", weight: 3 },
  { type: "FUNERAL", weight: 2 },
  { type: "SAVINGS", weight: 3 },
  { type: "RETIREMENT", weight: 2 },
  { type: "FLEET", weight: 1 },
  { type: "LANDLORD", weight: 1 },
];

export type GeoZone = {
  department: string;
  region: string;
  regionCode: string;
  postalCodes: string[];
};

/** Representative departments used to build realistic, anonymised portfolios. */
export const GEO_ZONES: GeoZone[] = [
  { department: "75", region: "Île-de-France", regionCode: "IDF", postalCodes: ["75001", "75011", "75015", "75018"] },
  { department: "92", region: "Île-de-France", regionCode: "IDF", postalCodes: ["92100", "92200", "92300"] },
  { department: "13", region: "Provence-Alpes-Côte d'Azur", regionCode: "PACA", postalCodes: ["13001", "13006", "13008"] },
  { department: "83", region: "Provence-Alpes-Côte d'Azur", regionCode: "PACA", postalCodes: ["83000", "83100", "83990"] },
  { department: "69", region: "Auvergne-Rhône-Alpes", regionCode: "ARA", postalCodes: ["69001", "69003", "69006"] },
  { department: "38", region: "Auvergne-Rhône-Alpes", regionCode: "ARA", postalCodes: ["38000", "38100"] },
  { department: "33", region: "Nouvelle-Aquitaine", regionCode: "NAQ", postalCodes: ["33000", "33100", "33800"] },
  { department: "31", region: "Occitanie", regionCode: "OCC", postalCodes: ["31000", "31200", "31500"] },
  { department: "44", region: "Pays de la Loire", regionCode: "PDL", postalCodes: ["44000", "44100", "44300"] },
  { department: "35", region: "Bretagne", regionCode: "BRE", postalCodes: ["35000", "35200"] },
  { department: "59", region: "Hauts-de-France", regionCode: "HDF", postalCodes: ["59000", "59100", "59800"] },
  { department: "67", region: "Grand Est", regionCode: "GES", postalCodes: ["67000", "67200"] },
  { department: "06", region: "Provence-Alpes-Côte d'Azur", regionCode: "PACA", postalCodes: ["06000", "06100", "06400"] },
  { department: "34", region: "Occitanie", regionCode: "OCC", postalCodes: ["34000", "34070"] },
  { department: "45", region: "Centre-Val de Loire", regionCode: "CVL", postalCodes: ["45000", "45100"] },
  { department: "2A", region: "Corse", regionCode: "COR", postalCodes: ["20000", "20167"] },
];

export function mulberry32(seed: number): () => number {
  return () => {
    let t = (seed += 0x6d2b79f5);
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export function pick<T>(rand: () => number, items: readonly T[]): T {
  return items[Math.floor(rand() * items.length)]!;
}

export function pickWeighted<T extends { weight: number }>(
  rand: () => number,
  items: T[],
): T {
  const total = items.reduce((s, i) => s + i.weight, 0);
  let r = rand() * total;
  for (const item of items) {
    r -= item.weight;
    if (r <= 0) return item;
  }
  return items[items.length - 1]!;
}

export function money(n: number): string {
  return n.toFixed(2);
}

export function hhi(shares: number[]): number {
  return shares.reduce((s, x) => s + x * x, 0);
}

export const SEGMENTS: ClientSegment[] = [
  ClientSegment.INDIVIDUAL,
  ClientSegment.PROFESSIONAL,
  ClientSegment.COMPANY,
];
