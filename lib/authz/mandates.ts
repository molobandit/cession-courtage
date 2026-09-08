import "server-only";
import { prisma } from "@/lib/prisma";
import { requireBuyer, type Actor } from "@/lib/authz/actor";
import { ForbiddenError } from "@/lib/authz/errors";

export async function listMyMandates(actor?: Actor) {
  const user = actor ?? (await requireBuyer());
  return prisma.buyerMandate.findMany({
    where: { buyerId: user.id },
    orderBy: { createdAt: "desc" },
    include: {
      _count: { select: { matches: true } },
    },
  });
}

export async function getMyMandate(mandateId: string, actor?: Actor) {
  const user = actor ?? (await requireBuyer());
  const mandate = await prisma.buyerMandate.findUnique({
    where: { id: mandateId },
  });
  if (!mandate || mandate.buyerId !== user.id) {
    throw new ForbiddenError("Ce mandat ne vous est pas accessible.");
  }
  return mandate;
}

/**
 * Demandes d'acquisition publiees, visibles de tous.
 *
 * Ne renvoie que des donnees anonymes : l'alias public de l'acquereur, jamais
 * son nom ni sa raison sociale. Aucune session n'est requise.
 */
export async function listPublicMandates() {
  return prisma.buyerMandate.findMany({
    where: { isPublic: true, isActive: true, publicNumber: { not: null } },
    orderBy: { updatedAt: "desc" },
    select: {
      id: true,
      publicNumber: true,
      maxBudget: true,
      minCommissions: true,
      maxCommissions: true,
      riskTypes: true,
      carriers: true,
      zones: true,
      clientSegments: true,
      financingMode: true,
      buyer: { select: { publicAlias: true } },
    },
  });
}
