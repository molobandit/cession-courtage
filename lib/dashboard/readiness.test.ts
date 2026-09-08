import { describe, expect, it } from "vitest";
import { readinessAxes, readinessScore, type ReadinessInput } from "@/lib/dashboard/readiness";

const empty: ReadinessInput = {
  portfolioCount: 0,
  valuedCount: 0,
  publishedListings: 0,
  carrierCodesTotal: 0,
  carrierCodesDecided: 0,
  checklistRequired: 0,
  checklistProvided: 0,
  firstPortfolioId: null,
};

describe("readinessAxes", () => {
  it("produit toujours les quatre axes", () => {
    expect(readinessAxes(empty).map((a) => a.key)).toEqual([
      "portefeuille",
      "valorisation",
      "codes",
      "pieces",
    ]);
  });

  it("un compte vierge est à zéro et renvoie vers l'import", () => {
    const axes = readinessAxes(empty);
    expect(axes.every((a) => a.share === 0)).toBe(true);
    expect(axes[0]!.href).toBe("/app/import");
    expect(readinessScore(axes)).toBe(0);
  });

  it("compte le portefeuille comme acquis dès le premier import", () => {
    const axes = readinessAxes({ ...empty, portfolioCount: 1, firstPortfolioId: "pf_01" });
    expect(axes[0]!.share).toBe(1);
    expect(axes[0]!.href).toBe("/app/portefeuilles/pf_01");
  });

  it("chiffre les compagnies qui n'ont pas répondu", () => {
    const axes = readinessAxes({
      ...empty,
      portfolioCount: 1,
      firstPortfolioId: "pf_01",
      carrierCodesTotal: 12,
      carrierCodesDecided: 3,
    });
    expect(axes[2]!.share).toBeCloseTo(0.25, 5);
    expect(axes[2]!.detail).toContain("9 compagnies");
  });

  it("accorde le singulier sur une seule compagnie restante", () => {
    const axes = readinessAxes({ ...empty, carrierCodesTotal: 2, carrierCodesDecided: 1 });
    expect(axes[2]!.detail).toContain("1 compagnie n’ont");
  });

  it("borne l'avancement à 100 % même si les compteurs se dépassent", () => {
    const axes = readinessAxes({ ...empty, checklistRequired: 5, checklistProvided: 9 });
    expect(axes[3]!.share).toBe(1);
  });

  it("ne divise pas par zéro sans portefeuille", () => {
    expect(readinessAxes({ ...empty, valuedCount: 0 })[1]!.share).toBe(0);
  });

  it("la moyenne des quatre axes donne l'état d'ensemble", () => {
    const axes = readinessAxes({
      ...empty,
      portfolioCount: 1,
      valuedCount: 1,
      firstPortfolioId: "pf_01",
      carrierCodesTotal: 4,
      carrierCodesDecided: 2,
      checklistRequired: 10,
      checklistProvided: 0,
    });
    // 1 + 1 + 0,5 + 0 sur 4.
    expect(readinessScore(axes)).toBeCloseTo(0.625, 5);
  });
});
