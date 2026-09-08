import { describe, expect, it } from "vitest";
import { buildChecklist, checklistProgress } from "@/lib/deal/due-diligence";

describe("buildChecklist", () => {
  it("couvre les quatre familles réclamées en vérification préalable", () => {
    const entries = buildChecklist([], false);
    const familles = new Set(entries.map((e) => e.category));
    expect(familles).toEqual(new Set(["LEGAL", "FINANCIAL", "PORTFOLIO", "OPERATIONAL"]));
  });

  it("exige une convention de courtage par compagnie", () => {
    const entries = buildChecklist(["AXA", "Allianz"], false);
    expect(entries.some((e) => e.label === "Convention de courtage AXA")).toBe(true);
    expect(entries.some((e) => e.label === "Convention de courtage Allianz")).toBe(true);
  });

  it("ne crée pas de doublon si une compagnie revient", () => {
    const entries = buildChecklist(["AXA", "AXA"], false);
    const conventions = entries.filter((e) => e.label === "Convention de courtage AXA");
    expect(conventions).toHaveLength(1);
  });

  it("ajoute le suivi décennal seulement quand le portefeuille en comporte", () => {
    expect(buildChecklist([], false).some((e) => e.label.includes("décennales"))).toBe(false);
    expect(buildChecklist([], true).some((e) => e.label.includes("décennales"))).toBe(true);
  });

  it("produit des libellés uniques, la contrainte de base l'impose", () => {
    const labels = buildChecklist(["AXA", "Generali"], true).map((e) => e.label);
    expect(new Set(labels).size).toBe(labels.length);
  });
});

describe("checklistProgress", () => {
  it("ne compte que les pièces obligatoires dans l'avancement", () => {
    const p = checklistProgress([
      { required: true, providedAt: new Date() },
      { required: true, providedAt: null },
      { required: false, providedAt: new Date() },
    ]);
    expect(p.requiredTotal).toBe(2);
    expect(p.requiredProvided).toBe(1);
    expect(p.share).toBe(0.5);
    expect(p.provided).toBe(2);
    expect(p.complete).toBe(false);
  });

  it("déclare complet quand toutes les pièces obligatoires sont fournies", () => {
    const p = checklistProgress([
      { required: true, providedAt: new Date() },
      { required: false, providedAt: null },
    ]);
    expect(p.complete).toBe(true);
    expect(p.share).toBe(1);
  });

  it("ne divise pas par zéro sans pièce obligatoire", () => {
    expect(checklistProgress([]).share).toBe(1);
  });
});
