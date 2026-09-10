import "server-only";
import { empreinteCodeDeSecours } from "@/lib/auth/totp";
import { verifierCode } from "@/lib/auth/totp";
import { prisma } from "@/lib/prisma";

/** Le compte exige-t-il un second facteur ? Seul un facteur confirme compte. */
export async function secondFacteurActif(userId: string): Promise<boolean> {
  const ligne = await prisma.twoFactor.findUnique({
    where: { userId },
    select: { confirmedAt: true },
  });
  return Boolean(ligne?.confirmedAt);
}

/**
 * Verifie une saisie de second facteur : code temporaire, ou code de secours.
 *
 * Le code de secours est consomme des qu'il sert. Un code a usage unique qui
 * resterait valable n'aurait plus rien d'unique, et un telephone perdu se
 * remplace une fois, pas indefiniment.
 */
export async function verifierSecondFacteur(userId: string, saisie: string): Promise<boolean> {
  const propre = saisie.trim();
  if (!propre) return false;

  const ligne = await prisma.twoFactor.findUnique({
    where: { userId },
    select: { secret: true, confirmedAt: true },
  });
  if (!ligne?.confirmedAt) return false;

  if (await verifierCode(ligne.secret, propre)) return true;

  // Un seul hachage suffit a retrouver le code : l'empreinte est deterministe,
  // la recherche se fait par index plutot qu'en essayant les huit lignes.
  const empreinte = await empreinteCodeDeSecours(propre);
  const code = await prisma.recoveryCode.findUnique({
    where: { codeHash: empreinte },
    select: { id: true, userId: true, usedAt: true },
  });
  if (!code || code.userId !== userId || code.usedAt) return false;

  await prisma.recoveryCode.update({
    where: { id: code.id },
    data: { usedAt: new Date() },
  });
  return true;
}

/** Nombre de codes de secours encore utilisables, pour prevenir avant la panne. */
export async function codesDeSecoursRestants(userId: string): Promise<number> {
  return prisma.recoveryCode.count({ where: { userId, usedAt: null } });
}
