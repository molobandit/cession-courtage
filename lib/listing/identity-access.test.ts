import { describe, expect, it } from "vitest";
import { canReadCedantIdentity } from "@/lib/listing/identity-access";

describe("canReadCedantIdentity", () => {
  it("ouvre le cédant au propriétaire", () => {
    expect(
      canReadCedantIdentity({ isOwner: true, canBuy: false, subscribed: false, hasDeposit: false }),
    ).toBe(true);
  });

  it("garde l’anonymat pour un abonné sans dépôt de 2,5 %", () => {
    expect(
      canReadCedantIdentity({ isOwner: false, canBuy: true, subscribed: true, hasDeposit: false }),
    ).toBe(false);
  });

  it("révèle le cédant dès le dépôt, si l’acquéreur est abonné", () => {
    expect(
      canReadCedantIdentity({ isOwner: false, canBuy: true, subscribed: true, hasDeposit: true }),
    ).toBe(true);
  });

  it("n’ouvre rien sans abonnement, même avec un dépôt", () => {
    expect(
      canReadCedantIdentity({ isOwner: false, canBuy: true, subscribed: false, hasDeposit: true }),
    ).toBe(false);
  });

  it("ouvre le cédant à l’investisseur dès le dépôt, sans abonnement courtier", () => {
    expect(
      canReadCedantIdentity({
        isOwner: false,
        canBuy: false,
        subscribed: false,
        hasDeposit: true,
        isInvestor: true,
      }),
    ).toBe(true);
  });

  it("garde l’anonymat pour un investisseur sans dépôt", () => {
    expect(
      canReadCedantIdentity({
        isOwner: false,
        canBuy: false,
        subscribed: false,
        hasDeposit: false,
        isInvestor: true,
      }),
    ).toBe(false);
  });
});
