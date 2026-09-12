import "server-only";
import { prisma } from "@/lib/prisma";
import { nextMandatePublicNumber } from "@/lib/mandate/public";

export async function assignMandatePublicNumber(mandateId: string): Promise<number> {
  const mandate = await prisma.buyerMandate.findUnique({
    where: { id: mandateId },
    select: { id: true, publicNumber: true },
  });
  if (!mandate) throw new Error("Mandat introuvable.");
  if (mandate.publicNumber !== null) return mandate.publicNumber;
  const taken = await prisma.buyerMandate.findMany({
    where: { publicNumber: { not: null } },
    select: { publicNumber: true },
  });
  const publicNumber = nextMandatePublicNumber(
    taken.map((t) => t.publicNumber).filter((n): n is number => n !== null),
  );
  await prisma.buyerMandate.update({
    where: { id: mandate.id },
    data: { isPublic: true, publicNumber },
  });
  return publicNumber;
}
