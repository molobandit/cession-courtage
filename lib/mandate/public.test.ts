import { describe, expect, it } from "vitest";
import {
  EMPTY_MANDATE_FILTERS,
  FIRST_MANDATE_PUBLIC_NUMBER,
  countActiveMandateFilters,
  filterMandates,
  nextMandatePublicNumber,
  parseBudgetFloor,
  type PublicMandateCard,
} from "@/lib/mandate/public";

function mandate(partial: Partial<PublicMandateCard> & { id: string }): PublicMandateCard {
  return {
    publicNumber: 20001,
    buyerAlias: "A12",
    maxBudget: 50000,
    minCommissions: 5000,
    maxCommissions: 30000,
    riskTypes: ["Automobile"],
    carriers: [],
    zones: ["Rhône"],
    clientSegments: ["Particuliers"],
    financingLabel: "Comptant",
    isNationwide: false,
    ...partial,
  };
}

const LOT = [
  mandate({ id: "a", zones: ["Nord"], maxBudget: 20000 }),
  mandate({
    id: "b",
    zones: [],
    isNationwide: true,
    maxBudget: 200000,
    riskTypes: ["Santé"],
    clientSegments: ["Entreprises"],
  }),
  mandate({ id: "c", zones: ["Rhône", "Isère"], maxBudget: 80000 }),
];

describe("filterMandates", () => {
  it("sans filtre, tout passe", () => {
    expect(filterMandates(LOT, EMPTY_MANDATE_FILTERS)).toHaveLength(3);
  });

  it("une couverture nationale répond à n'importe quelle zone", () => {
    const result = filterMandates(LOT, { ...EMPTY_MANDATE_FILTERS, zone: "Nord" });
    expect(result.map((m) => m.id).sort()).toEqual(["a", "b"]);
  });

  it("le budget minimum retient les acquéreurs assez dotés", () => {
    expect(
      filterMandates(LOT, { ...EMPTY_MANDATE_FILTERS, minBudget: "50 000" }).map((m) => m.id),
    ).toEqual(["b", "c"]);
  });

  it("filtre par branche et par clientèle", () => {
    expect(filterMandates(LOT, { ...EMPTY_MANDATE_FILTERS, risk: "Santé" }).map((m) => m.id)).toEqual([
      "b",
    ]);
    expect(
      filterMandates(LOT, { ...EMPTY_MANDATE_FILTERS, segment: "Entreprises" }).map((m) => m.id),
    ).toEqual(["b"]);
  });

  it("lit un budget saisi avec espaces et euro", () => {
    expect(parseBudgetFloor("200 000 €")).toBe(200000);
    expect(parseBudgetFloor("")).toBeNull();
  });

  it("compte les filtres renseignés", () => {
    expect(countActiveMandateFilters(EMPTY_MANDATE_FILTERS)).toBe(0);
    expect(countActiveMandateFilters({ ...EMPTY_MANDATE_FILTERS, zone: " ", risk: "Santé" })).toBe(1);
  });
});

describe("nextMandatePublicNumber", () => {
  it("démarre la série à 20001, distincte des annonces de cession", () => {
    expect(nextMandatePublicNumber([])).toBe(FIRST_MANDATE_PUBLIC_NUMBER);
    expect(FIRST_MANDATE_PUBLIC_NUMBER).toBe(20001);
  });

  it("continue après le plus grand numéro attribué", () => {
    expect(nextMandatePublicNumber([20001, 20005, 20003])).toBe(20006);
  });
});
