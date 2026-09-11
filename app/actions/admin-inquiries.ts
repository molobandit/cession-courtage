"use server";

import { revalidatePath } from "next/cache";
import { setInvestorInquiryRead } from "@/lib/authz/admin";
import { AuthError } from "@/lib/authz/errors";

export type AdminInquiryState = { error?: string };

export async function toggleInvestorInquiryReadAction(
  _prev: AdminInquiryState,
  formData: FormData,
): Promise<AdminInquiryState> {
  const inquiryId = String(formData.get("inquiryId") ?? "");
  const read = String(formData.get("read") ?? "") === "1";
  if (!inquiryId) return { error: "Demande manquante." };
  try {
    await setInvestorInquiryRead(inquiryId, read);
  } catch (error) {
    if (error instanceof AuthError) return { error: error.message };
    throw error;
  }
  revalidatePath("/admin/investisseurs");
  return {};
}
