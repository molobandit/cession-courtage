import "server-only";
import { getCloudflareContext } from "@opennextjs/cloudflare";

/**
 * Stockage des fichiers deposes (bordereaux d'import, pieces de salle de donnees).
 *
 * Workers n'a pas de systeme de fichiers : toute ecriture disque echoue en
 * production. Le stockage passe donc par un bucket R2, expose par le binding
 * `UPLOADS`.
 *
 * Mise en service, une seule fois :
 *   1. activer R2 depuis le tableau de bord Cloudflare (acceptation des conditions) ;
 *   2. npx wrangler r2 bucket create cession-courtage-uploads
 *   3. declarer le binding dans wrangler.jsonc :
 *        "r2_buckets": [{ "binding": "UPLOADS", "bucket_name": "cession-courtage-uploads" }]
 *
 * Tant que le binding est absent, les fonctions ci-dessous levent une erreur
 * explicite plutot que de laisser remonter une erreur systeme incomprehensible.
 */

export class StorageUnavailableError extends Error {
  constructor() {
    super(
      "Le stockage de fichiers n’est pas configuré. Activez R2 sur le compte Cloudflare, créez le bucket, puis déclarez le binding UPLOADS.",
    );
    this.name = "StorageUnavailableError";
  }
}

type Bucket = {
  put(key: string, value: ArrayBuffer | Uint8Array): Promise<unknown>;
  get(key: string): Promise<{ arrayBuffer(): Promise<ArrayBuffer> } | null>;
  delete(key: string | string[]): Promise<void>;
  list(options?: { prefix?: string }): Promise<{ objects: { key: string }[] }>;
};

function bucket(): Bucket {
  let env: Record<string, unknown>;
  try {
    env = getCloudflareContext().env as unknown as Record<string, unknown>;
  } catch {
    throw new StorageUnavailableError();
  }
  const store = env.UPLOADS as Bucket | undefined;
  if (!store) throw new StorageUnavailableError();
  return store;
}

/** Vrai si le stockage est utilisable : permet de desactiver proprement l'interface. */
export function storageConfigured(): boolean {
  try {
    bucket();
    return true;
  } catch {
    return false;
  }
}

export async function putObject(key: string, data: Uint8Array): Promise<void> {
  await bucket().put(key, data);
}

export async function getObject(key: string): Promise<Uint8Array> {
  const object = await bucket().get(key);
  if (!object) throw new Error("Fichier introuvable.");
  return new Uint8Array(await object.arrayBuffer());
}

export async function deleteObject(key: string): Promise<void> {
  await bucket().delete(key);
}

/** Supprime tout un prefixe, par exemple les pieces d'un import annule. */
export async function deletePrefix(prefix: string): Promise<void> {
  const store = bucket();
  const listed = await store.list({ prefix });
  if (listed.objects.length === 0) return;
  await store.delete(listed.objects.map((object) => object.key));
}
