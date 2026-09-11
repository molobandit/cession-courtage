const FALLBACK = "https://cession-courtage.molobandit.workers.dev";

/**
 * Dénomination sociale et nom d'enseigne, désormais confondus.
 *
 * Le site s'est appelé « Le Bon Portefeuille » jusqu'au 11 septembre 2026 ; le
 * propriétaire a tranché pour la dénomination de la société. Le dépôt git garde
 * son nom historique, cession-courtage, ainsi que le sous-domaine de
 * déploiement : les renommer casserait les liens et l'historique sans rien
 * apporter.
 */
export const COMPANY_LEGAL_NAME = "Le marché du portefeuille";

/** Nom affiché. Identique à la dénomination sociale, une seule valeur. */
export const BRAND_NAME = COMPANY_LEGAL_NAME;

/** Badge public, libellé du brief (catalogue et fiche). */
export const CERTIFIED_BADGE = `✓ CERTIFIÉ PAR ${COMPANY_LEGAL_NAME.toUpperCase()}`;

/** Label après validation de la due diligence. */
export const CERTIFIED_LABEL = "✓ PORTEFEUILLE CERTIFIÉ";

/** Origine publique du site, utilisee par le sitemap, robots.txt et les metadonnees. */
export function siteUrl(): string {
  const raw = process.env.AUTH_URL ?? process.env.NEXTAUTH_URL ?? FALLBACK;
  return raw.replace(/\/+$/, "");
}
