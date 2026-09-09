import { describe, expect, it } from "vitest";
import {
  buildCarrierCodes,
  carrierRisk,
  type CarrierStatus,
} from "@/lib/portfolio/carrier-codes";

const lines = [
  { carrier: "AXA", annualCommission: 600 },
  { carrier: "AXA", annualCommission: 400 },
  { carrier: "Allianz", annualCommission: 300 },
  { carrier: "Generali", annualCommission: 200 },
];

describe("buildCarrierCodes", () => {
  it("construit la liste depuis les contrats, jamais depuis le suivi", () => {
    const rows = buildCarrierCodes(lines, []);
    expect(rows.map((r) => r.carrier).sort()).toEqual(["AXA", "Allianz", "Generali"].sort());
    // Une compagnie inconnue du suivi est a informer : l'oubli est impossible.
    expect(rows.every((r) => r.status === "PENDING")).toBe(true);
  });

  it("agrege les commissions et les parts par compagnie", () => {
    const rows = buildCarrierCodes(lines, []);
    const axa = rows.find((r) => r.carrier === "AXA")!;
    expect(axa.commissions).toBe(1000);
    expect(axa.contracts).toBe(2);
    expect(axa.share).toBeCloseTo(1000 / 1500, 5);
  });

  it("remonte les refus en tete, puis ce qui reste a faire", () => {
    const rows = buildCarrierCodes(lines, [
      { carrier: "AXA", status: "AGREED" },
      { carrier: "Generali", status: "REFUSED" },
    ]);
    expect(rows[0]!.carrier).toBe("Generali");
    expect(rows[0]!.status).toBe("REFUSED");
    expect(rows[rows.length - 1]!.carrier).toBe("AXA");
  });

  it("ignore un etat portant sur une compagnie absente du portefeuille", () => {
    const rows = buildCarrierCodes(lines, [{ carrier: "Swiss Life", status: "AGREED" }]);
    expect(rows.find((r) => r.carrier === "Swiss Life")).toBeUndefined();
  });

  it("remplace une compagnie vide par un libelle lisible", () => {
    const rows = buildCarrierCodes([{ carrier: "", annualCommission: 10 }], []);
    expect(rows[0]!.carrier).toBe("Non renseignée");
  });
});

describe("carrierRisk", () => {
  function rows(states: [string, number, CarrierStatus][]) {
    return buildCarrierCodes(
      states.map(([carrier, c]) => ({ carrier, annualCommission: c })),
      states.map(([carrier, , status]) => ({ carrier, status })),
    );
  }

  it("chiffre le risque en euros, pas en nombre de compagnies", () => {
    const risk = carrierRisk(
      rows([
        ["AXA", 1000, "AGREED"],
        ["Allianz", 300, "REFUSED"],
        ["Generali", 200, "PENDING"],
      ]),
    );
    expect(risk.securedCommissions).toBe(1000);
    expect(risk.lostCommissions).toBe(300);
    expect(risk.atRiskCommissions).toBe(200);
    expect(risk.securedShare).toBeCloseTo(1000 / 1500, 5);
  });

  it("compte une compagnie informée comme encore suspendue", () => {
    const risk = carrierRisk(rows([["AXA", 500, "NOTIFIED"]]));
    expect(risk.atRiskCommissions).toBe(500);
    expect(risk.securedCommissions).toBe(0);
    expect(risk.pending).toBe(1);
  });

  it("ne divise pas par zéro sur un portefeuille vide", () => {
    const risk = carrierRisk([]);
    expect(risk.securedShare).toBe(0);
    expect(risk.total).toBe(0);
  });
});
