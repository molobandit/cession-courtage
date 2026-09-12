import "server-only";
import { getCloudflareContext } from "@opennextjs/cloudflare";

/**
 * Lecture d'une variable d'exécution, secrets compris.
 *
 * Sur Workers, `process.env` ne porte que les `vars` déclarées dans
 * `wrangler.jsonc`. Les secrets posés par `wrangler secret put` vivent sur
 * l'objet `env` de la requête, accessible par `getCloudflareContext()`.
 *
 * Le piège est silencieux : le secret est bien enregistré, `wrangler secret
 * list` le montre, et le code le lit quand même comme absent. C'est ce qui
 * laissait le paiement fermé alors que la clé Stripe était en place.
 *
 * L'ordre est volontaire : la liaison Workers d'abord, `process.env` ensuite
 * pour `next dev` et les tests, où le contexte Cloudflare n'existe pas.
 */
export function runtimeEnv(name: string): string | undefined {
  try {
    const env = getCloudflareContext().env as unknown as Record<string, unknown>;
    const value = env?.[name];
    if (typeof value === "string" && value.length > 0) return value;
  } catch {
    // Hors Workers : on retombe sur process.env juste en dessous.
  }
  const local = process.env[name];
  return typeof local === "string" && local.length > 0 ? local : undefined;
}
