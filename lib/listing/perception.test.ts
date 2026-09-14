import { describe, expect, it } from "vitest";
import { commissionPerceptionCopy, perceptionMode, precompteFromContracts } from "@/lib/listing/perception";

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
    expect(copy.modeLine).toBe("Mode de perception : Précompte");
    expect(copy.amountLine).toContain("40");
  });
});

describe("linéaire ou précompte d’après les contrats", () => {
  it("garde ce que le cédant a déclaré", () => {
    expect(precompteFromContracts(false, 900, 1000)).toBe(false);
    expect(precompteFromContracts(true, 0, 1000)).toBe(true);
  });

  it("à défaut, suit la majorité des commissions du bordereau", () => {
    expect(precompteFromContracts(null, 620, 1000)).toBe(true);
    expect(precompteFromContracts(null, 70, 1000)).toBe(false);
    expect(precompteFromContracts(null, 0, 0)).toBeNull();
  });
});
