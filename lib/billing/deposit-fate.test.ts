import { describe, expect, it } from "vitest";
import {
  depositCoversUpfront,
  depositOutcome,
  depositOutcomeLabel,
  depositTerms,
  escrowAmountAfterDeposit,
} from "@/lib/billing/deposit-fate";

describe("issue du dépôt", () => {
  it("reste en attente tant que rien n’est tranché", () => {
    expect(depositOutcome({ dealClosed: false, buyerWithdrew: false })).toBe("PENDING");
  });

  it("vient en déduction du prix quand la cession aboutit", () => {
    expect(depositOutcome({ dealClosed: true, buyerWithdrew: false })).toBe("DEDUCTED");
  });

  it("reste au cédant si l’acquéreur se retire", () => {
    expect(depositOutcome({ dealClosed: false, buyerWithdrew: true })).toBe("RETAINED");
  });

  it("la cession close l’emporte sur un retrait tardif", () => {
    // On ne se retire pas d'une cession deja close : le depot a joue son role.
    expect(depositOutcome({ dealClosed: true, buyerWithdrew: true })).toBe("DEDUCTED");
  });
});

describe("imputation sur le séquestre", () => {
  it("retire le dépôt du comptant à verser", () => {
    expect(escrowAmountAfterDeposit(50_000, 2_500)).toBe(47_500);
  });

  it("ne fait jamais payer deux fois", () => {
    // Le depot fait partie du prix : l'ignorer doublerait la mise.
    expect(escrowAmountAfterDeposit(2_500, 2_500)).toBe(0);
    expect(depositCoversUpfront(2_500, 2_500)).toBe(true);
  });

  it("ne descend pas sous zéro", () => {
    expect(escrowAmountAfterDeposit(1_000, 4_000)).toBe(0);
  });

  it("ignore un dépôt absent ou absurde", () => {
    expect(escrowAmountAfterDeposit(50_000, 0)).toBe(50_000);
    expect(escrowAmountAfterDeposit(50_000, Number.NaN)).toBe(50_000);
    expect(escrowAmountAfterDeposit(50_000, -100)).toBe(50_000);
  });

  it("rend zéro sur un comptant absent", () => {
    expect(escrowAmountAfterDeposit(0, 2_500)).toBe(0);
    expect(depositCoversUpfront(0, 2_500)).toBe(false);
  });

  it("arrondit au centime", () => {
    expect(escrowAmountAfterDeposit(10_000, 3_333.335)).toBe(6_666.67);
  });
});

describe("ce qui est dit avant le versement", () => {
  it("annonce les deux issues, pas seulement la bonne", () => {
    const regles = depositTerms("2 500 €");
    expect(regles.join(" ")).toContain("déduction du prix");
    expect(regles.join(" ")).toContain("indemnitaire");
  });

  it("reprend le montant exact", () => {
    expect(depositTerms("2 500 €")[0]).toContain("2 500 €");
  });

  it("nomme chaque issue", () => {
    expect(depositOutcomeLabel("DEDUCTED")).toBe("Déduit du prix");
    expect(depositOutcomeLabel("RETAINED")).toContain("indemnitaire");
    expect(depositOutcomeLabel("PENDING")).toContain("attente");
  });
});
