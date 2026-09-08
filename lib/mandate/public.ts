/**
 * Demandes d'acquisition publiees au catalogue.
 *
 * Un catalogue qui ne montre que des vendeurs parait vide tant que les cedants
 * manquent. Publier la demande rend le marche lisible dans les deux sens, et
 * donne au cedant hesitant la preuve qu'il existe des acheteurs pour son profil.
 *
 * L'acquereur reste anonyme : seul son alias public est expose.
 */

export type PublicMandateCard = {
  id: string;
  publicNumber: number;
  buyerAlias: string;
  maxBudget: number;
  minCommissions: number;
  maxCommissions: number;
  riskTypes: string[];
  carriers: string[];
  zones: string[];
  clientSegments: string[];
  financingLabel: string;
  isNationwide: boolean;
};

export type MandateFilters = {
  zone: string;
  risk: string;
  segment: string;
  /** Budget minimum recherche par le cedant : on garde les acquereurs au dessus. */
  minBudget: string;
};

export const EMPTY_MANDATE_FILTERS: MandateFilters = {
  zone: "",
  risk: "",
  segment: "",
  minBudget: "",
};

export function parseBudgetFloor(raw: string): number | null {
  const digits = raw.replace(/[^\d]/g, "");
  if (digits === "") return null;
  const value = Number(digits);
  return Number.isFinite(value) ? value : null;
}

export function filterMandates(
  mandates: PublicMandateCard[],
  filters: MandateFilters,
): PublicMandateCard[] {
  const zoneQuery = filters.zone.trim().toLowerCase();
  const floor = parseBudgetFloor(filters.minBudget);

  return mandates.filter((m) => {
    // Une couverture nationale accepte n'importe quelle zone recherchee.
    if (zoneQuery && !m.isNationwide) {
      const match = m.zones.some((z) => z.toLowerCase().includes(zoneQuery));
      if (!match) return false;
    }
    if (floor !== null && m.maxBudget < floor) return false;
    if (filters.risk && !m.riskTypes.includes(filters.risk)) return false;
    if (filters.segment && !m.clientSegments.includes(filters.segment)) return false;
    return true;
  });
}

export function countActiveMandateFilters(filters: MandateFilters): number {
  return [filters.zone, filters.risk, filters.segment, filters.minBudget].filter(
    (v) => v.trim() !== "",
  ).length;
}

/** Serie 20001, distincte des annonces de cession qui commencent a 10001. */
export const FIRST_MANDATE_PUBLIC_NUMBER = 20001;

export function nextMandatePublicNumber(existing: number[]): number {
  const max = existing.reduce((m, n) => Math.max(m, n), FIRST_MANDATE_PUBLIC_NUMBER - 1);
  return max + 1;
}
