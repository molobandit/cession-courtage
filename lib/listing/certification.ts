import { prisma } from "@/lib/prisma";

export async function listCertificationStatuses(
  listingIds: string[],
): Promise<Map<string, string>> {
  const result = new Map<string, string>();
  if (listingIds.length === 0) return result;

  const rows = await prisma.listing.findMany({
    where: { id: { in: listingIds } },
    select: { id: true, certificationStatus: true },
  });
  for (const row of rows) result.set(row.id, row.certificationStatus);
  return result;
}
