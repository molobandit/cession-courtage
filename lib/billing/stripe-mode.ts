/**
 * Mode Stripe déduit de la clé secrète.
 *
 * Une clé `sk_test_` ne déplace aucun argent : seules les cartes d'essai de
 * Stripe y fonctionnent. Une clé `sk_live_` débite de vraies cartes.
 *
 * Le site sert aujourd'hui à des démonstrations, avec des portefeuilles
 * fictifs. Ouvrir le paiement en direct par simple copie de clé ferait
 * encaisser un vrai abonnement sur un dossier qui n'existe pas : le passage en
 * production doit donc être un geste explicite, `STRIPE_ALLOW_LIVE`, et non la
 * conséquence d'une variable collée au mauvais endroit.
 *
 * Fonctions pures, testables sans réseau ni base.
 */

export type StripeMode = "test" | "live";

/** Mode porté par la clé, ou `null` si elle est absente ou mal formée. */
export function stripeModeFromKey(key: string | undefined | null): StripeMode | null {
  if (typeof key !== "string") return null;
  const valeur = key.trim();
  if (valeur.startsWith("sk_test_")) return "test";
  if (valeur.startsWith("sk_live_")) return "live";
  return null;
}

/**
 * La clé peut-elle être utilisée ?
 *
 * Le mode essai passe toujours. Le mode direct exige l'autorisation explicite.
 */
export function stripeKeyUsable(
  key: string | undefined | null,
  allowLive: string | undefined | null,
): boolean {
  const mode = stripeModeFromKey(key);
  if (mode === null) return false;
  if (mode === "test") return true;
  return allowLive === "true";
}

/** Ce qu'il faut dire à l'exploitant quand une clé est refusée. */
export function stripeKeyRefusal(
  key: string | undefined | null,
  allowLive: string | undefined | null,
): string | null {
  if (stripeKeyUsable(key, allowLive)) return null;
  const mode = stripeModeFromKey(key);
  if (mode === null) {
    return "STRIPE_SECRET_KEY absente ou mal formée (attendu : sk_test_… ou sk_live_…).";
  }
  return "Clé Stripe en mode direct refusée : posez STRIPE_ALLOW_LIVE=true pour encaisser réellement.";
}
