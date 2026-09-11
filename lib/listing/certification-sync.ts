import "server-only";
import {
  statutAChanger,
  statutCertification,
  type StatutCertification,
} from "@/lib/listing/certification-decision";
import { prisma } from "@/lib/prisma";

/**
 * Recalcule le statut de certification d'une annonce et l'écrit si besoin.
 *
 * Appelée après chaque mouvement de pièce : dépôt par le cédant, validation ou
 * refus par l'éditeur. Le statut n'est donc jamais saisi à la main, il est
 * toujours la conséquence de ce que les pièces disent.
 *
 * Idempotente : rappelée sans changement, elle n'écrit rien. D1 n'ayant pas de
 * transactions, une fonction rejouable vaut mieux qu'une écriture protégée.
 */
export async function synchroniserCertification(
  listingId: string,
): Promise<StatutCertification | null> {
  const listing = await prisma.listing.findUnique({
    where: { id: listingId },
    select: { certificationRequested: true, certificationStatus: true },
  });
  if (!listing) return null;

  const pieces = await prisma.certificationDocument.findMany({
    where: { listingId },
    select: { category: true, label: true, status: true },
  });

  const calcule = statutCertification(pieces, listing.certificationRequested);
  const aEcrire = statutAChanger(listing.certificationStatus, calcule);
  if (!aEcrire) return null;

  await prisma.listing.update({
    where: { id: listingId },
    data: { certificationStatus: aEcrire },
  });

  // Le passage au label engage l'editeur devant l'acquereur : il se trace.
  await prisma.auditLog.create({
    data: {
      action: `listing.certification.${aEcrire.toLowerCase()}`,
      entityType: "Listing",
      entityId: listingId,
      metadata: { avant: listing.certificationStatus, apres: aEcrire },
    },
  });

  return aEcrire;
}
