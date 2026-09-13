/**
 * Stockage de fichiers des tests : en mémoire.
 *
 * En production, les pièces partent dans R2 via le contexte Cloudflare, absent
 * hors du runtime Workers. Les tests d'intégration déposent de vraies pièces ;
 * elles vivent ici le temps de la suite.
 */
export class StorageUnavailableError extends Error {
  constructor() {
    super("Le stockage de fichiers n’est pas configuré.");
    this.name = "StorageUnavailableError";
  }
}

const objets = new Map<string, Uint8Array>();

export function storageConfigured(): boolean {
  return true;
}

export async function putObject(key: string, data: Uint8Array): Promise<void> {
  objets.set(key, data);
}

export async function getObject(key: string): Promise<Uint8Array> {
  const o = objets.get(key);
  if (!o) throw new Error("Fichier introuvable.");
  return o;
}

export async function deleteObject(key: string): Promise<void> {
  objets.delete(key);
}

export async function deletePrefix(prefix: string): Promise<void> {
  for (const key of [...objets.keys()]) if (key.startsWith(prefix)) objets.delete(key);
}

export function storedKeys(): string[] {
  return [...objets.keys()];
}
