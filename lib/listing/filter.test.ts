import { describe, expect, it } from "vitest";
import {
  EMPTY_FILTERS,
  countActiveFilters,
  filterListings,
  isWindowOpen,
  parsePriceCeiling,
  sortListings,
  type FilterableListing,
} from "@/lib/listing/filter";

function listing(partial: Partial<FilterableListing> & { id: string }): FilterableListing {
  return {
    status: "PUBLISHED",
    zone: "Paris",
    askingPrice: 10000,
    annualCommissions: 5000,
    daysLeft: null,
    carriers: ["AXA"],
    riskTypes: ["Automobile"],
    clientSegments: ["Particuliers"],
    ...partial,
  };
}

const LOT = [
  listing({ id: "a", zone: "Nord", carriers: ["AXA", "Allianz"], askingPrice: 20000 }),
  listing({
    id: "b",
    zone: "Rhône, Isère",
    carriers: ["Generali"],
    riskTypes: ["Santé"],
    askingPrice: 5000,
    status: "OFFERS_OPEN",
    daysLeft: 6,
  }),
  listing({
    id: "c",
    zone: "Bouches-du-Rhône",
    clientSegments: ["Entreprises"],
    askingPrice: 50000,
    annualCommissions: 30000,
    status: "OFFERS_OPEN",
    daysLeft: -2,
  }),
];

describe("filterListings", () => {
  it("sans filtre, tout passe", () => {
    expect(filterListings(LOT, EMPTY_FILTERS)).toHaveLength(3);
  });

  it("filtre la zone sans tenir compte de la casse ni des accents partiels", () => {
    expect(filterListings(LOT, { ...EMPTY_FILTERS, zone: "nord" }).map((l) => l.id)).toEqual(["a"]);
    // « Rhône » figure dans deux zones : le filtre les retient toutes les deux.
    expect(filterListings(LOT, { ...EMPTY_FILTERS, zone: "Rhône" }).map((l) => l.id)).toEqual([
      "b",
      "c",
    ]);
  });

  it("filtre par compagnie", () => {
    expect(filterListings(LOT, { ...EMPTY_FILTERS, carrier: "Generali" }).map((l) => l.id)).toEqual([
      "b",
    ]);
    expect(filterListings(LOT, { ...EMPTY_FILTERS, carrier: "AXA" }).map((l) => l.id)).toEqual([
      "a",
      "c",
    ]);
  });

  it("filtre par branche et par clientèle", () => {
    expect(filterListings(LOT, { ...EMPTY_FILTERS, risk: "Santé" }).map((l) => l.id)).toEqual(["b"]);
    expect(
      filterListings(LOT, { ...EMPTY_FILTERS, segment: "Entreprises" }).map((l) => l.id),
    ).toEqual(["c"]);
  });

  it("le budget maximum accepte les espaces et le symbole euro", () => {
    expect(parsePriceCeiling("20 000 €")).toBe(20000);
    expect(parsePriceCeiling("")).toBeNull();
    expect(filterListings(LOT, { ...EMPTY_FILTERS, maxPrice: "20 000" }).map((l) => l.id)).toEqual([
      "a",
      "b",
    ]);
  });

  it("la fenêtre ouverte exige le statut ET une date non passée", () => {
    // « c » est OFFERS_OPEN mais sa date est passée : elle ne doit pas remonter.
    expect(filterListings(LOT, { ...EMPTY_FILTERS, openOnly: true }).map((l) => l.id)).toEqual([
      "b",
    ]);
    expect(isWindowOpen({ status: "OFFERS_OPEN", daysLeft: -1 })).toBe(false);
    expect(isWindowOpen({ status: "PUBLISHED", daysLeft: 5 })).toBe(false);
  });

  it("combine les filtres", () => {
    const result = filterListings(LOT, {
      ...EMPTY_FILTERS,
      carrier: "AXA",
      maxPrice: "30 000",
    });
    expect(result.map((l) => l.id)).toEqual(["a"]);
  });
});

describe("sortListings", () => {
  it("trie par prix croissant et décroissant", () => {
    expect(sortListings(LOT, "price-asc").map((l) => l.id)).toEqual(["b", "a", "c"]);
    expect(sortListings(LOT, "price-desc").map((l) => l.id)).toEqual(["c", "a", "b"]);
  });

  it("trie par commissions décroissantes", () => {
    expect(sortListings(LOT, "commissions-desc")[0]!.id).toBe("c");
  });

  it("ne modifie pas la liste d'origine", () => {
    const avant = LOT.map((l) => l.id);
    sortListings(LOT, "price-desc");
    expect(LOT.map((l) => l.id)).toEqual(avant);
  });
});

describe("countActiveFilters", () => {
  it("compte les filtres réellement renseignés", () => {
    expect(countActiveFilters(EMPTY_FILTERS)).toBe(0);
    expect(countActiveFilters({ ...EMPTY_FILTERS, zone: "  " })).toBe(0);
    expect(countActiveFilters({ ...EMPTY_FILTERS, zone: "Nord", openOnly: true })).toBe(2);
  });
});
