import "server-only";
import { prisma } from "@/lib/prisma";
import { isAdmin, isInvestor, type Actor } from "@/lib/authz/actor";
import { ForbiddenError } from "@/lib/authz/errors";

function assertInvestor(actor: Actor) {
  if (!isInvestor(actor) && !isAdmin(actor)) {
    throw new ForbiddenError("Réservé aux investisseurs.");
  }
}

export async function findMyInvestorPosition(listingId: string, investorId: string) {
  return prisma.investorPosition.findUnique({
    where: { listingId_investorId: { listingId, investorId } },
    select: { id: true, depositAmount: true, createdAt: true },
  });
}

export async function listMyInvestorPositions(actor: Actor) {
  assertInvestor(actor);
  return prisma.investorPosition.findMany({
    where: { investorId: actor.id },
    orderBy: { createdAt: "desc" },
    include: {
      listing: {
        select: {
          id: true,
          publicNumber: true,
          askingPrice: true,
          displayedZone: true,
          status: true,
          isNationwide: true,
        },
      },
    },
  });
}

export async function listAllInvestorPositions(actor: Actor) {
  if (!isAdmin(actor)) throw new ForbiddenError("Réservé aux administrateurs.");
  return prisma.investorPosition.findMany({
    orderBy: { createdAt: "desc" },
    include: {
      listing: { select: { publicNumber: true, status: true } },
      investor: { select: { fullName: true, email: true } },
    },
  });
}
