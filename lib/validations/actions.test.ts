import { describe, expect, it } from "vitest";
import {
  idSchema,
  investorInquirySchema,
  listingCreateSchema,
  listingPriceSchema,
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

  it("accepte une offre sans message, au comptant du sequestre par defaut", () => {
    const parsed = offerSchema.safeParse({ listingId: "l1", amount: "45 000" });
    expect(parsed.success).toBe(true);
    if (parsed.success) {
      expect(parsed.data.message).toBe("");
      expect(parsed.data.upfrontPercent).toBe(100);
      expect(parsed.data.effectiveDate).toBeNull();
    }
  });

  it("refuse une date d'effet passee", () => {
    const parsed = offerSchema.safeParse({ listingId: "l1", amount: "45 000", effectiveDate: "2020-01-01" });
    expect(parsed.success).toBe(false);
  });
});

describe("listingPriceSchema", () => {
  it("arrondit le prix fixé par l'équipe à l'euro entier", () => {
    expect(listingPriceSchema.safeParse("45 000,60")).toEqual({ success: true, data: 45001 });
  });

  it("refuse un prix hors fourchette", () => {
    expect(listingPriceSchema.safeParse("500").success).toBe(false);
    expect(listingPriceSchema.safeParse("250 000").success).toBe(false);
  });
});

describe("listingCreateSchema", () => {
  it("ne demande aucun prix au cédant", () => {
    const parsed = listingCreateSchema.safeParse({ portfolioId: "pf_01", sellerSupportMonths: 6, precompte: "no" });
    expect(parsed.success).toBe(true);
    if (parsed.success) expect("askingPrice" in parsed.data).toBe(false);
  });

  it("exige de dire si les commissions sont linéaires ou en précompte", () => {
    const base = { portfolioId: "pf_01", sellerSupportMonths: 3 };
    const sans = listingCreateSchema.safeParse(base);
    expect(sans.success).toBe(false);
    if (!sans.success) expect(sans.error.issues[0]!.message).toContain("linéaires ou en précompte");
    const avec = listingCreateSchema.safeParse({ ...base, precompte: "yes" });
    expect(avec.success && avec.data.precompte).toBe(true);
  });

  it("refuse un accompagnement aberrant", () => {
    const parsed = listingCreateSchema.safeParse({
      portfolioId: "pf_01",
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

describe("investorInquirySchema", () => {
  const base = {
    organisation: "Expansion Capital",
    fullName: "Camille Dupont",
    email: "camille@expansion.demo",
    investorType: "FUND",
    zones: "Île-de-France, Rhône",
    intervention: "ACQUISITION",
  };

  it("accepte une manifestation sans ticket", () => {
    expect(investorInquirySchema.safeParse(base).success).toBe(true);
  });

  it("refuse un ticket min superieur au max", () => {
    expect(
      investorInquirySchema.safeParse({
        ...base,
        ticketMinEur: "80 000",
        ticketMaxEur: "20 000",
      }).success,
    ).toBe(false);
  });
});
