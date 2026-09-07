import "server-only";
import { createHash } from "crypto";
import { mkdir, readFile, rm, writeFile } from "fs/promises";
import path from "path";

function storageRoot(): string {
  return path.resolve(process.cwd(), process.env.FILE_STORAGE_DIR ?? "./uploads");
}

export function sha256Buffer(buffer: Buffer): string {
  return createHash("sha256").update(buffer).digest("hex");
}

export function safeFileName(original: string): string {
  const base = original.replace(/\\/g, "/").split("/").pop() ?? "upload";
  const cleaned = base.replace(/[^a-zA-Z0-9._-]+/g, "_").replace(/^\.+/, "").slice(0, 120);
  return cleaned || "upload";
}

export function importStorageKey(userId: string, importId: string, fileName: string): string {
  return path.posix.join("imports", userId, importId, safeFileName(fileName));
}

function resolveKey(storageKey: string): string {
  const root = storageRoot();
  const resolved = path.resolve(root, storageKey);
  const relative = path.relative(root, resolved);
  if (relative.startsWith("..") || path.isAbsolute(relative)) {
    throw new Error("Clé de stockage invalide.");
  }
  return resolved;
}

export async function writeImportFile(storageKey: string, buffer: Buffer): Promise<void> {
  const full = resolveKey(storageKey);
  await mkdir(path.dirname(full), { recursive: true });
  await writeFile(full, buffer);
}

export async function readImportFile(storageKey: string): Promise<Buffer> {
  return readFile(resolveKey(storageKey));
}

export async function deleteImportFile(storageKey: string): Promise<void> {
  const full = resolveKey(storageKey);
  await rm(path.dirname(full), { recursive: true, force: true });
}
