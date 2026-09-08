const FALLBACK = "https://cession-courtage.molobandit.workers.dev";

/** Origine publique du site, utilisee par le sitemap, robots.txt et les metadonnees. */
export function siteUrl(): string {
  const raw = process.env.AUTH_URL ?? process.env.NEXTAUTH_URL ?? FALLBACK;
  return raw.replace(/\/+$/, "");
}
