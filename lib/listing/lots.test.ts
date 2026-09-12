import { describe, expect, it } from "vitest";
import {
  availableCarriers,
  buildCarrierLots,
  fullyCommitted,
  lotsOverlap,
  lotsTotalCommission,
  proRataPrice,
  selectionLabel,
  summarizeSelection,
  type ContractLineLike,
} from "@/lib/listing/lots";

const LIGNES: ContractLineLike[] = [
  { carrier: "AXA", annualCommission: 6_000 },
  { carrier: "AXA", annualCommission: 4_000 },
  { carrier: "Generali", annualCommission: 3_000 },
  { carrier: "Alptis", annualCommission: 1_000 },
];

describe("découpage par fournisseur", () => {
  it("regroupe les lignes et compte les contrats", () => {
    const lots = buildCarrierLots(LIGNES);
    expect(lots).toHaveLength(3);
    const axa = lots.find((l) => l.carrier === "AXA");
    expect(axa?.annualCommission).toBe(10_000);
    expect(axa?.contractCount).toBe(2);
  });

  it("classe du plus gros lot au plus petit", () => {
    expect(buildCarrierLots(LIGNES).map((l) => l.carrier)).toEqual(["AXA", "Generali", "Alptis"]);
  });

  it("départage à commissions égales par ordre alphabétique", () => {
    // Sans ce second critere, l'ordre changerait d'un chargement a l'autre.
    const lots = buildCarrierLots([
      { carrier: "Zurich", annualCommission: 500 },
      { carrier: "Abeille", annualCommission: 500 },
    ]);
    expect(lots.map((l) => l.carrier)).toEqual(["Abeille", "Zurich"]);
  });

  it("donne la part de chaque lot", () => {
    const lots = buildCarrierLots(LIGNES);
    expect(lots.find((l) => l.carrier === "AXA")?.share).toBeCloseTo(0.714, 3);
    expect(lotsTotalCommission(lots)).toBe(14_000);
  });

  it("ignore un fournisseur vide plutôt que de créer un lot fantôme", () => {
    const lots = buildCarrierLots([...LIGNES, { carrier: "  ", annualCommission: 900 }]);
    expect(lots).toHaveLength(3);
  });

  it("ne divise pas par zéro sur un portefeuille sans commission", () => {
    const lots = buildCarrierLots([{ carrier: "AXA", annualCommission: 0 }]);
    expect(lots[0].share).toBe(0);
  });
});

describe("sélection d’un lot", () => {
  const lots = buildCarrierLots(LIGNES);

  it("additionne ce qui est retenu", () => {
    const s = summarizeSelection(lots, ["AXA", "Alptis"]);
    expect(s.annualCommission).toBe(11_000);
    expect(s.contractCount).toBe(3);
    expect(s.share).toBeCloseTo(0.786, 3);
  });

  it("reconnaît le portefeuille entier", () => {
    expect(summarizeSelection(lots, ["AXA", "Generali", "Alptis"]).full).toBe(true);
    expect(summarizeSelection(lots, ["AXA"]).full).toBe(false);
  });

  it("ignore un fournisseur inconnu au lieu de gonfler la part", () => {
    // La selection vient d'un formulaire : elle ne doit jamais faire autorite.
    const s = summarizeSelection(lots, ["AXA", "Fournisseur Inexistant"]);
    expect(s.carriers).toEqual(["AXA"]);
    expect(s.annualCommission).toBe(10_000);
  });

  it("rend une sélection vide sans se plaindre", () => {
    const s = summarizeSelection(lots, []);
    expect(s.annualCommission).toBe(0);
    expect(s.full).toBe(false);
  });
});

describe("prix indicatif au prorata", () => {
  it("suit la part des commissions", () => {
    expect(proRataPrice(140_000, 0.5)).toBe(70_000);
  });

  it("borne la part entre zéro et un", () => {
    expect(proRataPrice(140_000, 1.4)).toBe(140_000);
    expect(proRataPrice(140_000, -1)).toBe(0);
  });

  it("rend zéro sur un prix absent ou absurde", () => {
    expect(proRataPrice(0, 0.5)).toBe(0);
    expect(proRataPrice(Number.NaN, 0.5)).toBe(0);
  });

  it("arrondit au centime", () => {
    expect(proRataPrice(10_000, 1 / 3)).toBe(3_333.33);
  });
});

describe("cessions simultanées sur une même annonce", () => {
  const lots = buildCarrierLots(LIGNES);

  it("détecte un fournisseur déjà engagé", () => {
    expect(lotsOverlap(["AXA", "Generali"], ["Generali"])).toBe(true);
    expect(lotsOverlap(["AXA"], ["Generali", "Alptis"])).toBe(false);
  });

  it("laisse libres les fournisseurs non engagés", () => {
    expect(availableCarriers(lots, [["AXA"]])).toEqual(["Generali", "Alptis"]);
  });

  it("ne ferme l’annonce qu’une fois tout engagé", () => {
    expect(fullyCommitted(lots, [["AXA"]])).toBe(false);
    expect(fullyCommitted(lots, [["AXA"], ["Generali", "Alptis"]])).toBe(true);
  });

  it("ne considère pas comme engagé un portefeuille sans lot", () => {
    expect(fullyCommitted([], [])).toBe(false);
  });
});

describe("libellé montré au cédant", () => {
  const lots = buildCarrierLots(LIGNES);

  it("nomme le portefeuille entier", () => {
    expect(selectionLabel(summarizeSelection(lots, ["AXA", "Generali", "Alptis"]), lots)).toBe(
      "Portefeuille entier",
    );
  });

  it("dit combien de fournisseurs et quelle part", () => {
    const libelle = selectionLabel(summarizeSelection(lots, ["AXA"]), lots);
    expect(libelle).toContain("1 fournisseur sur 3");
    expect(libelle).toContain("71 %");
  });

  it("le dit quand rien n’est retenu", () => {
    expect(selectionLabel(summarizeSelection(lots, []), lots)).toBe("Aucun fournisseur retenu");
  });
});
