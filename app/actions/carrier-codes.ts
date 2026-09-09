"use server";

import { CarrierCodeStatus } from "@prisma/client";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { canSell, getActor, isOriasVerified } from "@/lib/authz/actor";
import { ownsFirm } from "@/lib/authz/policies";
import { ForbiddenError, UnauthenticatedError } from "@/lib/authz/errors";
import { prisma } from "@/lib/prisma";
import { idSchema } from "@/lib/validations/actions";

export type CarrierCodeState = { error?: string };

const schema = z.object({
  portfolioId: idSchema,
  carrier: z
    .string()
    .trim()
    .min(1, "Compagnie manquante.")
    .max(120, "Nom de compagnie trop long."),
  status: z.enum(["PENDING", "NOTIFIED", "AGREED", "REFUSED"], {
    message: "État inconnu.",
  }),
  note: z
    .string()
    .trim()
    .max(500, "Note trop longue (500 caractères au maximum).")
    .optional()
    .or(z.literal("")),
});

/**
 * Enregistre l'état du transfert d'un code de courtage.
 *
 * L'appartenance du portefeuille est vérifiée au niveau de la requête : un
 * identifiant deviné ne permet rien. Seul le cédant renseigne ces états, un
 * acquéreur les consulte via le dossier.
 */
export async function setCarrierCodeStatusAction(
  _prev: CarrierCodeState,
  formData: FormData,
): Promise<CarrierCodeState> {
  try {
    const actor = await getActor();
    if (!actor) throw new UnauthenticatedError();
    if (!isOriasVerified(actor)) throw new ForbiddenError("ORIAS non validé.");
    if (!canSell(actor)) throw new ForbiddenError("Réservé aux cédants.");

    const parsed = schema.safeParse({
      portfolioId: formData.get("portfolioId"),
      carrier: formData.get("carrier"),
      status: formData.get("status"),
      note: formData.get("note") ?? "",
    });
    if (!parsed.success) {
      return { error: parsed.error.issues[0]?.message ?? "Saisie invalide." };
    }
    const { portfolioId, carrier, status, note } = parsed.data;

    const portfolio = await prisma.portfolio.findUnique({
      where: { id: portfolioId },
      select: { firmId: true },
    });
    if (!portfolio || !ownsFirm(actor, portfolio.firmId)) {
      return { error: "Ce portefeuille ne vous est pas accessible." };
    }

    // La compagnie doit exister dans le portefeuille : on ne suit pas un code
    // de courtage qui ne correspond à aucun contrat.
    const known = await prisma.contractLine.findFirst({
      where: { portfolioId, carrier },
      select: { id: true },
    });
    if (!known) return { error: "Cette compagnie n’apparaît pas dans le portefeuille." };

    const now = new Date();
    const decided = status === "AGREED" || status === "REFUSED";
    const data = {
      status: status as CarrierCodeStatus,
      note: note ? note : null,
      notifiedAt: status === "PENDING" ? null : now,
      decidedAt: decided ? now : null,
    };

    await prisma.carrierCode.upsert({
      where: { portfolioId_carrier: { portfolioId, carrier } },
      update: data,
      create: { portfolioId, carrier, ...data },
    });

    await prisma.auditLog.create({
      data: {
        actorId: actor.id,
        action: "portfolio.carrier_code.updated",
        entityType: "Portfolio",
        entityId: portfolioId,
        metadata: { carrier, status },
      },
    });

    revalidatePath(`/app/portefeuilles/${portfolioId}`);
    return {};
  } catch (error) {
    if (error instanceof UnauthenticatedError) return { error: "Authentification requise." };
    if (error instanceof ForbiddenError) return { error: error.message };
    return { error: "Enregistrement impossible." };
  }
}
