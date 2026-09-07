import "server-only";
import { prisma } from "@/lib/prisma";

const PUBLIC_NUMBER_FLOOR = 10_000;

/** Prochain numéro anonyme de dossier (10001, 10002, …). */
export async function nextListingPublicNumber(): Promise<number> {
  const agg = await prisma.listing.aggregate({ _max: { publicNumber: true } });
  const current = agg._max.publicNumber ?? PUBLIC_NUMBER_FLOOR;
  return Math.max(PUBLIC_NUMBER_FLOOR, current) + 1;
}
