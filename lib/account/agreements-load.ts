import "server-only";
import { agreementsStatus, type AgreementsStatus } from "@/lib/account/agreements";
import { prisma } from "@/lib/prisma";

/** Engagements en vigueur d'un compte, sous son immatriculation ORIAS actuelle. */
export async function loadAgreementsStatus(user: { id: string; oriasNumber: string | null }): Promise<AgreementsStatus> {
  const rows = await prisma.userAgreement.findMany({
    where: { userId: user.id },
    select: { kind: true, version: true, oriasNumber: true, signedAt: true },
  });
  return agreementsStatus(rows, user.oriasNumber);
}

export const AGREEMENTS_REQUIRED_MESSAGE =
  "Signez d’abord vos engagements (confidentialité et contrat d’intermédiation) : une seule fois, valables toute la durée de votre ORIAS.";
