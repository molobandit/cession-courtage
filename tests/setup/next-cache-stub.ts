/**
 * Remplace `next/cache` dans les tests.
 *
 * `revalidatePath` exige le contexte de requête de Next et lève hors de lui.
 * Les actions l'appellent après avoir écrit : ce qui nous intéresse est l'écrit,
 * pas l'invalidation du cache.
 */
export function revalidatePath(_path: string): void {}
export function revalidateTag(_tag: string): void {}
