import { describe, expect, it } from "vitest";
import { hasQualityFigures, qualityFactRows, qualityFromPortfolio } from "@/lib/portfolio/quality";

describe("qualité financière du portefeuille", () => {
  it("ignore les champs vides", () => {
    const q = qualityFromPortfolio({});
    expect(hasQualityFigures(q)).toBe(false);
    expect(qualityFactRows(q)).toEqual([]);
  });

  it("affiche trois montants et la part du récurrent, pas un pourcentage d'évolution", () => {
    const q = qualityFromPortfolio({
      commissionsYear1: 80000,
      commissionsYear2: 85000,
      commissionsYear3: 90000,
      recurrentCommissionShare: 0.7,
      managedAnnualPremium: 500000,
    });
    const labels = qualityFactRows(q).map((r) => r.label);
    expect(labels).toContain("Commissions, exercice N-2");
    expect(labels).toContain("Prime annuelle gérée");
    expect(qualityFactRows(q).some((r) => r.value.includes("% des commissions"))).toBe(true);
  });
});
