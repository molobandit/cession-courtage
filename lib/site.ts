const FALLBACK = "https://site.labourseduportefeuille.workers.dev";

/**
 * Dénomination sociale et nom d'enseigne, désormais confondus.
 *
 * Enseignes successives : « Le Bon Portefeuille », puis « Le marché du
 * portefeuille ». Le dépôt git garde son nom historique, cession-courtage ;
 * le worker et son sous-domaine, eux, portent l'enseigne actuelle.
 */
export const COMPANY_LEGAL_NAME = "La bourse du portefeuille";

/** Nom affiché. Identique à la dénomination sociale, une seule valeur. */
export const BRAND_NAME = COMPANY_LEGAL_NAME;

/** Badge public, libellé du brief (catalogue et fiche). */
export const CERTIFIED_BADGE = "CERTIFIÉ";

/** Label après validation de la due diligence. */
export const CERTIFIED_LABEL = "CERTIFIÉ";

/** Origine publique du site, utilisee par le sitemap, robots.txt et les metadonnees. */
export function siteUrl(): string {
  const raw = process.env.AUTH_URL ?? process.env.NEXTAUTH_URL ?? FALLBACK;
  return raw.replace(/\/+$/, "");
}
