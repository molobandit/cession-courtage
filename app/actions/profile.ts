"use server";

import { revalidatePath } from "next/cache";
import { getActor, isOriasVerified } from "@/lib/authz";
import { hashPassword, verifyPassword } from "@/lib/auth/password";
import { parseNotifyPrefs } from "@/lib/account/notify-prefs";
import { prisma } from "@/lib/prisma";
import { LEGAL_FORMS } from "@/lib/validations/auth";
import { type DistributionMode } from "@prisma/client";
import { z } from "zod";

export type ProfileFormState = { error?: string; ok?: boolean };

const schema = z.object({
  firstName: z.string().trim().min(1, "Indiquez le prénom.").max(80),
  lastName: z.string().trim().min(1, "Indiquez le nom.").max(80),
  phone: z.string().trim().min(8, "Indiquez un téléphone professionnel.").max(30),
  jobTitle: z
    .string()
    .trim()
    .max(80)
    .optional()
    .transform((v) => (v && v.length > 0 ? v : null)),
  legalName: z.string().trim().max(160).optional(),
  legalForm: z.string().trim().max(20).optional(),
  address: z.string().trim().max(200).optional(),
  postalCode: z
    .string()
    .trim()
    .optional()
    .refine((v) => !v || /^\d{5}$/.test(v), "Le code postal doit contenir 5 chiffres."),
  city: z.string().trim().max(80).optional(),
  website: z.string().trim().max(200).optional(),
  foundedYear: z
    .string()
    .trim()
    .optional()
    .refine((v) => !v || /^(19|20)\d{2}$/.test(v), "Indiquez une année à quatre chiffres."),
  headcount: z
    .string()
    .trim()
    .optional()
    .refine((v) => !v || (/^\d+$/.test(v) && Number(v) <= 9999), "Effectif invalide."),
  distributionMode: z.enum(["OFFICE", "AGENCY", "REMOTE", "MIXED", ""]).optional(),
});

export async function updateProfileAction(
  _prev: ProfileFormState,
  formData: FormData,
): Promise<ProfileFormState> {
  const actor = await getActor();
  if (!actor) return { error: "Connectez-vous." };
  if (!isOriasVerified(actor)) return { error: "ORIAS non validé." };

  const parsed = schema.safeParse({
    firstName: formData.get("firstName"),
    lastName: formData.get("lastName"),
    phone: formData.get("phone"),
    jobTitle: formData.get("jobTitle") ?? "",
    legalName: formData.get("legalName") ?? "",
    legalForm: formData.get("legalForm") ?? "",
    address: formData.get("address") ?? "",
    postalCode: formData.get("postalCode") ?? "",
    city: formData.get("city") ?? "",
    website: formData.get("website") ?? "",
    foundedYear: formData.get("foundedYear") ?? "",
    headcount: formData.get("headcount") ?? "",
    distributionMode: formData.get("distributionMode") ?? "",
  });
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Saisie invalide." };

  const fullName = `${parsed.data.firstName} ${parsed.data.lastName}`.replace(/\s+/g, " ").trim();

  await prisma.user.update({
    where: { id: actor.id },
    data: { fullName, phone: parsed.data.phone, jobTitle: parsed.data.jobTitle },
  });

  if (actor.firmId && parsed.data.legalName) {
    const form = LEGAL_FORMS.includes(parsed.data.legalForm as (typeof LEGAL_FORMS)[number])
      ? parsed.data.legalForm
      : undefined;
    await prisma.firm.update({
      where: { id: actor.firmId },
      data: {
        legalName: parsed.data.legalName,
        ...(form ? { legalForm: form } : {}),
        ...(parsed.data.address ? { address: parsed.data.address } : {}),
        ...(parsed.data.postalCode ? { postalCode: parsed.data.postalCode } : {}),
        ...(parsed.data.city ? { city: parsed.data.city } : {}),
        ...(parsed.data.distributionMode
          ? { distributionMode: parsed.data.distributionMode as DistributionMode }
          : {}),
        ...(parsed.data.headcount
          ? { headcount: Number(parsed.data.headcount) }
          : {}),
        ...(parsed.data.foundedYear
          ? { foundedAt: new Date(`${parsed.data.foundedYear}-01-01T00:00:00.000Z`) }
          : {}),
        website: parsed.data.website || null,
      },
    });
  }

  revalidatePath("/app/profil");
  revalidatePath("/app");
  return { ok: true };
}

const passwordSchema = z
  .object({
    currentPassword: z.string().min(1, "Indiquez le mot de passe actuel."),
    newPassword: z
      .string()
      .min(10, "Le nouveau mot de passe doit contenir au moins 10 caractères.")
      .regex(/[A-Za-z]/, "Le mot de passe doit contenir une lettre.")
      .regex(/\d/, "Le mot de passe doit contenir un chiffre."),
    confirmPassword: z.string(),
  })
  .refine((data) => data.newPassword === data.confirmPassword, {
    message: "La confirmation ne correspond pas.",
    path: ["confirmPassword"],
  });

export async function changePasswordAction(
  _prev: ProfileFormState,
  formData: FormData,
): Promise<ProfileFormState> {
  const actor = await getActor();
  if (!actor) return { error: "Connectez-vous." };
  if (!isOriasVerified(actor)) return { error: "ORIAS non validé." };

  const parsed = passwordSchema.safeParse({
    currentPassword: formData.get("currentPassword"),
    newPassword: formData.get("newPassword"),
    confirmPassword: formData.get("confirmPassword"),
  });
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Saisie invalide." };

  const row = await prisma.user.findUnique({
    where: { id: actor.id },
    select: { passwordHash: true },
  });
  if (!row?.passwordHash) return { error: "Aucun mot de passe n’est associé à ce compte." };
  const ok = await verifyPassword(parsed.data.currentPassword, row.passwordHash);
  if (!ok) return { error: "Le mot de passe actuel est incorrect." };

  await prisma.user.update({
    where: { id: actor.id },
    data: { passwordHash: await hashPassword(parsed.data.newPassword) },
  });
  revalidatePath("/app/profil");
  return { ok: true };
}

export async function updateNotifyPrefsAction(
  _prev: ProfileFormState,
  formData: FormData,
): Promise<ProfileFormState> {
  const actor = await getActor();
  if (!actor) return { error: "Connectez-vous." };
  if (!isOriasVerified(actor)) return { error: "ORIAS non validé." };

  const prefs = parseNotifyPrefs(null);
  prefs.messages = formData.get("messages") === "on";
  prefs.offers = formData.get("offers") === "on";
  prefs.deals = formData.get("deals") === "on";
  prefs.billing = formData.get("billing") === "on";

  await prisma.user.update({
    where: { id: actor.id },
    data: { notifyPrefs: JSON.stringify(prefs) },
  });
  revalidatePath("/app/profil");
  return { ok: true };
}

const searchPrefsSchema = z.object({
  zone: z.string().trim().max(80),
  risk: z.string().trim().max(80),
  carrier: z.string().trim().max(80),
  segment: z.string().trim().max(80),
  maxPrice: z.string().trim().max(20),
  certifiedOnly: z.boolean(),
});

export async function updateSearchPrefsAction(
  _prev: ProfileFormState,
  formData: FormData,
): Promise<ProfileFormState> {
  const actor = await getActor();
  if (!actor) return { error: "Connectez-vous." };
  if (!isOriasVerified(actor)) return { error: "ORIAS non validé." };

  const parsed = searchPrefsSchema.safeParse({
    zone: formData.get("zone") ?? "",
    risk: formData.get("risk") ?? "",
    carrier: formData.get("carrier") ?? "",
    segment: formData.get("segment") ?? "",
    maxPrice: formData.get("maxPrice") ?? "",
    certifiedOnly: formData.get("certifiedOnly") === "on",
  });
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Saisie invalide." };

  await prisma.user.update({
    where: { id: actor.id },
    data: { searchPrefs: JSON.stringify(parsed.data) },
  });
  revalidatePath("/app/profil");
  revalidatePath("/annonces");
  return { ok: true };
}
