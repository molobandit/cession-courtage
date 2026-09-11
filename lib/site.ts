const FALLBACK = "https://cession-courtage.molobandit.workers.dev";

/** Nom affiché. Le dépôt git reste cession-courtage. */
export const BRAND_NAME = "Le Bon Portefeuille";

/** Dénomination sociale (brief). */
export const COMPANY_LEGAL_NAME = "Le marché du portefeuille";

/** Badge public, libellé du brief (catalogue et fiche). */
export const CERTIFIED_BADGE = "✓ CERTIFIÉ PAR LE BON PORTEFEUILLE";

/** Label après validation de la due diligence. */
export const CERTIFIED_LABEL = "✓ PORTEFEUILLE CERTIFIÉ";

/** Origine publique du site, utilisee par le sitemap, robots.txt et les metadonnees. */
export function siteUrl(): string {
  const raw = process.env.AUTH_URL ?? process.env.NEXTAUTH_URL ?? FALLBACK;
  return raw.replace(/\/+$/, "");
}
