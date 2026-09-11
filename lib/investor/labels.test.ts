import { describe, expect, it } from "vitest";
import { formatInvestorTicket } from "@/lib/investor/labels";

describe("formatInvestorTicket", () => {
  it("affiche une fourchette ou une borne seule", () => {
    expect(formatInvestorTicket(20000, 200000)).toMatch(/20/);
    expect(formatInvestorTicket(null, null)).toBe("Non renseigné");
    expect(formatInvestorTicket(50000, null)).toContain("50");
  });
});
