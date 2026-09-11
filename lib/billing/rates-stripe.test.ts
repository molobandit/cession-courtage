import { describe, expect, it } from "vitest";
import {
  GROWTH_PLAN_ANNUAL_EUR,
  INTEREST_DEPOSIT_RATE,
  growthPlanAnnualTtcCents,
  growthPlanAnnualTtcEur,
  interestDepositFor,
} from "@/lib/billing/rates";

describe("abonnement Stripe", () => {
  it("facture 250 € HT soit 300 € TTC", () => {
    expect(GROWTH_PLAN_ANNUAL_EUR).toBe(250);
    expect(growthPlanAnnualTtcEur()).toBe(300);
    expect(growthPlanAnnualTtcCents()).toBe(30000);
  });

  it("calcule le dépôt d’intérêt à 2,5 % du prix de cession", () => {
    expect(INTEREST_DEPOSIT_RATE).toBe(0.025);
    expect(interestDepositFor(100_000)).toBe(2500);
  });
});
