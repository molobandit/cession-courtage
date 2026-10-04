import { describe, expect, it } from "vitest";
import { canReadCedantIdentity, depositReleasesIdentity } from "@/lib/listing/identity-access";

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

describe("dépôt reçu par le trust", () => {
  it("lève l'anonymat seulement une fois payé quand le paiement est branché", () => {
    expect(depositReleasesIdentity("PAID", true)).toBe(true);
    expect(depositReleasesIdentity("PROCESSING", true)).toBe(false);
    expect(depositReleasesIdentity("RECORDED", true)).toBe(false);
  });

  it("accepte un dépôt enregistré sur un site sans paiement en ligne", () => {
    expect(depositReleasesIdentity("RECORDED", false)).toBe(true);
    expect(depositReleasesIdentity("PROCESSING", false)).toBe(false);
  });
});
