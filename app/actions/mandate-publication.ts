"use server";

import { revalidatePath } from "next/cache";
import { getActor, isOriasVerified, canBuy } from "@/lib/authz/actor";
import { ForbiddenError, UnauthenticatedError } from "@/lib/authz/errors";
import { prisma } from "@/lib/prisma";
import { idSchema } from "@/lib/validations/actions";
import { assignMandatePublicNumber } from "@/lib/mandate/assign-number";

export type MandatePublicationState = { error?: string };

/**
 * Publie ou retire une demande d'acquisition du catalogue.
 *
 * Seul le propriétaire du mandat peut le faire, et l'appartenance est vérifiée
 * au niveau de la requête. Publier n'expose que l'alias public de l'acquéreur.
 */
export async function toggleMandatePublicationAction(
  _prev: MandatePublicationState,
  formData: FormData,
): Promise<MandatePublicationState> {
  try {
    const actor = await getActor();
    if (!actor) throw new UnauthenticatedError();
    if (!isOriasVerified(actor)) throw new ForbiddenError("ORIAS non validé.");
    if (!canBuy(actor)) throw new ForbiddenError("Réservé aux acquéreurs.");

    const parsed = idSchema.safeParse(formData.get("mandateId"));
    if (!parsed.success) return { error: "Identifiant de mandat invalide." };
    const publish = formData.get("publish") === "true";

    const mandate = await prisma.buyerMandate.findUnique({
      where: { id: parsed.data },
      select: { id: true, buyerId: true, publicNumber: true },
    });
    if (!mandate || mandate.buyerId !== actor.id) {
      return { error: "Ce mandat ne vous est pas accessible." };
    }

    // Le numéro public est attribué une seule fois : un mandat retiré puis
    // republié garde sa référence, comme une annonce.
    let publicNumber = mandate.publicNumber;
    if (publish && publicNumber === null) {
      publicNumber = await assignMandatePublicNumber(mandate.id);
    } else {
      await prisma.buyerMandate.update({
        where: { id: mandate.id },
        data: { isPublic: publish, publicNumber },
      });
    }

    await prisma.auditLog.create({
      data: {
        actorId: actor.id,
        action: publish ? "mandate.published" : "mandate.unpublished",
        entityType: "BuyerMandate",
        entityId: mandate.id,
        metadata: { publicNumber },
      },
    });

    revalidatePath("/app/mandats");
    revalidatePath("/annonces");
    revalidatePath("/annonces/demandes");
    return {};
  } catch (error) {
    if (error instanceof UnauthenticatedError) return { error: "Authentification requise." };
    if (error instanceof ForbiddenError) return { error: error.message };
    return { error: "Publication impossible." };
  }
}
