/**
 * Remplace `next/navigation` dans les tests.
 *
 * `redirect()` fonctionne en levant une exception que Next intercepte. On imite
 * ce contrat : le test peut ainsi distinguer une redirection d'une vraie panne,
 * exactement comme le fait le moteur.
 */
export class RedirectionDeTest extends Error {
  /*
   * Next marque ses exceptions de contrôle par un `digest`, et c'est sur lui
   * que le code applicatif décide de les relayer plutôt que de les traiter
   * comme des pannes. Sans cette propriété, une redirection levée dans un
   * `try` se faisait avaler et ressortait en message d'erreur : le stub
   * mentait sur le contrat qu'il imite.
   */
  readonly digest: string;

  constructor(public readonly destination: string) {
    super(`NEXT_REDIRECT:${destination}`);
    this.name = "RedirectionDeTest";
    this.digest = `NEXT_REDIRECT;replace;${destination};307;`;
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
