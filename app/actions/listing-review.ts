"use server";

import { revalidatePath } from "next/cache";
import { getActor, isAdmin } from "@/lib/authz/actor";
import { approveListing, rejectListing } from "@/lib/listing/review";
import { firstIssue, listingPriceSchema } from "@/lib/validations/actions";

export type ListingReviewState = { error?: string; ok?: string };

export async function reviewListingAction(_prev: ListingReviewState, formData: FormData): Promise<ListingReviewState> {
  const actor = await getActor();
  if (!actor || !isAdmin(actor)) return { error: "Réservé aux administrateurs." };
  const listingId = String(formData.get("listingId") ?? "");
  const decision = String(formData.get("decision") ?? "");
  try {
    if (decision === "approve") {
      const saisi = String(formData.get("price") ?? "").trim();
      if (!saisi) return { error: "Indiquez le montant de mise en ligne fixé par l’équipe." };
      const prix = listingPriceSchema.safeParse(saisi);
      if (!prix.success) return { error: firstIssue(prix.error) };
      await approveListing(listingId, actor.id, prix.data);
    } else if (decision === "reject") {
      const note = String(formData.get("note") ?? "").trim().slice(0, 500);
      if (note.length < 8) return { error: "Indiquez le motif (8 caractères minimum) : le cédant doit savoir quoi corriger." };
      await rejectListing(listingId, actor.id, note);
    } else {
      return { error: "Décision inconnue." };
    }
  } catch (error) {
    return { error: error instanceof Error ? error.message : "Décision impossible." };
  }
  revalidatePath("/admin/annonces");
  revalidatePath("/annonces");
  return { ok: decision === "approve" ? "Annonce mise en ligne." : "Dossier renvoyé au cédant." };
}
