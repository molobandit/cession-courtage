import { describe, expect, it } from "vitest";
import { roundMoney, sumMoney, toCents } from "@/lib/format/money";

describe("sumMoney", () => {
  it("ne derive pas la ou une addition flottante derive", () => {
    const amounts = [0.1, 0.2];
    expect(0.1 + 0.2).not.toBe(0.3);
    expect(sumMoney(amounts)).toBe(0.3);
  });

  it("reste exact sur un grand nombre de lignes", () => {
    const amounts = Array.from({ length: 1400 }, () => 32.33);
    expect(sumMoney(amounts)).toBe(45262);
    // L'addition naive s'ecarte du centime sur ce volume.
    const naive = amounts.reduce((s, a) => s + a, 0);
    expect(Math.abs(naive - 45262)).toBeGreaterThan(0);
  });

  it("somme une liste vide sans erreur", () => {
    expect(sumMoney([])).toBe(0);
  });
});

describe("toCents / roundMoney", () => {
  it("arrondit au centime", () => {
    expect(toCents(12.345)).toBe(1235);
    expect(roundMoney(12.344)).toBe(12.34);
  });
});
