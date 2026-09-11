"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { requireAdmin } from "@/lib/authz/actor";
import { decideKyc, rejectOrias, verifyOrias } from "@/lib/authz/admin";
import { persistOriasLookup } from "@/lib/orias/persist";
import { AuthError } from "@/lib/authz/errors";

export type AdminState = { error?: string; ok?: string };

export async function verifyOriasAction(_prev: AdminState, formData: FormData): Promise<AdminState> {
  const userId = String(formData.get("userId") ?? "");
  if (!userId) return { error: "Utilisateur manquant." };
  try {
    await verifyOrias(userId);
  } catch (error) {
    if (error instanceof AuthError) return { error: error.message };
    throw error;
  }
  revalidatePath("/admin/orias");
  return { ok: "Numéro ORIAS validé." };
}

const rejectSchema = z.object({
  userId: z.string().min(1),
  reason: z.string().trim().min(8, "Indiquez un motif (8 caractères minimum).").max(500),
});

export async function rejectOriasAction(_prev: AdminState, formData: FormData): Promise<AdminState> {
  const parsed = rejectSchema.safeParse({
    userId: formData.get("userId"),
    reason: formData.get("reason"),
  });
  if (!parsed.success) {
    return { error: parsed.error.flatten().fieldErrors.reason?.[0] ?? "Motif invalide." };
  }
  try {
    await rejectOrias(parsed.data.userId, parsed.data.reason);
  } catch (error) {
    if (error instanceof AuthError) return { error: error.message };
    throw error;
  }
  revalidatePath("/admin/orias");
  return { ok: "Demande refusée." };
}

export async function lookupOriasAction(_prev: AdminState, formData: FormData): Promise<AdminState> {
  const userId = String(formData.get("userId") ?? "");
  if (!userId) return { error: "Utilisateur manquant." };
  try {
    await requireAdmin();
    const result = await persistOriasLookup(userId);
    if (!result) return { error: "Consultation impossible pour ce compte." };
    revalidatePath("/admin/orias");
    return { ok: result.detail };
  } catch (error) {
    if (error instanceof AuthError) return { error: error.message };
    throw error;
  }
}

export async function decideKycAction(_prev: AdminState, formData: FormData): Promise<AdminState> {
  const userId = String(formData.get("userId") ?? "");
  const approved = String(formData.get("approved") ?? "") === "1";
  const reason = String(formData.get("reason") ?? "").trim();
  if (!userId) return { error: "Utilisateur manquant." };
  if (!approved && reason.length < 8) return { error: "Indiquez un motif (8 caractères minimum)." };
  try {
    await decideKyc(userId, approved, reason || undefined);
  } catch (error) {
    if (error instanceof AuthError) return { error: error.message };
    throw error;
  }
  revalidatePath("/admin/orias");
  return { ok: approved ? "Identité confirmée." : "Identité refusée." };
}
