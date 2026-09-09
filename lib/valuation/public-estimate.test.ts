import { describe, expect, it } from "vitest";
import { estimatePublicRange } from "@/lib/valuation/public-estimate";

describe("estimatePublicRange", () => {
  // Repere de non-regression impose par CLAUDE.md.
  it("45 000 en particuliers donne 72 675 / 85 500 / 98 325", () => {
    const result = estimatePublicRange(45000, "INDIVIDUAL");
    expect(result.low).toBe(72675);
    expect(result.mid).toBe(85500);
    expect(result.high).toBe(98325);
  });

  it("garde la fourchette a -15 % / +15 % autour du point median", () => {
    const result = estimatePublicRange(20000, "PROFESSIONAL");
    expect(result.mid).toBe(46000);
    expect(result.low).toBe(39100);
    expect(result.high).toBe(52900);
  });

  it("renvoie zero sur une saisie vide ou negative", () => {
    expect(estimatePublicRange(0, "INDIVIDUAL").mid).toBe(0);
    expect(estimatePublicRange(-5, "COMPANY").mid).toBe(0);
  });
});
