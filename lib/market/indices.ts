import type { PublicListingCard } from "@/lib/listing/public-card";

/**
 * Indices de la salle de marché, calculés sur les annonces publiques.
 *
 * Une bourse se lit à ses indices : combien de titres en séance, quel volume,
 * à quel multiple. Aucun chiffre n'est inventé ni lissé : tout sort des annonces
 * publiées, et un marché vide affiche des zéros plutôt qu'une tendance.
 *
 * Le multiple rapporte le prix demandé aux commissions annuelles : c'est la
 * « cote » d'un portefeuille, le repère que tout acquéreur calcule d'abord.
 *
 * Fonctions pures, testables sans base.
 */

export type MarketIndices = {
  enSeance: number;
  scellees: number;
  volumeEur: number;
  multipleMoyen: number | null;
  cloturesSousSeptJours: number;
  vendus: number;
};

export function listingMultiple(askingPrice: number, annualCommissions: number): number | null {
  if (!Number.isFinite(askingPrice) || !Number.isFinite(annualCommissions) || annualCommissions <= 0) return null;
  return Math.round((askingPrice / annualCommissions) * 100) / 100;
}

export function formatMultiple(value: number | null): string {
  if (value === null) return "—";
  return `×${value.toLocaleString("fr-FR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

export function marketIndices(cards: PublicListingCard[]): MarketIndices {
  const seance = cards.filter((c) => c.marketTone === "open" || c.marketTone === "sealed");
  const multiples = seance
    .map((c) => listingMultiple(c.askingPrice, c.annualCommissions))
    .filter((m): m is number => m !== null);
  return {
    enSeance: seance.length,
    scellees: seance.filter((c) => c.marketTone === "sealed").length,
    volumeEur: seance.reduce((somme, c) => somme + c.askingPrice, 0),
    multipleMoyen: multiples.length
      ? Math.round((multiples.reduce((a, b) => a + b, 0) / multiples.length) * 100) / 100
      : null,
    cloturesSousSeptJours: seance.filter(
      (c) => c.marketTone === "sealed" && c.daysLeft !== null && c.daysLeft >= 0 && c.daysLeft <= 7,
    ).length,
    vendus: cards.filter((c) => c.sold).length,
  };
}

/**
 * Cote de la salle : les titres à surveiller d'abord.
 *
 * Les séances scellées qui ferment le plus tôt passent devant, puis les offres
 * ouvertes au meilleur multiple : c'est l'ordre dans lequel un acquéreur doit
 * agir, pas un classement de mise en avant.
 */
export function quoteBoard(cards: PublicListingCard[], limit = 6): PublicListingCard[] {
  const seance = cards.filter((c) => c.marketTone === "open" || c.marketTone === "sealed");
  return [...seance]
    .sort((a, b) => {
      if (a.marketTone !== b.marketTone) return a.marketTone === "sealed" ? -1 : 1;
      if (a.marketTone === "sealed") return (a.daysLeft ?? 99) - (b.daysLeft ?? 99);
      return (listingMultiple(a.askingPrice, a.annualCommissions) ?? 99) - (listingMultiple(b.askingPrice, b.annualCommissions) ?? 99);
    })
    .slice(0, limit);
}
