"use server";

import { revalidatePath } from "next/cache";
import { getActor } from "@/lib/authz/actor";
import { prisma } from "@/lib/prisma";

export type KycFormState = { error?: string; ok?: string };

export async function submitKycAction(
  _prev: KycFormState,
  _formData: FormData,
): Promise<KycFormState> {
  const actor = await getActor();
  if (!actor) return { error: "Authentification requise." };
  if (actor.kycStatus === "VERIFIED") return { ok: "Identité déjà vérifiée." };
  if (actor.kycStatus === "PENDING") return { ok: "Dossier déjà transmis." };

  await prisma.user.update({
    where: { id: actor.id },
    data: { kycStatus: "PENDING", kycSubmittedAt: new Date() },
  });
  await prisma.auditLog.create({
    data: {
      actorId: actor.id,
      action: "kyc.submitted",
      entityType: "User",
      entityId: actor.id,
    },
  });
  revalidatePath("/app/profil");
  return { ok: "Dossier transmis. Un administrateur confirmera l’identité professionnelle." };
}
