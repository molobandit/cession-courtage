import { describe, expect, it } from "vitest";
import {
  idSchema,
  listingCreateSchema,
  offerSchema,
  retentionReportSchema,
} from "@/lib/validations/actions";

describe("idSchema", () => {
  it("refuse une valeur vide ou hors jeu de caracteres", () => {
    expect(idSchema.safeParse("").success).toBe(false);
    expect(idSchema.safeParse("../../etc/passwd").success).toBe(false);
    expect(idSchema.safeParse("' OR 1=1").success).toBe(false);
    expect(idSchema.safeParse("a".repeat(65)).success).toBe(false);
  });

  it("accepte un cuid", () => {
    expect(idSchema.safeParse("clx1a2b3c4d5e6f7g8h9").success).toBe(true);
  });
});

describe("offerSchema", () => {
  it("refuse un montant hors de la fourchette 2 000 a 200 000", () => {
    const base = { listingId: "listing_1", upfrontPercent: "50", message: "Proposition ferme." };
    expect(offerSchema.safeParse({ ...base, amount: "1 999" }).success).toBe(false);
    expect(offerSchema.safeParse({ ...base, amount: "200 001" }).success).toBe(false);
    expect(offerSchema.safeParse({ ...base, amount: "45 000" }).success).toBe(true);
  });

  it("lit le format francais avec espace et virgule", () => {
    const parsed = offerSchema.safeParse({
      listingId: "listing_1",
      amount: "45 000,50",
      upfrontPercent: "60",
      message: "Proposition ferme.",
    });
    expect(parsed.success).toBe(true);
    if (parsed.success) expect(parsed.data.amount).toBe(45000.5);
  });

  it("refuse un comptant hors 0 a 100 %", () => {
    const base = { listingId: "l1", amount: "45 000", message: "Proposition ferme." };
    expect(offerSchema.safeParse({ ...base, upfrontPercent: "101" }).success).toBe(false);
    expect(offerSchema.safeParse({ ...base, upfrontPercent: "-1" }).success).toBe(false);
  });

  it("refuse un message de moins de dix caracteres", () => {
    const parsed = offerSchema.safeParse({
      listingId: "l1",
      amount: "45 000",
      upfrontPercent: "50",
      message: "court",
    });
    expect(parsed.success).toBe(false);
  });
});

describe("listingCreateSchema", () => {
  it("arrondit le prix demande a l'euro entier", () => {
    const parsed = listingCreateSchema.safeParse({
      portfolioId: "pf_01",
      askingPrice: "45 000,60",
      sellerSupportMonths: 6,
    });
    expect(parsed.success).toBe(true);
    if (parsed.success) expect(parsed.data.askingPrice).toBe(45001);
  });

  it("refuse un accompagnement aberrant", () => {
    const parsed = listingCreateSchema.safeParse({
      portfolioId: "pf_01",
      askingPrice: "45 000",
      sellerSupportMonths: 99,
    });
    expect(parsed.success).toBe(false);
  });
});

describe("retentionReportSchema", () => {
  it("n'accepte que les echeances M+3, M+6 et M+12", () => {
    const base = {
      dealId: "deal_01",
      contractsRetained: 80,
      contractsTransferred: 100,
      actualCommissions: "9 000",
    };
    expect(retentionReportSchema.safeParse({ ...base, monthIndex: 3 }).success).toBe(true);
    expect(retentionReportSchema.safeParse({ ...base, monthIndex: 9 }).success).toBe(false);
  });

  it("refuse plus de contrats conserves que transferes", () => {
    const parsed = retentionReportSchema.safeParse({
      dealId: "deal_01",
      monthIndex: 6,
      contractsRetained: 120,
      contractsTransferred: 100,
      actualCommissions: "9 000",
    });
    expect(parsed.success).toBe(false);
  });
});
