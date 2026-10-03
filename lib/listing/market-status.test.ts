import { describe, expect, it } from "vitest";
import { MARKET_STATUS_LABELS, marketStatus } from "@/lib/listing/market-status";

const now = new Date("2026-09-13T10:00:00Z");
const dans = (jours: number) => new Date(now.getTime() + jours * 86_400_000);

describe("statut de cotation", () => {
  it("n’a que trois états publics", () => {
    const etats = new Set(
      (["PUBLISHED", "OFFERS_OPEN", "OFFERS_CLOSED", "UNDER_NEGOTIATION", "SOLD"] as const).map(
        (status) => marketStatus({ status, now }).label,
      ),
    );
    expect([...etats].sort()).toEqual(["Acquéreur positionné", "Disponible", "Vendu"]);
  });

  it("reste disponible quelle que soit l’ancienne fenêtre d’offres", () => {
    for (const status of ["OFFERS_CLOSED", "PUBLISHED", "OFFERS_OPEN"] as const) {
      const s = marketStatus({ status, offerWindowClosesAt: dans(-3), now });
      expect(s.label).toBe("Disponible");
      expect(s.tradable).toBe(true);
      expect(s.detail).not.toContain("Clôture");
    }
  });

  it("ferme la position dès qu’un acquéreur s’est positionné ou que le portefeuille est vendu", () => {
    const vendu = marketStatus({ status: "SOLD", now });
    expect(vendu.label).toBe("Vendu");
    expect(vendu.tradable).toBe(false);
    const positionne = marketStatus({ status: "UNDER_NEGOTIATION", now });
    expect(positionne.label).toBe("Acquéreur positionné");
    expect(positionne.tradable).toBe(false);
  });

  it("garde le même vocabulaire dans les tableaux", () => {
    expect(MARKET_STATUS_LABELS.OFFERS_CLOSED).toBe("Disponible");
    expect(MARKET_STATUS_LABELS.UNDER_NEGOTIATION).toBe("Acquéreur positionné");
    expect(MARKET_STATUS_LABELS.SOLD).toBe("Vendu");
  });
});
