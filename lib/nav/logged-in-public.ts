/**
 * Pages vitrine inaccessibles une fois connecte.
 *
 * Le cookie de session suffit : le middleware n'appelle pas `auth()`, qui
 * reemettrait le jeton et casserait la deconnexion.
 */

const EXACT = new Set([
  "/",
  "/ceder",
  "/acquerir",
  "/faq",
  "/journal",
  "/valoriser",
  "/certification",
]);

const PREFIXES: string[] = [];

export function sendLoggedInVisitorToApp(pathname: string): boolean {
  if (EXACT.has(pathname)) return true;
  return PREFIXES.some((p) => pathname.startsWith(p));
}
