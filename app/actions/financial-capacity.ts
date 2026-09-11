"use server";

import { revalidatePath } from "next/cache";
import { canBuy, getActor, isAdmin } from "@/lib/authz/actor";
import { ForbiddenError, UnauthenticatedError } from "@/lib/authz/errors";
import { CAPACITE_MINIMUM_EUR, declarationRecevable } from "@/lib/buyer/financial-capacity";
import { parseFrenchNumber } from "@/lib/import/values";
import { prisma } from "@/lib/prisma";
import { idSchema } from "@/lib/validations/actions";

export type CapaciteState = { error?: string; done?: boolean };

/**
 * Déclaration de capacité d'acquisition par l'acquéreur.
 *
 * Déclarer n'est pas être vérifié : le statut passe à DECLARED et attend le
 * contrôle de l'éditeur. Sans cette séparation, n'importe qui s'attribuerait la
 * mention que le site affiche publiquement.
 */
export async function declarerCapaciteAction(
  _prev: CapaciteState,
  formData: FormData,
): Promise<CapaciteState> {
  try {
    const actor = await getActor();
    if (!actor) throw new UnauthenticatedError();
    if (!canBuy(actor)) throw new ForbiddenError("Réservé aux acquéreurs.");

    const montant = parseFrenchNumber(String(formData.get("montant") ?? ""));
    if (montant == null || !declarationRecevable(montant)) {
      return {
        error: `Indiquez un montant d’au moins ${CAPACITE_MINIMUM_EUR.toLocaleString("fr-FR")} €.`,
      };
    }

    await prisma.user.update({
      where: { id: actor.id },
      data: {
        financialCapacityEur: Math.round(montant).toFixed(2),
        financialCapacityStatus: "DECLARED",
        // La date appartient au contrôle, pas à la déclaration : on l'efface
        // pour qu'une ancienne vérification ne survive pas à un nouveau montant.
        financialCapacityAt: null,
        financialCapacityNote: null,
      },
    });

    await prisma.auditLog.create({
      data: {
        actorId: actor.id,
        action: "user.capacity.declared",
        entityType: "User",
        entityId: actor.id,
        metadata: { montant: Math.round(montant) },
      },
    });

    revalidatePath("/app/profil");
    return { done: true };
  } catch (error) {
    if (error instanceof UnauthenticatedError) return { error: "Authentification requise." };
    if (error instanceof ForbiddenError) return { error: error.message };
    return { error: "Déclaration impossible." };
  }
}

/**
 * Contrôle de la capacité par l'éditeur, pièce à l'appui.
 *
 * C'est ce geste qui fonde l'affirmation publique du site. Il est daté, motivé
 * et tracé : une allégation commerciale doit pouvoir être prouvée.
 */
export async function trancherCapaciteAction(
  _prev: CapaciteState,
  formData: FormData,
): Promise<CapaciteState> {
  try {
    const actor = await getActor();
    if (!actor) throw new UnauthenticatedError();
    if (!isAdmin(actor)) throw new ForbiddenError("Réservé aux administrateurs.");

    const parsed = idSchema.safeParse(formData.get("userId"));
    if (!parsed.success) return { error: "Compte introuvable." };

    const decision = String(formData.get("decision") ?? "");
    if (decision !== "VERIFIED" && decision !== "REJECTED") {
      return { error: "Décision inconnue." };
    }

    const note = String(formData.get("note") ?? "").trim().slice(0, 500);
    if (decision === "REJECTED" && !note) {
      // Un refus sans motif est incontestable, donc contestable : on l'exige.
      return { error: "Indiquez le motif du refus." };
    }

    const cible = await prisma.user.findUnique({
      where: { id: parsed.data },
      select: { id: true, financialCapacityStatus: true },
    });
    if (!cible) return { error: "Compte introuvable." };

    await prisma.user.update({
      where: { id: cible.id },
      data: {
        financialCapacityStatus: decision,
        financialCapacityAt: new Date(),
        financialCapacityNote: note || null,
      },
    });

    await prisma.auditLog.create({
      data: {
        actorId: actor.id,
        action: decision === "VERIFIED" ? "user.capacity.verified" : "user.capacity.rejected",
        entityType: "User",
        entityId: cible.id,
        metadata: { note: note || null },
      },
    });

    revalidatePath("/admin/capacites");
    return { done: true };
  } catch (error) {
    if (error instanceof UnauthenticatedError) return { error: "Authentification requise." };
    if (error instanceof ForbiddenError) return { error: error.message };
    return { error: "Décision impossible." };
  }
}
