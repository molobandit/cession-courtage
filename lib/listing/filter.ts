/**
 * Filtrage et tri du catalogue.
 *
 * Extrait du composant pour être testable : une règle de filtrage fausse ne se
 * voit pas à l'oeil, elle se voit quand un acquéreur ne trouve pas un dossier
 * qui existe.
 */

export type FilterableListing = {
  id: string;
  status: string;
  zone: string;
  askingPrice: number;
  annualCommissions: number;
  daysLeft: number | null;
  carriers: string[];
  riskTypes: string[];
  clientSegments: string[];
  certified: boolean;
};

export type CatalogueFilters = {
  zone: string;
  carrier: string;
  risk: string;
  segment: string;
  /** Saisie libre : « 50 000 », « 50000 € ». */
  maxPrice: string;
  openOnly: boolean;
  certifiedOnly: boolean;
};

export type SortKey = "recent" | "price-asc" | "price-desc" | "commissions-desc";

export const EMPTY_FILTERS: CatalogueFilters = {
  zone: "",
  carrier: "",
  risk: "",
  segment: "",
  maxPrice: "",
  openOnly: false,
  certifiedOnly: false,
};

/** Une fenêtre est ouverte si le statut le dit ET que la date n'est pas passée. */
export function isWindowOpen(listing: Pick<FilterableListing, "status" | "daysLeft">): boolean {
  return listing.status === "OFFERS_OPEN" && (listing.daysLeft ?? -1) >= 0;
}

export function parsePriceCeiling(raw: string): number | null {
  const digits = raw.replace(/[^\d]/g, "");
  if (digits === "") return null;
  const value = Number(digits);
  return Number.isFinite(value) ? value : null;
}

export function filterListings<T extends FilterableListing>(
  listings: T[],
  filters: CatalogueFilters,
): T[] {
  const zoneQuery = filters.zone.trim().toLowerCase();
  const ceiling = parsePriceCeiling(filters.maxPrice);

  return listings.filter((item) => {
    if (zoneQuery && !item.zone.toLowerCase().includes(zoneQuery)) return false;
    if (ceiling !== null && item.askingPrice > ceiling) return false;
    if (filters.carrier && !item.carriers.includes(filters.carrier)) return false;
    if (filters.risk && !item.riskTypes.includes(filters.risk)) return false;
    if (filters.segment && !item.clientSegments.includes(filters.segment)) return false;
    if (filters.openOnly && !isWindowOpen(item)) return false;
    if (filters.certifiedOnly && !item.certified) return false;
    return true;
  });
}

export function sortListings<T extends FilterableListing>(listings: T[], sort: SortKey): T[] {
  const sorted = [...listings];
  if (sort === "price-asc") sorted.sort((a, b) => a.askingPrice - b.askingPrice);
  if (sort === "price-desc") sorted.sort((a, b) => b.askingPrice - a.askingPrice);
  if (sort === "commissions-desc")
    sorted.sort((a, b) => b.annualCommissions - a.annualCommissions);
  return sorted;
}

export function countActiveFilters(filters: CatalogueFilters): number {
  const text = [filters.zone, filters.carrier, filters.risk, filters.segment, filters.maxPrice];
  return text.filter((v) => v.trim() !== "").length + (filters.openOnly ? 1 : 0) + (filters.certifiedOnly ? 1 : 0);
}
