"use server";

import { revalidatePath } from "next/cache";
import { canSell, getActor, isOriasVerified } from "@/lib/authz";
import { findMyListing } from "@/lib/authz/listings";
import { sha256Buffer, safeFileName } from "@/lib/import/persist";
import {
  COMPANY_DOC_KINDS,
  insertCompanyDoc,
} from "@/lib/listing/company-docs";
import { putObject, StorageUnavailableError } from "@/lib/storage/objects";

export type CompanyDocFormState = { error?: string; ok?: boolean };

const MAX_BYTES = 10 * 1024 * 1024;
const ALLOWED = new Set(["application/pdf"]);
const KINDS = new Set(COMPANY_DOC_KINDS.map((k) => k.kind));

export async function uploadCompanyDocumentAction(
  _prev: CompanyDocFormState,
  formData: FormData,
): Promise<CompanyDocFormState> {
  const actor = await getActor();
  if (!actor) return { error: "Connectez-vous pour déposer une pièce." };
  if (!isOriasVerified(actor)) return { error: "ORIAS non validé." };
  if (!canSell(actor)) return { error: "Réservé aux cédants." };

  const listingId = String(formData.get("listingId") ?? "");
  const kind = String(formData.get("kind") ?? "");
  const listing = await findMyListing(listingId, actor);
  if (!listing) return { error: "Annonce introuvable." };
  if (!KINDS.has(kind)) return { error: "Type de pièce invalide." };

  const file = formData.get("file");
  if (!(file instanceof File) || file.size === 0) {
    return { error: "Choisissez un fichier PDF." };
  }
  if (file.size > MAX_BYTES) return { error: "Fichier trop volumineux (10 Mo maximum)." };
  if (!ALLOWED.has(file.type) && !file.name.toLowerCase().endsWith(".pdf")) {
    return { error: "Format accepté : PDF." };
  }

  const buffer = new Uint8Array(await file.arrayBuffer());
  const name = safeFileName(file.name);
  const id = crypto.randomUUID();
  const storageKey = `cabinet/${actor.id}/${listing.id}/${id}/${name}`;

  try {
    await putObject(storageKey, buffer);
    await insertCompanyDoc({
      id,
      listingId: listing.id,
      kind,
      fileName: name,
      storageKey,
      sha256: sha256Buffer(buffer),
      uploadedById: actor.id,
    });
  } catch (error) {
    if (error instanceof StorageUnavailableError) return { error: error.message };
    return { error: "Dépôt impossible pour le moment." };
  }

  revalidatePath(`/app/annonces/${listing.id}`);
  revalidatePath(`/annonces/${listing.publicNumber}`);
  return { ok: true };
}
