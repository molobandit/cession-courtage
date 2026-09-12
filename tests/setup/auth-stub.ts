/**
 * Remplace `@/auth` dans les tests : NextAuth ne se charge pas hors runtime Next.
 *
 * Les tests d'accès passent l'acteur explicitement aux fonctions de `lib/authz`
 * et n'ont donc jamais besoin de session. Les tests de tunnel, eux, appellent
 * les actions serveur telles quelles : celles-ci résolvent l'acteur par
 * `getActor()`, qu'on veut garder réel — gardes comprises, dont le refus d'un
 * compte effacé. D'où cette session pilotable : le test dit qui est connecté,
 * tout le reste du chemin reste le vrai.
 */

let utilisateurId: string | null = null;

/** Définit qui est connecté pour les appels suivants. `null` = anonyme. */
export function connecterUtilisateur(id: string | null): void {
  utilisateurId = id;
}

export async function auth(): Promise<{ user: { id: string } } | null> {
  return utilisateurId ? { user: { id: utilisateurId } } : null;
}
