import "server-only";
import { createHash } from "node:crypto";
import { deletePrefix, getObject, putObject } from "@/lib/storage/objects";

/**
 * Acces aux bordereaux deposes. Le contenu vit dans R2 : Workers n'a pas de
 * systeme de fichiers, toute ecriture disque echouerait en production.
 */

/**
 * Empreinte SHA-256 du fichier depose. `node:crypto` est disponible sur Workers
 * grace au drapeau de compatibilite `nodejs_compat` declare dans wrangler.jsonc.
 */
export function sha256Buffer(buffer: Buffer | Uint8Array): string {
  return createHash("sha256").update(buffer).digest("hex");
}

export function safeFileName(original: string): string {
  const base = original.replace(/\\/g, "/").split("/").pop() ?? "upload";
  const cleaned = base.replace(/[^a-zA-Z0-9._-]+/g, "_").replace(/^\.+/, "").slice(0, 120);
  return cleaned || "upload";
}

export function importStorageKey(userId: string, importId: string, fileName: string): string {
  return `imports/${userId}/${importId}/${safeFileName(fileName)}`;
}

export async function writeImportFile(storageKey: string, buffer: Buffer | Uint8Array): Promise<void> {
  await putObject(storageKey, buffer instanceof Uint8Array ? buffer : new Uint8Array(buffer));
}

export async function readImportFile(storageKey: string): Promise<Buffer> {
  return Buffer.from(await getObject(storageKey));
}

export async function deleteImportFile(storageKey: string): Promise<void> {
  const prefix = storageKey.slice(0, storageKey.lastIndexOf("/") + 1);
  await deletePrefix(prefix);
}
