"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { getActor, isOriasVerified } from "@/lib/authz/actor";
import { isDealParticipant } from "@/lib/authz/policies";
import { ForbiddenError, UnauthenticatedError } from "@/lib/authz/errors";
import { prisma } from "@/lib/prisma";
import { idSchema } from "@/lib/validations/actions";

export type DueDiligenceState = { error?: string };

const schema = z.object({
  itemId: idSchema,
  provided: z.enum(["true", "false"]),
});

/**
 * Marque une pièce du bordereau comme fournie, ou revient en arrière.
 *
 * Seul le cédant dépose les pièces : c'est lui qui les détient. L'acquéreur
 * consulte l'avancement, ce qui évite les relances par courriel.
 */
export async function toggleDueDiligenceItemAction(
  _prev: DueDiligenceState,
  formData: FormData,
): Promise<DueDiligenceState> {
  try {
    const actor = await getActor();
    if (!actor) throw new UnauthenticatedError();
    if (!isOriasVerified(actor)) throw new ForbiddenError("ORIAS non validé.");

    const parsed = schema.safeParse({
      itemId: formData.get("itemId"),
      provided: formData.get("provided"),
    });
    if (!parsed.success) return { error: "Saisie invalide." };

    const item = await prisma.dueDiligenceItem.findUnique({
      where: { id: parsed.data.itemId },
      select: { id: true, dealId: true, deal: { select: { sellerId: true, buyerId: true } } },
    });
    // Un identifiant deviné ne rend rien : l'appartenance au dossier est vérifiée ici.
    if (!item || !isDealParticipant(actor, item.deal)) {
      return { error: "Cette pièce ne vous est pas accessible." };
    }
    if (actor.id !== item.deal.sellerId) {
      return { error: "Seul le cédant dépose les pièces." };
    }

    await prisma.dueDiligenceItem.update({
      where: { id: item.id },
      data: { providedAt: parsed.data.provided === "true" ? new Date() : null },
    });

    revalidatePath(`/app/dossiers/${item.dealId}`);
    return {};
  } catch (error) {
    if (error instanceof UnauthenticatedError) return { error: "Authentification requise." };
    if (error instanceof ForbiddenError) return { error: error.message };
    return { error: "Enregistrement impossible." };
  }
}
