"use server";

import { revalidatePath } from "next/cache";
import { canBuy, getActor, isAdmin } from "@/lib/authz/actor";
import { ForbiddenError, UnauthenticatedError } from "@/lib/authz/errors";
import { CAPACITE_MINIMUM_EUR, MODES_FINANCEMENT, declarationRecevable } from "@/lib/buyer/financial-capacity";
import { FINANCING_DOC_KIND } from "@/lib/buyer/financing-load";
import { safeFileName, sha256Buffer } from "@/lib/import/persist";
import { deleteObject, putObject } from "@/lib/storage/objects";
import { parseFrenchNumber } from "@/lib/import/values";
import { notifyPositionEvent } from "@/lib/notify/transactional";
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
    const mode = String(formData.get("financingMode") ?? "");
    if (!MODES_FINANCEMENT.some((m) => m.value === mode)) {
      return { error: "Indiquez votre mode de financement." };
    }

    /*
     * Le justificatif (accord de principe bancaire ou attestation de fonds) est
     * exigé avant tout engagement. Il se dépose ici, une fois ; un nouveau
     * fichier remplace l'ancien et relance le contrôle.
     */
    const fichier = formData.get("file");
    const existant = await prisma.accountDocument.findFirst({ where: { userId: actor.id, kind: FINANCING_DOC_KIND }, select: { id: true, storageKey: true } });
    if (fichier instanceof File && fichier.size > 0) {
      if (fichier.size > 10 * 1024 * 1024) return { error: "Fichier trop volumineux (10 Mo au maximum)." };
      const nomBrut = fichier.name.toLowerCase();
      const type = ["application/pdf", "image/jpeg", "image/png"].includes(fichier.type)
        ? fichier.type
        : nomBrut.endsWith(".pdf") ? "application/pdf" : /\.jpe?g$/.test(nomBrut) ? "image/jpeg" : nomBrut.endsWith(".png") ? "image/png" : null;
      if (!type) return { error: "Formats acceptés : PDF, JPG ou PNG." };
      const bytes = new Uint8Array(await fichier.arrayBuffer());
      const nom = safeFileName(fichier.name);
      const storageKey = `comptes/${actor.id}/financement-${crypto.randomUUID()}-${nom}`;
      await putObject(storageKey, bytes);
      await prisma.accountDocument.create({
        data: { userId: actor.id, kind: FINANCING_DOC_KIND, fileName: nom, storageKey, sha256: sha256Buffer(bytes), contentType: type, sizeBytes: bytes.byteLength },
      });
      if (existant) {
        await prisma.accountDocument.delete({ where: { id: existant.id } });
        await deleteObject(existant.storageKey).catch(() => undefined);
      }
    } else if (!existant) {
      return { error: "Déposez votre accord de principe bancaire ou votre attestation de fonds (PDF, JPG ou PNG)." };
    }

    await prisma.user.update({
      where: { id: actor.id },
      data: {
        financialCapacityEur: Math.round(montant).toFixed(2),
        financingMode: mode,
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
    console.error("declarerCapaciteAction", error);
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
      select: { id: true, email: true, financialCapacityStatus: true },
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

    // L'acquéreur apprend la décision sans avoir à revenir voir son profil.
    await notifyPositionEvent({
      key: `capacity:${decision}:${Date.now()}`,
      userId: cible.id,
      email: cible.email,
      title: decision === "VERIFIED" ? "Financement vérifié" : "Financement à revoir",
      body:
        decision === "VERIFIED"
          ? "Votre capacité d’acquisition est vérifiée pour douze mois : les cédants voient « financement vérifié » à côté de vos positionnements."
          : `Motif : ${note.replace(/[.\s]+$/, "")}. Déposez un nouveau justificatif dans votre profil pour vous positionner à nouveau.`,
      href: "/app/profil#capacite",
    }).catch((e: unknown) => console.error("notify", e));

    revalidatePath("/admin/capacites");
    return { done: true };
  } catch (error) {
    if (error instanceof UnauthenticatedError) return { error: "Authentification requise." };
    if (error instanceof ForbiddenError) return { error: error.message };
    return { error: "Décision impossible." };
  }
}
