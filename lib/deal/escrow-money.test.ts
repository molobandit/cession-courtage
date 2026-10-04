import { describe, expect, it } from "vitest";
import { RETENTION_SHARE, dealMoney } from "@/lib/deal/escrow-money";

const MONTANT = 18_195;
const DEPOT = 454.88;

describe("où est l'argent d'un dossier", () => {
  it("ne compte que le dépôt tant que rien n'est versé", () => {
    const m = dealMoney({ stage: "DATA_ROOM", amount: MONTANT, deposit: DEPOT });
    expect(m.inTrust).toBe(DEPOT);
    expect(m.toFund).toBeCloseTo(MONTANT - DEPOT, 2);
    expect(m.paidToSeller).toBe(0);
  });

  it("compte le montant entier une fois les fonds au trust, dépôt déduit", () => {
    const m = dealMoney({ stage: "TRANSFER", amount: MONTANT, deposit: DEPOT, escrowStage: "FUNDS_HELD" });
    expect(m.inTrust).toBeCloseTo(MONTANT - DEPOT, 2);
    expect(m.toFund).toBe(0);
    expect(m.paidToSeller).toBe(0);
  });

  it("ne garde que le séquestre de conservation une fois la cession close", () => {
    const m = dealMoney({ stage: "CLOSED", amount: MONTANT, deposit: DEPOT, escrowStage: "RELEASED" });
    expect(m.retention).toBeCloseTo(MONTANT * RETENTION_SHARE, 2);
    expect(m.inTrust).toBe(m.retention);
    expect(m.paidToSeller).toBeCloseTo(MONTANT - m.retention, 2);
    expect(m.toFund).toBe(0);
    // Ce que l'écran affichait : le montant entier, sur une cession close.
    expect(m.inTrust).not.toBeCloseTo(MONTANT, 0);
  });

  it("donne les chiffres du dossier n° 10005", () => {
    const m = dealMoney({ stage: "CLOSED", amount: 18_195, deposit: 454.88 });
    expect(m.retention).toBe(3639);
    expect(m.paidToSeller).toBe(14_556);
    expect(m.inTrust).toBe(3639);
  });

  it("l'étape de rétention retient la même part", () => {
    const a = dealMoney({ stage: "RETENTION", amount: MONTANT, deposit: 0 });
    const b = dealMoney({ stage: "CLOSED", amount: MONTANT, deposit: 0 });
    expect(a.inTrust).toBe(b.inTrust);
  });

  it("ne tombe pas sur un montant absent ou un dépôt plus grand que lui", () => {
    expect(dealMoney({ stage: "DATA_ROOM", amount: 0, deposit: 0 }).inTrust).toBe(0);
    const trop = dealMoney({ stage: "DATA_ROOM", amount: 1000, deposit: 5000 });
    expect(trop.inTrust).toBe(1000);
    expect(trop.toFund).toBe(0);
  });
});
