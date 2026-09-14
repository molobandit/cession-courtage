"use server";

import { revalidatePath } from "next/cache";
import { getActor, isOriasVerified } from "@/lib/authz/actor";
import { FIRM_PROFILE_SECTIONS, parseSectionForm, readFirmProfile } from "@/lib/firm/profile";
import { prisma } from "@/lib/prisma";

export type FirmProfileState = { error?: string; ok?: string };

/** Enregistre un volet du profil du cabinet ; les autres volets sont conservés tels quels. */
export async function saveFirmProfileSectionAction(_prev: FirmProfileState, formData: FormData): Promise<FirmProfileState> {
  const actor = await getActor();
  if (!actor) return { error: "Connectez-vous pour continuer." };
  if (!isOriasVerified(actor)) return { error: "ORIAS non validé." };
  if (!actor.firmId) return { error: "Aucun cabinet n’est rattaché à votre compte." };
  const section = FIRM_PROFILE_SECTIONS.find((s) => s.key === formData.get("section"));
  if (!section) return { error: "Volet inconnu." };

  const firm = await prisma.firm.findUnique({ where: { id: actor.firmId }, select: { profileJson: true } });
  if (!firm) return { error: "Cabinet introuvable." };
  const profil = readFirmProfile(firm.profileJson);
  profil[section.key] = parseSectionForm(section, formData);
  await prisma.firm.update({ where: { id: actor.firmId }, data: { profileJson: profil } });

  revalidatePath("/app/profil");
  return { ok: `${section.title} enregistré.` };
}
