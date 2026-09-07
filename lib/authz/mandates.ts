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
