import { prisma } from "@/lib/prisma";

export async function listCertificationStatuses(
  listingIds: string[],
): Promise<Map<string, string>> {
  const result = new Map<string, string>();
  if (listingIds.length === 0) return result;

  const placeholders = listingIds.map(() => "?").join(", ");
  const rows = await prisma.$queryRawUnsafe<Array<{ id: string; certificationStatus: string }>>(
    `SELECT id, certificationStatus FROM Listing WHERE id IN (${placeholders})`,
    ...listingIds,
  );
  for (const row of rows) result.set(row.id, row.certificationStatus);
  return result;
}
