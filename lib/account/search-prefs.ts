import { EMPTY_FILTERS, type CatalogueFilters } from "@/lib/listing/filter";

export type SearchPrefs = Pick<
  CatalogueFilters,
  "zone" | "carrier" | "risk" | "segment" | "maxPrice" | "certifiedOnly"
>;

export const EMPTY_SEARCH_PREFS: SearchPrefs = {
  zone: "",
  carrier: "",
  risk: "",
  segment: "",
  maxPrice: "",
  certifiedOnly: false,
};

export function parseSearchPrefs(raw: string | null | undefined): SearchPrefs {
  if (!raw) return { ...EMPTY_SEARCH_PREFS };
  try {
    const parsed = JSON.parse(raw) as Partial<SearchPrefs>;
    return {
      zone: typeof parsed.zone === "string" ? parsed.zone : "",
      carrier: typeof parsed.carrier === "string" ? parsed.carrier : "",
      risk: typeof parsed.risk === "string" ? parsed.risk : "",
      segment: typeof parsed.segment === "string" ? parsed.segment : "",
      maxPrice: typeof parsed.maxPrice === "string" ? parsed.maxPrice : "",
      certifiedOnly: parsed.certifiedOnly === true,
    };
  } catch {
    return { ...EMPTY_SEARCH_PREFS };
  }
}

export function searchPrefsToFilters(prefs: SearchPrefs): Partial<CatalogueFilters> {
  return {
    ...EMPTY_FILTERS,
    zone: prefs.zone,
    carrier: prefs.carrier,
    risk: prefs.risk,
    segment: prefs.segment,
    maxPrice: prefs.maxPrice,
    certifiedOnly: prefs.certifiedOnly,
  };
}
