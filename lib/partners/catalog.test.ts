import { describe, expect, it } from "vitest";
import {
  CESSION_FUNDS_DISCLAIMER,
  depositPaymentRail,
  hasForbiddenDash,
  LIVE_BADGE,
  PARTNERS,
  READY_BADGE,
  TRUST_PILLARS,
} from "./catalog";
import { PAYMENT_FAQ, PAYMENT_FAQ_ANCHOR } from "./faq";
import { PARTNER_ADAPTERS } from "./adapters";

describe("partner public copy", () => {
  it("n’utilise pas de tiret dans les phrases", () => {
    for (const partner of PARTNERS) {
      expect(hasForbiddenDash(partner.role), partner.id).toBe(false);
      expect(hasForbiddenDash(partner.purpose), partner.id).toBe(false);
      expect(hasForbiddenDash(partner.detail), partner.id).toBe(false);
    }
    for (const pillar of TRUST_PILLARS) {
      expect(hasForbiddenDash(pillar.title)).toBe(false);
      expect(hasForbiddenDash(pillar.body)).toBe(false);
    }
    for (const item of PAYMENT_FAQ) {
      expect(hasForbiddenDash(item.q)).toBe(false);
      expect(hasForbiddenDash(item.a)).toBe(false);
    }
    expect(hasForbiddenDash(CESSION_FUNDS_DISCLAIMER)).toBe(false);
    expect(hasForbiddenDash(LIVE_BADGE)).toBe(false);
    expect(hasForbiddenDash(READY_BADGE)).toBe(false);
  });

  it("envoie le dépôt sous 999 euros vers Stripe, le reste vers Trustap", () => {
    expect(depositPaymentRail(0)).toBe("stripe");
    expect(depositPaymentRail(998)).toBe("stripe");
    expect(depositPaymentRail(998.99)).toBe("stripe");
    expect(depositPaymentRail(999)).toBe("trustap");
    expect(depositPaymentRail(2500)).toBe("trustap");
  });

  it("nomme les six prestataires du circuit de confiance", () => {
    expect(PARTNERS.map((partner) => partner.name)).toEqual([
      "Stripe",
      "Trustap",
      "Yousign",
      "DocuSign",
      "Ondorse",
      "CrediPro",
    ]);
  });

  it("ne déclare pas actifs les rails sans adaptateur", () => {
    expect(PARTNER_ADAPTERS.stripe).toBe(true);
    expect(PARTNER_ADAPTERS.trustap).toBe(false);
    expect(PARTNER_ADAPTERS.yousign).toBe(false);
    expect(PARTNER_ADAPTERS.docusign).toBe(false);
    expect(PARTNER_ADAPTERS.identity).toBe(false);
    expect(PARTNER_ADAPTERS.financing).toBe(false);
    expect(PAYMENT_FAQ_ANCHOR).toBe("paiement-et-signatures");
  });
});
