"use server";

import { createHash } from "node:crypto";
import { revalidatePath } from "next/cache";
import { AGREEMENTS, AGREEMENT_VERSION, buildAgreement } from "@/lib/account/agreements";
import { getActor, isOriasVerified } from "@/lib/authz/actor";
import { loadDocumentParty } from "@/lib/direct/parties";
import { prisma } from "@/lib/prisma";

export type AgreementsState = { error?: string; ok?: string };

async function clientIp(): Promise<string | null> {
  try {
    const { headers } = await import("next/headers");
    const h = await headers();
    return h.get("cf-connecting-ip") ?? h.get("x-forwarded-for")?.split(",")[0]?.trim() ?? null;
  } catch {
    return null;
  }
}

/**
 * Signature des deux engagements, en un geste.
 *
 * Le nom tapé doit être celui du représentant au compte : on ne signe pas pour
 * un autre. Chaque signature garde l'empreinte du texte lu et le numéro ORIAS
 * sous lequel elle vaut.
 */
export async function signAgreementsAction(_prev: AgreementsState, formData: FormData): Promise<AgreementsState> {
  const actor = await getActor();
  if (!actor) return { error: "Connectez-vous pour continuer." };
  if (!isOriasVerified(actor) || !actor.oriasNumber) return { error: "Votre immatriculation ORIAS doit d’abord être validée." };
  if (formData.get("consent") !== "on") return { error: "Cochez la case pour confirmer." };

  const nom = String(formData.get("signatureName") ?? "").trim().replace(/\s+/g, " ");
  if (nom.length < 3 || nom.length > 120) return { error: "Écrivez le nom et le prénom du signataire." };
  if (actor.fullName && nom.toLowerCase() !== actor.fullName.trim().toLowerCase()) {
    return { error: `Les engagements sont signés par le titulaire du compte : ${actor.fullName}.` };
  }

  const party = await loadDocumentParty(actor.id);
  const maintenant = new Date();
  const ip = await clientIp();
  for (const a of AGREEMENTS) {
    const doc = buildAgreement(a.kind, party, actor.oriasNumber, maintenant);
    const contentHash = createHash("sha256").update(JSON.stringify(doc)).digest("hex");
    await prisma.userAgreement.upsert({
      where: {
        userId_kind_version_oriasNumber: { userId: actor.id, kind: a.kind, version: AGREEMENT_VERSION, oriasNumber: actor.oriasNumber },
      },
      update: {},
      create: {
        userId: actor.id,
        kind: a.kind,
        version: AGREEMENT_VERSION,
        oriasNumber: actor.oriasNumber,
        contentHash,
        signatureName: nom,
        ipAddress: ip,
        signedAt: maintenant,
      },
    });
    await prisma.auditLog.create({
      data: { actorId: actor.id, action: `agreement.signed.${a.kind.toLowerCase()}`, entityType: "User", entityId: actor.id, metadata: { version: AGREEMENT_VERSION, oriasNumber: actor.oriasNumber, contentHash } },
    });
  }

  revalidatePath("/app/engagements");
  revalidatePath("/app/profil");
  return { ok: "Engagements signés. Ils valent pour toutes vos annonces et cessions, tant que dure votre ORIAS." };
}
