import { describe, expect, it } from "vitest";
import { MARKET_STATUS_LABELS, marketStatus } from "@/lib/listing/market-status";

const now = new Date("2026-09-13T10:00:00Z");
const dans = (jours: number) => new Date(now.getTime() + jours * 86_400_000);

describe("statut de cotation", () => {
  it("compte à rebours pendant la séance", () => {
    const s = marketStatus({ status: "OFFERS_OPEN", offerWindowClosesAt: dans(5), now });
    expect(s.label).toBe("Séance en cours");
    expect(s.detail).toBe("Clôture dans 5 jours");
    expect(s.tradable).toBe(true);
  });

  it("reste ouvert une fois la séance scellée terminée", () => {
    for (const status of ["OFFERS_CLOSED", "PUBLISHED"] as const) {
      const s = marketStatus({ status, offerWindowClosesAt: dans(-3), now });
      expect(s.label).toBe("Offres ouvertes");
      expect(s.detail).not.toContain("Clôture");
    }
    expect(marketStatus({ status: "OFFERS_OPEN", offerWindowClosesAt: dans(-1), now }).tone).toBe("open");
  });

  it("n’affiche jamais de compte à rebours sur un portefeuille vendu ou en négociation", () => {
    const vendu = marketStatus({ status: "SOLD", offerWindowClosesAt: dans(15), now });
    expect(vendu.label).toBe("Vendu");
    expect(vendu.detail).not.toContain("Clôture");
    expect(vendu.tradable).toBe(false);
    expect(marketStatus({ status: "UNDER_NEGOTIATION", offerWindowClosesAt: dans(15), now }).tradable).toBe(false);
  });

  it("garde le même vocabulaire dans les tableaux", () => {
    expect(MARKET_STATUS_LABELS.OFFERS_CLOSED).toBe("Offres ouvertes");
    expect(MARKET_STATUS_LABELS.SOLD).toBe("Vendu");
  });
});
