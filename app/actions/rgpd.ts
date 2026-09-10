"use server";

import { getActor } from "@/lib/authz/actor";
import { UnauthenticatedError } from "@/lib/authz/errors";
import { prisma } from "@/lib/prisma";
import {
  dossiersBloquants,
  effacementPossible,
  identiteNeutralisee,
  motifDeRefus,
} from "@/lib/rgpd/effacement";

export type EffacementState = { error?: string; done?: boolean };

/**
 * Effacement du compte, article 17 du RGPD.
 *
 * Neutralise l'identite plutot que de supprimer la ligne : les offres, les
 * dossiers clos et les depots restent necessaires a la contrepartie et a la
 * conservation legale, et ils ne designent plus personne une fois l'identite
 * retiree. Une suppression franche casserait de surcroit les references, D1
 * refusant l'effacement d'une ligne encore citee.
 *
 * D1 n'a pas de transactions : les ecritures sont ordonnees de la plus
 * significative a la moins, de sorte qu'une interruption laisse un compte deja
 * ferme plutot qu'un compte a moitie identifiable.
 */
export async function effacerMonCompteAction(
  _prev: EffacementState,
  formData: FormData,
): Promise<EffacementState> {
  try {
    const actor = await getActor();
    if (!actor) throw new UnauthenticatedError();

    // Confirmation explicite : un effacement ne se declenche pas par megarde.
    if (formData.get("confirmation") !== "SUPPRIMER") {
      return { error: "Saisissez SUPPRIMER en majuscules pour confirmer." };
    }

    const dossiers = await prisma.deal.findMany({
      where: { OR: [{ sellerId: actor.id }, { buyerId: actor.id }] },
      select: { stage: true },
    });

    if (!effacementPossible(dossiers)) {
      return { error: motifDeRefus(dossiersBloquants(dossiers)) };
    }

    await prisma.dataRequest.create({
      data: { userId: actor.id, type: "DELETION", status: "PENDING" },
    });

    // L'identite d'abord : c'est elle qui protege la personne.
    await prisma.user.update({
      where: { id: actor.id },
      data: identiteNeutralisee(actor.id),
    });

    // Puis ce qui n'a plus d'objet une fois le compte ferme.
    await prisma.buyerMandate.deleteMany({ where: { buyerId: actor.id } });
    await prisma.notification.deleteMany({ where: { userId: actor.id } });
    await prisma.loginAttempt.deleteMany({ where: { identifier: actor.email.toLowerCase() } });

    await prisma.dataRequest.updateMany({
      where: { userId: actor.id, type: "DELETION", status: "PENDING" },
      data: { status: "COMPLETED", completedAt: new Date() },
    });

    await prisma.auditLog.create({
      data: {
        actorId: actor.id,
        action: "user.erased",
        entityType: "User",
        entityId: actor.id,
        metadata: { motif: "demande de l'utilisateur, article 17 RGPD" },
      },
    });

    return { done: true };
  } catch (error) {
    if (error instanceof UnauthenticatedError) return { error: "Authentification requise." };
    return { error: "Suppression impossible. Réessayez ou écrivez-nous." };
  }
}
