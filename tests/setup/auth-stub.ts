/**
 * Remplace `@/auth` dans les tests : NextAuth ne se charge pas hors runtime Next.
 * Les tests d'acces passent l'acteur explicitement aux fonctions de lib/authz,
 * ils n'ont donc jamais besoin de resoudre une session.
 */
export async function auth(): Promise<null> {
  return null;
}
