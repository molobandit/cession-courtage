"use server";

import { revalidatePath } from "next/cache";
import { canSell, getActor, isOriasVerified } from "@/lib/authz";
import { findMyListing } from "@/lib/authz/listings";
import {
  findCertificationDoc,
  markCertificationDocReceived,
} from "@/lib/listing/certification-docs";
import { safeFileName } from "@/lib/import/persist";
import { putObject, StorageUnavailableError } from "@/lib/storage/objects";

export type CertificationFormState = { error?: string; ok?: boolean };

const MAX_BYTES = 10 * 1024 * 1024;
const ALLOWED = new Set(["application/pdf", "image/jpeg", "image/png"]);

export async function uploadCertificationDocumentAction(
  _prev: CertificationFormState,
  formData: FormData,
): Promise<CertificationFormState> {
  const actor = await getActor();
  if (!actor) return { error: "Connectez-vous pour déposer une pièce." };
  if (!isOriasVerified(actor)) return { error: "ORIAS non validé." };
  if (!canSell(actor)) return { error: "Réservé aux cédants." };

  const listingId = String(formData.get("listingId") ?? "");
  const documentId = String(formData.get("documentId") ?? "");
  const listing = await findMyListing(listingId, actor);
  if (!listing) return { error: "Annonce introuvable." };

  const slot = await findCertificationDoc(documentId, listing.id);
  if (!slot) return { error: "Pièce introuvable." };

  const file = formData.get("file");
  if (!(file instanceof File) || file.size === 0) {
    return { error: "Choisissez un fichier PDF, JPEG ou PNG." };
  }
  if (file.size > MAX_BYTES) return { error: "Fichier trop volumineux (10 Mo maximum)." };
  if (!ALLOWED.has(file.type)) return { error: "Formats acceptés : PDF, JPEG, PNG." };

  const buffer = new Uint8Array(await file.arrayBuffer());
  const name = safeFileName(file.name);
  const storageKey = `certification/${actor.id}/${listing.id}/${documentId}/${name}`;

  try {
    await putObject(storageKey, buffer);
  } catch (error) {
    if (error instanceof StorageUnavailableError) {
      return { error: error.message };
    }
    return { error: "Dépôt impossible pour le moment." };
  }

  await markCertificationDocReceived(documentId, name, storageKey);
  revalidatePath(`/app/annonces/${listing.id}/certification`);
  return { ok: true };
}
