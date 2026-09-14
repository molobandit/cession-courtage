import { describe, expect, it } from "vitest";
import { offerReceivedCopy } from "@/lib/notify/copy";

describe("courriel d'offre reçue", () => {
  it("renvoie au carnet d’offres pendant la séance, sans montant", () => {
    const copy = offerReceivedCopy({ publicNumber: 10005, sealed: true });
    expect(copy.bodyText).toMatch(/carnet d’offres/);
    expect(copy.bodyText).not.toMatch(/\d[\d\s]*€/);
    expect(copy.bodyText).not.toMatch(/montant de/i);
  });

  it("invite à comparer une fois la fenêtre close, toujours sans chiffre", () => {
    const copy = offerReceivedCopy({ publicNumber: 10005, sealed: false });
    expect(copy.bodyText).toMatch(/comparer/);
    expect(copy.bodyText).not.toMatch(/\d[\d\s]*€/);
  });
});
