import { CommissionType, DistributionMode, RiskType } from "@prisma/client";
import { describe, expect, it } from "vitest";
import { computeValuation } from "@/lib/valuation/compute";
import { DEFAULT_MULTIPLES } from "@/lib/valuation/defaults";
import {
  ADVANCED_COMMISSION_FACTOR,
  RANGE_HIGH_FACTOR,
  RANGE_LOW_FACTOR,
  type ValuationLine,
} from "@/lib/valuation/types";

const firmOffice = {
  distributionMode: DistributionMode.OFFICE,
  complianceScore: 80,
};

function line(partial: Partial<ValuationLine> & Pick<ValuationLine, "annualCommission">): ValuationLine {
  return {
    carrier: partial.carrier ?? "AXA",
    riskType: partial.riskType ?? RiskType.HEALTH_INDIVIDUAL,
    annualCommission: partial.annualCommission,
    commissionType: partial.commissionType ?? CommissionType.LINEAR,
    clientKey: partial.clientKey ?? "c1",
    effectiveDate: partial.effectiveDate,
  };
}

function value(input: {
  lines: ValuationLine[];
  sellerSupportMonths?: number;
  churnRate12m?: number;
  averageAgeMonths?: number;
  distributionMode?: DistributionMode;
  complianceScore?: number;
  multiples?: Partial<Record<RiskType, number>>;
}) {
  return computeValuation({
    lines: input.lines,
    firm: {
      distributionMode: input.distributionMode ?? DistributionMode.OFFICE,
      complianceScore: input.complianceScore ?? 80,
    },
    sellerSupportMonths: input.sellerSupportMonths ?? 0,
    churnRate12m: input.churnRate12m ?? 0.08,
    averageAgeMonths: input.averageAgeMonths ?? 24,
    multiples: input.multiples ?? DEFAULT_MULTIPLES,
  });
}

describe("computeValuation — brut", () => {
  it("multiplie les commissions par le coefficient de branche", () => {
    const result = value({
      lines: [line({ annualCommission: 1000, riskType: RiskType.HEALTH_INDIVIDUAL })],
      sellerSupportMonths: 6,
      churnRate12m: 0.08,
      averageAgeMonths: 24,
      complianceScore: 80,
    });
    expect(result.grossValue).toBe(3100);
  });

  it("applique 0,5 aux commissions précomptées", () => {
    const linear = value({
      lines: [line({ annualCommission: 1000, commissionType: CommissionType.LINEAR })],
    });
    const advanced = value({
      lines: [line({ annualCommission: 1000, commissionType: CommissionType.ADVANCED })],
    });
    expect(advanced.grossValue).toBe(linear.grossValue * ADVANCED_COMMISSION_FACTOR);
  });

  it("utilise le multiple fourni plutôt que le défaut", () => {
    const result = value({
      lines: [line({ annualCommission: 1000, riskType: RiskType.AUTO })],
      multiples: { ...DEFAULT_MULTIPLES, AUTO: 5 },
    });
    expect(result.grossValue).toBe(5000);
  });
});

describe("computeValuation — cascade", () => {
  it("enchaîne les facteurs dans l'ordre (un client, une compagnie, sans accompagnement)", () => {
    const result = value({
      lines: [line({ annualCommission: 1000 })],
      sellerSupportMonths: 0,
      churnRate12m: 0.08,
      averageAgeMonths: 24,
      complianceScore: 80,
    });
    // gross 3100 → age 1 → churn 1 → dist 1 → support 0.9 → compliance 1
    expect(result.grossValue).toBe(3100);
    expect(result.adjustments.map((a) => a.key)).toEqual([
      "age",
      "churn",
      "distribution",
      "support",
      "compliance",
    ]);
    expect(result.adjustments[3]?.factor).toBe(0.9);
    expect(result.midValue).toBe(2790);
    expect(result.lowValue).toBeCloseTo(2790 * RANGE_LOW_FACTOR, 5);
    expect(result.highValue).toBeCloseTo(2790 * RANGE_HIGH_FACTOR, 5);
    expect(result.qualityScore).toBe(76);
  });

  it("ne pénalise plus ni la concentration des compagnies ni celle des clients", () => {
    const concentre = value({ lines: [line({ carrier: "A", clientKey: "1", annualCommission: 100 })] });
    const reparti = value({
      lines: [
        line({ carrier: "A", clientKey: "1", annualCommission: 25 }),
        line({ carrier: "B", clientKey: "2", annualCommission: 25 }),
        line({ carrier: "C", clientKey: "3", annualCommission: 25 }),
        line({ carrier: "D", clientKey: "4", annualCommission: 25 }),
      ],
    });
    expect(concentre.adjustments.some((a) => a.key === "carrier_hhi" || a.key === "client_conc")).toBe(false);
    expect(concentre.midValue).toBe(reparti.midValue);
    expect(concentre.actions.some((a) => /compagnies|concentration client/i.test(a.title))).toBe(false);
  });

  it("seuils d'ancienneté 12 / 36 / 72 mois", () => {
    const at = (averageAgeMonths: number) =>
      value({
        lines: [line({ annualCommission: 100 })],
        averageAgeMonths,
      }).adjustments.find((a) => a.key === "age")?.factor;
    expect(at(11)).toBe(0.88);
    expect(at(12)).toBe(1);
    expect(at(36)).toBe(1);
    expect(at(37)).toBe(1.05);
    expect(at(72)).toBe(1.05);
    expect(at(73)).toBe(1.15);
  });

  it("seuils de résiliation 5 / 10 / 15 %", () => {
    const at = (churnRate12m: number) =>
      value({
        lines: [line({ annualCommission: 100 })],
        churnRate12m,
      }).adjustments.find((a) => a.key === "churn")?.factor;
    expect(at(0.049)).toBe(1.1);
    expect(at(0.05)).toBe(1);
    expect(at(0.1)).toBe(1);
    expect(at(0.101)).toBe(0.85);
    expect(at(0.15)).toBe(0.85);
    expect(at(0.151)).toBe(0.7);
  });

  it("mode de distribution et accompagnement", () => {
    expect(
      value({
        lines: [line({ annualCommission: 100 })],
        distributionMode: DistributionMode.REMOTE,
      }).adjustments.find((a) => a.key === "distribution")?.factor,
    ).toBe(0.85);
    expect(
      value({
        lines: [line({ annualCommission: 100 })],
        distributionMode: DistributionMode.AGENCY,
      }).adjustments.find((a) => a.key === "distribution")?.factor,
    ).toBe(1.05);
    expect(
      value({
        lines: [line({ annualCommission: 100 })],
        sellerSupportMonths: 3,
      }).adjustments.find((a) => a.key === "support")?.factor,
    ).toBe(1.1);
    expect(
      value({
        lines: [line({ annualCommission: 100 })],
        sellerSupportMonths: 6,
      }).adjustments.find((a) => a.key === "support")?.factor,
    ).toBe(1.2);
  });

  it("conformité <50 / <80 / ≥80", () => {
    const at = (complianceScore: number) =>
      value({
        lines: [line({ annualCommission: 100 })],
        complianceScore,
      }).adjustments.find((a) => a.key === "compliance")?.factor;
    expect(at(49)).toBe(0.75);
    expect(at(50)).toBe(0.9);
    expect(at(79)).toBe(0.9);
    expect(at(80)).toBe(1);
  });
});

describe("computeValuation — qualité, leviers, bords", () => {
  it("borne le score de qualité entre 20 et 98", () => {
    const poor = value({
      lines: [line({ annualCommission: 1000 })],
      averageAgeMonths: 6,
      churnRate12m: 0.2,
      complianceScore: 20,
      sellerSupportMonths: 0,
    });
    expect(poor.qualityScore).toBeGreaterThanOrEqual(20);
    const strong = value({
      lines: Array.from({ length: 40 }, (_, i) =>
        line({
          carrier: `C${i % 12}`,
          clientKey: `k${i}`,
          annualCommission: 10,
        }),
      ),
      averageAgeMonths: 80,
      churnRate12m: 0.02,
      complianceScore: 95,
      sellerSupportMonths: 6,
    });
    expect(strong.qualityScore).toBeLessThanOrEqual(98);
    expect(strong.qualityScore).toBeGreaterThan(80);
  });

  it("propose des leviers quand un facteur est défavorable", () => {
    const result = value({
      lines: [line({ annualCommission: 1000 })],
      sellerSupportMonths: 0,
      churnRate12m: 0.16,
    });
    const titles = result.actions.map((a) => a.title);
    expect(titles).toContain("Maîtriser la résiliation");
    expect(titles).toContain("Proposer un accompagnement");
  });

  it("portefeuille vide → brut 0, fourchette 0, score 20+", () => {
    const result = computeValuation({
      lines: [],
      firm: firmOffice,
      sellerSupportMonths: 0,
      churnRate12m: 0,
      averageAgeMonths: 0,
      multiples: DEFAULT_MULTIPLES,
    });
    expect(result.grossValue).toBe(0);
    expect(result.midValue).toBe(0);
    expect(result.metrics.contractCount).toBe(0);
  });

  it("un sous-ensemble (cession partielle) change le brut", () => {
    const all = [
      line({ carrier: "AXA", clientKey: "a", annualCommission: 1000, riskType: RiskType.HEALTH_INDIVIDUAL }),
      line({ carrier: "April", clientKey: "b", annualCommission: 1000, riskType: RiskType.AUTO }),
    ];
    const full = value({ lines: all, sellerSupportMonths: 6 });
    const partial = value({
      lines: all.filter((l) => l.carrier === "April"),
      sellerSupportMonths: 6,
    });
    expect(full.grossValue).toBe(1000 * 3.1 + 1000 * 2.2);
    expect(partial.grossValue).toBe(2200);
    expect(partial.grossValue).toBeLessThan(full.grossValue);
  });

  it("sans ref client distincte, la concentration top 10 est maximale", () => {
    const sameKey = value({
      lines: [
        line({ clientKey: "same", carrier: "A", annualCommission: 50 }),
        line({ clientKey: "same", carrier: "B", annualCommission: 50 }),
      ],
    });
    expect(sameKey.metrics.top10Share).toBe(1);
  });
});
