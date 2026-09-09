const FALLBACK = "https://cession-courtage.molobandit.workers.dev";

/** Nom affiché. Le dépôt git reste cession-courtage. */
export const BRAND_NAME = "Le Bon Portefeuille";

/** Origine publique du site, utilisee par le sitemap, robots.txt et les metadonnees. */
export function siteUrl(): string {
  const raw = process.env.AUTH_URL ?? process.env.NEXTAUTH_URL ?? FALLBACK;
  return raw.replace(/\/+$/, "");
}
