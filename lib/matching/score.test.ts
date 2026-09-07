import { ClientSegment, RiskType } from "@prisma/client";
import { describe, expect, it } from "vitest";
import { scoreListingAgainstMandate, type MandateProfile } from "@/lib/matching/score";
import type { ListingProfile } from "@/lib/listing/profile";

function listing(partial: Partial<ListingProfile> & { regionCodes?: string[]; isNationwide?: boolean } = {}) {
  return {
    askingPrice: 80000,
    annualCommissions: 25000,
    contractCount: 200,
    clientCount: 120,
    riskTypes: [RiskType.HEALTH_INDIVIDUAL, RiskType.PROVIDENT],
    riskMix: [] as ListingProfile["riskMix"],
    carriers: ["AXA", "Allianz", "April"],
    clientSegments: [ClientSegment.INDIVIDUAL, ClientSegment.PROFESSIONAL],
    departments: ["75", "92"],
    ...partial,
    regionCodes: partial.regionCodes ?? ["IDF"],
    isNationwide: partial.isNationwide ?? false,
  };
}

function mandate(partial: Partial<MandateProfile> = {}): MandateProfile {
  return {
    maxBudget: 100000,
    minCommissions: 10000,
    maxCommissions: 40000,
    riskTypes: [RiskType.HEALTH_INDIVIDUAL, RiskType.PROVIDENT],
    carriers: ["AXA", "Allianz"],
    zones: ["IDF", "75"],
    clientSegments: [ClientSegment.INDIVIDUAL],
    ...partial,
  };
}

describe("scoreListingAgainstMandate", () => {
  it("donne un score élevé pour un alignement complet", () => {
    const result = scoreListingAgainstMandate(listing(), mandate());
    expect(result.score).toBeGreaterThanOrEqual(85);
    expect(result.criteriaBreakdown.budget).toBe(25);
    expect(result.criteriaBreakdown.commissions).toBe(15);
    expect(result.criteriaBreakdown.zone).toBe(15);
  });

  it("annule le volet budget si le prix dépasse 110 % du plafond", () => {
    const result = scoreListingAgainstMandate(listing({ askingPrice: 150000 }), mandate({ maxBudget: 100000 }));
    expect(result.criteriaBreakdown.budget).toBe(0);
  });

  it("accorde la moitié du budget entre 100 et 110 %", () => {
    const result = scoreListingAgainstMandate(listing({ askingPrice: 105000 }), mandate({ maxBudget: 100000 }));
    expect(result.criteriaBreakdown.budget).toBe(13);
  });

  it("zone NATIONAL matche n'importe quelle annonce", () => {
    const result = scoreListingAgainstMandate(listing(), mandate({ zones: ["NATIONAL"] }));
    expect(result.criteriaBreakdown.zone).toBe(15);
  });

  it("zone département vs région", () => {
    const dept = scoreListingAgainstMandate(listing(), mandate({ zones: ["75"] }));
    expect(dept.criteriaBreakdown.zone).toBe(15);
    const region = scoreListingAgainstMandate(listing({ departments: ["77"] }), mandate({ zones: ["IDF"] }));
    expect(region.criteriaBreakdown.zone).toBe(12);
    const miss = scoreListingAgainstMandate(
      listing({ departments: ["33"], regionCodes: ["NAQ"], isNationwide: false }),
      mandate({ zones: ["75"] }),
    );
    expect(miss.criteriaBreakdown.zone).toBe(0);
  });

  it("risques sans recouvrement → 0", () => {
    const result = scoreListingAgainstMandate(
      listing({ riskTypes: [RiskType.AUTO] }),
      mandate({ riskTypes: [RiskType.HEALTH_INDIVIDUAL] }),
    );
    expect(result.criteriaBreakdown.risks).toBe(0);
  });

  it("mandats sans filtre risques/compagnies → points pleins", () => {
    const result = scoreListingAgainstMandate(listing(), mandate({ riskTypes: [], carriers: [] }));
    expect(result.criteriaBreakdown.risks).toBe(20);
    expect(result.criteriaBreakdown.carriers).toBe(15);
  });

  it("commissions hors fourchette", () => {
    const low = scoreListingAgainstMandate(listing({ annualCommissions: 1000 }), mandate());
    expect(low.criteriaBreakdown.commissions).toBe(0);
    const edge = scoreListingAgainstMandate(listing({ annualCommissions: 8500 }), mandate({ minCommissions: 10000, maxCommissions: 40000 }));
    expect(edge.criteriaBreakdown.commissions).toBe(8);
  });
});
