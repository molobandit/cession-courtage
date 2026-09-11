import "server-only";
import { lookupOriasRegister, type OriasLookupResult } from "@/lib/orias/lookup";
import { prisma } from "@/lib/prisma";

export async function persistOriasLookup(userId: string): Promise<OriasLookupResult | null> {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: {
      role: true,
      oriasNumber: true,
      firm: { select: { legalName: true, siren: true } },
    },
  });
  if (!user || user.role === "INVESTOR" || user.role === "ADMIN" || !user.oriasNumber) {
    return null;
  }
  const result = await lookupOriasRegister({
    oriasNumber: user.oriasNumber,
    legalName: user.firm?.legalName,
    siren: user.firm?.siren,
  });
  await prisma.user.update({
    where: { id: userId },
    data: {
      oriasLookupStatus: result.status,
      oriasLookupAt: new Date(),
      oriasLookupName: result.registerName,
      oriasLookupSiren: result.registerSiren,
      oriasLookupDetail: result.detail,
    },
  });
  return result;
}

export const ORIAS_LOOKUP_LABELS: Record<string, string> = {
  MATCH: "Présent au registre, société concordante",
  MISMATCH: "Présent au registre, identité discordante",
  NOT_FOUND: "Absent du registre public",
  UNAVAILABLE: "Registre injoignable — décision humaine",
  INVALID: "Numéro invalide",
};
