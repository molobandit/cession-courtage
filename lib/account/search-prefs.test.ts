import { describe, expect, it } from "vitest";
import { EMPTY_SEARCH_PREFS, parseSearchPrefs } from "@/lib/account/search-prefs";

describe("parseSearchPrefs", () => {
  it("retourne le vide si rien n’est enregistré", () => {
    expect(parseSearchPrefs(null)).toEqual(EMPTY_SEARCH_PREFS);
  });

  it("conserve zone, branche et budget", () => {
    expect(
      parseSearchPrefs(JSON.stringify({ zone: "Rhône", risk: "Santé", maxPrice: "80000", certifiedOnly: true })),
    ).toEqual({
      ...EMPTY_SEARCH_PREFS,
      zone: "Rhône",
      risk: "Santé",
      maxPrice: "80000",
      certifiedOnly: true,
    });
  });
});
