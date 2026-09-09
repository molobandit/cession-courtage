"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { rejectOrias, verifyOrias } from "@/lib/authz/admin";
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
