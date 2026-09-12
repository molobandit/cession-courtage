import "server-only";
import { prisma } from "@/lib/prisma";

/**
 * Dossiers de gré à gré d'une personne.
 *
 * Par l'identifiant ET par l'adresse : une contrepartie invitée avant d'avoir
 * un compte doit retrouver son dossier à sa première connexion, sans qu'on ait
 * eu à la rattacher au préalable.
 */
export async function listMyDirectDeals(userId: string, email: string) {
  return prisma.directDeal.findMany({
    where: {
      OR: [
        { openedById: userId },
        { counterpartyUserId: userId },
        { counterpartyEmail: email.toLowerCase() },
      ],
    },
    orderBy: { updatedAt: "desc" },
    select: {
      id: true,
      portfolioLabel: true,
      salePrice: true,
      stage: true,
      kit: true,
      escrow: true,
      attestations: true,
      createdAt: true,
    },
  });
}

/** Un dossier, si la personne en est partie. */
export async function findMyDirectDeal(id: string, userId: string, email: string) {
  const deal = await prisma.directDeal.findUnique({
    where: { id },
    include: {
      openedBy: { select: { publicAlias: true } },
    },
  });
  if (!deal) return null;
  const partie =
    deal.openedById === userId ||
    deal.counterpartyUserId === userId ||
    deal.counterpartyEmail === email.toLowerCase();
  return partie ? deal : null;
}
