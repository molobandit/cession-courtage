import "server-only";
import { financementPret } from "@/lib/buyer/financial-capacity";
import { prisma } from "@/lib/prisma";

export const FINANCING_DOC_KIND = "FINANCING";

/** Justificatif de financement d'un acquéreur, relu en base, contrôlé pour un montant. */
export async function checkFinancing(userId: string, montantVise: number) {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: {
      financingMode: true,
      financialCapacityEur: true,
      financialCapacityStatus: true,
      financialCapacityAt: true,
      accountDocuments: { where: { kind: FINANCING_DOC_KIND }, select: { id: true }, take: 1 },
    },
  });
  if (!user) return { ok: false as const, raison: "Compte introuvable." };
  return financementPret({
    capacite: {
      montantEur: user.financialCapacityEur === null ? null : Number(user.financialCapacityEur),
      statut: user.financialCapacityStatus,
      verifieeLe: user.financialCapacityAt,
    },
    mode: user.financingMode,
    justificatifDepose: user.accountDocuments.length > 0,
    montantVise,
  });
}
