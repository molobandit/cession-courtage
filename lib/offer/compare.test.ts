import { describe, expect, it } from "vitest";
import { barScale, cashSplit, rankOffers, vsAsking } from "@/lib/offer/compare";

describe("rankOffers", () => {
  it("place la meilleure offre déposée en tête, hors offre déjà retenue", () => {
    const ranked = rankOffers([
      { id: "a", amount: 10, upfrontPercent: 50, status: "SUBMITTED" },
      { id: "b", amount: 12, upfrontPercent: 70, status: "SUBMITTED" },
      { id: "c", amount: 9, upfrontPercent: 90, status: "ACCEPTED" },
    ]);
    expect(ranked.map((o) => o.id)).toEqual(["c", "b", "a"]);
  });
});

describe("vsAsking", () => {
  it("calcule l'écart au prix demandé", () => {
    expect(vsAsking(90, 100)).toEqual({ ratio: 0.9, delta: -10 });
    expect(vsAsking(100, 100).delta).toBe(0);
  });
});

describe("cashSplit", () => {
  it("sépare comptant et différé", () => {
    expect(cashSplit(100, 70)).toEqual({ cash: 70, deferred: 30 });
  });
});

describe("barScale", () => {
  it("prend le plus haut entre le demandé et les offres", () => {
    expect(barScale(100, [80, 120])).toBe(120);
    expect(barScale(100, [80])).toBe(100);
  });
});
