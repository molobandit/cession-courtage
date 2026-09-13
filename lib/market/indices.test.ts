import { describe, expect, it } from "vitest";
import { formatMultiple, listingMultiple, marketIndices, quoteBoard } from "@/lib/market/indices";
import type { PublicListingCard } from "@/lib/listing/public-card";

function carte(p: Partial<PublicListingCard>): PublicListingCard {
  return {
    id: p.id ?? "x",
    publicNumber: 1,
    status: "OFFERS_OPEN",
    statusLabel: "",
    marketDetail: null,
    marketTone: "open",
    zone: "",
    askingPrice: 100_000,
    annualCommissions: 40_000,
    contractCount: 1,
    averageAgeMonths: 1,
    isPartial: false,
    isNationwide: false,
    sellerSupportMonths: 0,
    daysLeft: null,
    carriers: [],
    riskTypes: [],
    clientSegments: [],
    certified: false,
    sold: false,
    precompte: null,
    precompteAmount: null,
    ...p,
  };
}

describe("indices de la salle", () => {
  it("calcule le multiple prix / commissions", () => {
    expect(listingMultiple(100_000, 40_000)).toBe(2.5);
    expect(listingMultiple(100_000, 0)).toBeNull();
    expect(formatMultiple(2.5)).toBe("×2,50");
  });

  it("ne compte en séance que les titres ouverts ou scellés", () => {
    const i = marketIndices([
      carte({ id: "a", marketTone: "sealed", daysLeft: 3 }),
      carte({ id: "b", marketTone: "open", askingPrice: 50_000, annualCommissions: 25_000 }),
      carte({ id: "c", marketTone: "sold", sold: true }),
      carte({ id: "d", marketTone: "negotiation" }),
    ]);
    expect(i.enSeance).toBe(2);
    expect(i.scellees).toBe(1);
    expect(i.volumeEur).toBe(150_000);
    expect(i.multipleMoyen).toBe(2.25);
    expect(i.cloturesSousSeptJours).toBe(1);
    expect(i.vendus).toBe(1);
  });

  it("affiche des zéros sur un marché vide", () => {
    expect(marketIndices([])).toEqual({
      enSeance: 0, scellees: 0, volumeEur: 0, multipleMoyen: null, cloturesSousSeptJours: 0, vendus: 0,
    });
  });

  it("met en tête de cote les séances qui ferment le plus tôt", () => {
    const cote = quoteBoard([
      carte({ id: "ouvert", marketTone: "open" }),
      carte({ id: "loin", marketTone: "sealed", daysLeft: 12 }),
      carte({ id: "proche", marketTone: "sealed", daysLeft: 2 }),
      carte({ id: "vendu", marketTone: "sold", sold: true }),
    ]);
    expect(cote.map((c) => c.id)).toEqual(["proche", "loin", "ouvert"]);
  });
});
