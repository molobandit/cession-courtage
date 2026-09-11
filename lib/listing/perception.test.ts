import { describe, expect, it } from "vitest";
import { commissionPerceptionCopy, perceptionMode } from "@/lib/listing/perception";

describe("perceptionMode", () => {
  it("distingue linéaire, précompté et non précisé", () => {
    expect(perceptionMode(false)).toBe("LINEAR");
    expect(perceptionMode(true)).toBe("PRECOMPTE");
    expect(perceptionMode(null)).toBe("UNSTATED");
  });
});

describe("commissionPerceptionCopy", () => {
  it("affiche les commissions et le mode linéaire", () => {
    const copy = commissionPerceptionCopy({ annualCommissions: 153000, precompte: false });
    expect(copy.annualLine).toContain("153");
    expect(copy.modeLine).toBe("Mode de perception : Linéaire");
    expect(copy.amountLine).toBeNull();
  });

  it("ajoute le montant précompté lorsqu’il est renseigné", () => {
    const copy = commissionPerceptionCopy({
      annualCommissions: 153000,
      precompte: true,
      precompteAmount: "40000",
    });
    expect(copy.modeLine).toBe("Mode de perception : Précompté");
    expect(copy.amountLine).toContain("40");
  });
});
