"use server";

import { revalidatePath } from "next/cache";
import { getActor, isAdmin } from "@/lib/authz/actor";
import { ForbiddenError, UnauthenticatedError } from "@/lib/authz/errors";
import { synchroniserCertification } from "@/lib/listing/certification-sync";
import { prisma } from "@/lib/prisma";
import { idSchema } from "@/lib/validations/actions";

export type ReviewState = { error?: string; statut?: string };

/**
 * Contrôle d'une pièce de certification par l'éditeur.
 *
 * C'est le seul geste humain de la chaîne. Le statut de l'annonce n'est jamais
 * saisi : il découle des pièces, et se recalcule après chaque décision. Dès que
 * toutes les pièces obligatoires sont validées, le label tombe tout seul.
 */
export async function trancherPieceAction(
  _prev: ReviewState,
  formData: FormData,
): Promise<ReviewState> {
  try {
    const actor = await getActor();
    if (!actor) throw new UnauthenticatedError();
    if (!isAdmin(actor)) throw new ForbiddenError("Réservé aux administrateurs.");

    const parsed = idSchema.safeParse(formData.get("documentId"));
    if (!parsed.success) return { error: "Pièce introuvable." };

    const decision = String(formData.get("decision") ?? "");
    if (decision !== "VALIDATED" && decision !== "REJECTED") {
      return { error: "Décision inconnue." };
    }

    const commentaire = String(formData.get("comment") ?? "").trim().slice(0, 500);
    if (decision === "REJECTED" && !commentaire) {
      // Un refus sans motif oblige le cedant a deviner ce qui cloche.
      return { error: "Indiquez ce qui manque dans la pièce refusée." };
    }

    const piece = await prisma.certificationDocument.findUnique({
      where: { id: parsed.data },
      select: { id: true, listingId: true, status: true },
    });
    if (!piece) return { error: "Pièce introuvable." };
    if (piece.status === "MISSING") {
      return { error: "Cette pièce n’a pas encore été déposée." };
    }

    await prisma.certificationDocument.update({
      where: { id: piece.id },
      data: { status: decision, teamComment: commentaire || null },
    });

    await prisma.auditLog.create({
      data: {
        actorId: actor.id,
        action: decision === "VALIDATED" ? "certification.doc.validated" : "certification.doc.rejected",
        entityType: "CertificationDocument",
        entityId: piece.id,
        metadata: { listingId: piece.listingId, commentaire: commentaire || null },
      },
    });

    // Le label se gagne ici, sans intervention supplementaire.
    const statut = await synchroniserCertification(piece.listingId);

    revalidatePath("/admin/certifications");
    revalidatePath(`/app/annonces/${piece.listingId}/certification`);
    return { statut: statut ?? undefined };
  } catch (error) {
    if (error instanceof UnauthenticatedError) return { error: "Authentification requise." };
    if (error instanceof ForbiddenError) return { error: error.message };
    return { error: "Décision impossible." };
  }
}
