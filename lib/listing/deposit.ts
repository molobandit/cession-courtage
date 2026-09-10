import "server-only";
import { prisma } from "@/lib/prisma";

/**
 * Depot d'interet pose par un acquereur sur une annonce.
 *
 * Lecture au niveau de la requete : on ne charge que le depot du demandeur,
 * jamais ceux des candidats concurrents, qui ne doivent pas se decouvrir.
 */
export async function findMyDeposit(listingId: string, buyerId: string) {
  return prisma.interestDeposit.findUnique({
    where: { listingId_buyerId: { listingId, buyerId } },
    select: { amount: true, placedAt: true },
  });
}
