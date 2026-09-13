"use server";

import { revalidatePath } from "next/cache";
import { getActor, isOriasVerified } from "@/lib/authz/actor";
import { ACCOUNT_PIECES, isAccountPieceKind, missingAccountPieces } from "@/lib/account/verification";
import { missingPartyFields } from "@/lib/direct/documents";
import { loadDocumentParty } from "@/lib/direct/parties";
import { safeFileName, sha256Buffer } from "@/lib/import/persist";
import { notifyPositionEvent } from "@/lib/notify/transactional";
import { prisma } from "@/lib/prisma";
import { deleteObject, putObject, StorageUnavailableError } from "@/lib/storage/objects";

export type AccountVerificationState = { error?: string; ok?: string };

const MAX_BYTES = 10 * 1024 * 1024;

function typeOf(file: File): string | null {
  const nom = file.name.toLowerCase();
  if (["application/pdf", "image/jpeg", "image/png"].includes(file.type)) return file.type;
  if (nom.endsWith(".pdf")) return "application/pdf";
  if (nom.endsWith(".jpg") || nom.endsWith(".jpeg")) return "image/jpeg";
  if (nom.endsWith(".png")) return "image/png";
  return null;
}

/**
 * Dépôt d'une pièce du compte.
 *
 * Quand la dernière pièce arrive et que le profil est complet, le compte part
 * en vérification sans bouton de plus. Remplacer une pièce d'un compte déjà
 * vérifié le renvoie en vérification : la plateforme ne garantit que ce
 * qu'elle a contrôlé.
 */
export async function uploadAccountDocumentAction(
  _prev: AccountVerificationState,
  formData: FormData,
): Promise<AccountVerificationState> {
  try {
    const actor = await getActor();
    if (!actor) return { error: "Connectez-vous pour continuer." };
    if (!isOriasVerified(actor)) return { error: "ORIAS non validé." };
    const kind = String(formData.get("kind") ?? "");
    if (!isAccountPieceKind(kind)) return { error: "Type de pièce inconnu." };
    const file = formData.get("file");
    if (!(file instanceof File) || file.size === 0) return { error: "Choisissez un fichier." };
    if (file.size > MAX_BYTES) return { error: "Fichier trop volumineux (10 Mo au maximum)." };
    const type = typeOf(file);
    if (!type) return { error: "Formats acceptés : PDF, JPG ou PNG." };

    const bytes = new Uint8Array(await file.arrayBuffer());
    const nom = safeFileName(file.name);
    const storageKey = `comptes/${actor.id}/${crypto.randomUUID()}-${nom}`;
    await putObject(storageKey, bytes);

    const anciennes = await prisma.accountDocument.findMany({ where: { userId: actor.id, kind }, select: { id: true, storageKey: true } });
    await prisma.accountDocument.create({
      data: { userId: actor.id, kind, fileName: nom, storageKey, sha256: sha256Buffer(bytes), contentType: type, sizeBytes: bytes.byteLength },
    });
    for (const a of anciennes) {
      await prisma.accountDocument.delete({ where: { id: a.id } });
      await deleteObject(a.storageKey).catch(() => undefined);
    }

    const kinds = (await prisma.accountDocument.findMany({ where: { userId: actor.id }, select: { kind: true } })).map((d) => d.kind);
    const manquantes = missingAccountPieces(kinds);
    const profil = missingPartyFields(await loadDocumentParty(actor.id));
    let message = "Pièce déposée.";

    if (manquantes.length === 0 && profil.length === 0 && (actor.kycStatus !== "PENDING" || anciennes.length > 0)) {
      await prisma.user.update({
        where: { id: actor.id },
        data: { kycStatus: "PENDING", kycSubmittedAt: new Date(), kycReviewNote: null },
      });
      await prisma.auditLog.create({
        data: { actorId: actor.id, action: "kyc.submitted", entityType: "User", entityId: actor.id, metadata: { pieces: kinds } },
      });
      const admins = await prisma.user.findMany({ where: { role: "ADMIN", erasedAt: null }, select: { id: true, email: true } });
      for (const admin of admins) {
        await notifyPositionEvent({
          key: `kyc-submitted:${actor.id}:${Date.now()}`,
          userId: admin.id,
          email: admin.email,
          title: "Compte à vérifier",
          body: `${actor.email} a déposé ses ${ACCOUNT_PIECES.length} pièces d’identification.`,
          href: "/admin/orias#identite",
        }).catch(() => undefined);
      }
      message = "Pièces complètes : votre compte part en vérification.";
    } else if (manquantes.length === 0 && profil.length > 0) {
      message = `Pièces complètes. Complétez encore votre profil : ${profil.join(", ")}.`;
    }

    revalidatePath("/app/profil");
    return { ok: message };
  } catch (error) {
    if (error instanceof StorageUnavailableError) return { error: error.message };
    console.error("uploadAccountDocumentAction", error);
    return { error: "Dépôt impossible pour le moment." };
  }
}
