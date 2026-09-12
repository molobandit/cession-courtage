/**
 * Remplace `next/navigation` dans les tests.
 *
 * `redirect()` fonctionne en levant une exception que Next intercepte. On imite
 * ce contrat : le test peut ainsi distinguer une redirection d'une vraie panne,
 * exactement comme le fait le moteur.
 */
export class RedirectionDeTest extends Error {
  constructor(public readonly destination: string) {
    super(`NEXT_REDIRECT:${destination}`);
    this.name = "RedirectionDeTest";
  }
}

export function redirect(destination: string): never {
  throw new RedirectionDeTest(destination);
}

export function notFound(): never {
  throw new Error("NEXT_NOT_FOUND");
}

/** Laisse remonter les exceptions de contrôle de Next, comme la vraie. */
export function unstable_rethrow(error: unknown): void {
  if (error instanceof RedirectionDeTest) throw error;
}
