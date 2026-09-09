import type { Prisma } from "@prisma/client";

/** D1/SQLite stocke les listes en JSON ; Prisma les expose comme JsonValue. */
export function asStringArray(value: Prisma.JsonValue | null | undefined): string[] {
  if (!Array.isArray(value)) return [];
  return value.filter((item): item is string => typeof item === "string");
}
