import { describe, expect, it } from "vitest";
import { hasForbiddenDash, PARTNERS, TRUST_PILLARS } from "./catalog";
import { PAYMENT_FAQ } from "./faq";

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
  });

  it("couvre le circuit Assurdeal adapté à la bourse", () => {
    const ids = PARTNERS.map((partner) => partner.id);
    expect(ids).toEqual(["stripe", "trustap", "yousign", "docusign", "identity", "financing"]);
  });
});
