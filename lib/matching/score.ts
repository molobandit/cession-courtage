import type { ClientSegment, RiskType } from "@prisma/client";
import type { ListingProfile } from "@/lib/listing/profile";

export type MandateProfile = {
  maxBudget: number;
  minCommissions: number;
  maxCommissions: number;
  riskTypes: RiskType[];
  carriers: string[];
  /** NATIONAL | region code (IDF) | department (75) */
  zones: string[];
  clientSegments: ClientSegment[];
};

export type MatchBreakdown = {
  budget: number;
  commissions: number;
  risks: number;
  carriers: number;
  zone: number;
  segments: number;
};

export type MatchResult = {
  score: number;
  criteriaBreakdown: MatchBreakdown;
};

const W = {
  budget: 25,
  commissions: 15,
  risks: 20,
  carriers: 15,
  zone: 15,
  segments: 10,
} as const;

function overlapRatio(have: string[], want: string[]): number {
  if (want.length === 0) return 1;
  if (have.length === 0) return 0;
  const set = new Set(have);
  let hit = 0;
  for (const item of want) {
    if (set.has(item)) hit += 1;
  }
  return hit / want.length;
}

function budgetPoints(askingPrice: number, maxBudget: number): number {
  if (maxBudget <= 0) return 0;
  if (askingPrice <= maxBudget) return W.budget;
  if (askingPrice <= maxBudget * 1.1) return Math.round(W.budget * 0.5);
  return 0;
}

function commissionPoints(annual: number, min: number, max: number): number {
  if (max < min) return 0;
  if (annual >= min && annual <= max) return W.commissions;
  if (annual < min && annual >= min * 0.8) return Math.round(W.commissions * 0.5);
  if (annual > max && annual <= max * 1.15) return Math.round(W.commissions * 0.5);
  return 0;
}

function zonePoints(
  listing: Pick<ListingProfile, "departments"> & { regionCodes: string[]; isNationwide: boolean },
  zones: string[],
): number {
  if (zones.length === 0 || zones.includes("NATIONAL")) return W.zone;
  if (listing.isNationwide) return Math.round(W.zone * 0.7);
  const deptHit = listing.departments.some((d) => zones.includes(d));
  if (deptHit) return W.zone;
  const regionHit = listing.regionCodes.some((r) => zones.includes(r));
  if (regionHit) return Math.round(W.zone * 0.8);
  return 0;
}

export function scoreListingAgainstMandate(
  listing: ListingProfile & { regionCodes: string[]; isNationwide: boolean },
  mandate: MandateProfile,
): MatchResult {
  const budget = budgetPoints(listing.askingPrice, mandate.maxBudget);
  const commissions = commissionPoints(
    listing.annualCommissions,
    mandate.minCommissions,
    mandate.maxCommissions,
  );
  const risks = Math.round(
    W.risks * overlapRatio(listing.riskTypes, mandate.riskTypes),
  );
  const carriers = Math.round(
    W.carriers * overlapRatio(listing.carriers, mandate.carriers),
  );
  const zone = zonePoints(listing, mandate.zones);
  const segments = Math.round(
    W.segments * overlapRatio(listing.clientSegments, mandate.clientSegments),
  );
  const criteriaBreakdown = { budget, commissions, risks, carriers, zone, segments };
  const score = budget + commissions + risks + carriers + zone + segments;
  return { score, criteriaBreakdown };
}

export const MATCH_WEIGHTS = W;
