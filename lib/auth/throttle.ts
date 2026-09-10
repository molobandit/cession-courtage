import "server-only";
import { prisma } from "@/lib/prisma";
import {
  attenteApresEchecs,
  fenetreExpiree,
  messageVerrou,
  secondesRestantes,
} from "@/lib/auth/throttle-policy";

/**
 * Verrouillage progressif des tentatives de connexion.
 *
 * D1 n'a pas de transactions : le compteur peut theoriquement perdre un
 * increment si deux tentatives arrivent au meme instant. C'est sans
 * consequence, un attaquant n'y gagne au pire qu'un essai supplementaire, et la
 * garantie recherchee est le ralentissement, pas l'exactitude comptable.
 */

function cle(email: string): string {
  return email.trim().toLowerCase();
}

/**
 * Retourne un message si l'acces est verrouille, sinon null.
 * Le message ne dit jamais si le compte existe.
 */
export async function verrouActif(email: string, maintenant = new Date()): Promise<string | null> {
  const ligne = await prisma.loginAttempt.findUnique({
    where: { identifier: cle(email) },
    select: { lockedUntil: true },
  });
  const secondes = secondesRestantes(ligne?.lockedUntil ?? null, maintenant);
  return secondes > 0 ? messageVerrou(secondes) : null;
}

/** Enregistre un echec et pose le verrou si le palier est atteint. */
export async function enregistrerEchec(email: string, maintenant = new Date()): Promise<void> {
  const identifier = cle(email);
  const ligne = await prisma.loginAttempt.findUnique({
    where: { identifier },
    select: { failedCount: true, lastFailedAt: true },
  });

  // Une longue accalmie remet le compteur a zero : les erreurs de frappe d'un
  // utilisateur legitime, etalees dans le temps, ne doivent pas s'accumuler.
  const repartDeZero = ligne ? fenetreExpiree(ligne.lastFailedAt, maintenant) : true;
  const echecs = repartDeZero ? 1 : ligne!.failedCount + 1;

  const attente = attenteApresEchecs(echecs);
  const lockedUntil = attente > 0 ? new Date(maintenant.getTime() + attente) : null;

  await prisma.loginAttempt.upsert({
    where: { identifier },
    update: { failedCount: echecs, lastFailedAt: maintenant, lockedUntil },
    create: { identifier, failedCount: echecs, lastFailedAt: maintenant, lockedUntil },
  });
}

/** Efface le compteur : la connexion a abouti. */
export async function effacerEchecs(email: string): Promise<void> {
  await prisma.loginAttempt.deleteMany({ where: { identifier: cle(email) } });
}
