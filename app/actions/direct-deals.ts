"use server";

import { revalidatePath } from "next/cache";
import { getActor, isOriasVerified } from "@/lib/authz/actor";
import { prisma } from "@/lib/prisma";
import { hasAnyService, type DirectServices } from "@/lib/direct/fees";
import { canAdvance, type DirectStage } from "@/lib/direct/stages";
import { directDealSchema, firstIssue } from "@/lib/validations/actions";
import {
  holdDirectEscrow,
  releaseDirectEscrow,
  signDirectDeed,
  verifyPartyIdentity,
} from "@/lib/partners/runtime";

export type DirectDealState = { error?: string; id?: string };

/**
 * Ouverture d'un dossier de gré à gré.
 *
 * Aucune annonce n'est en jeu : les parties se connaissent déjà et ont convenu
 * d'un prix. Ce qui est vendu ici, c'est la formalisation — l'acte, les
 * attestations, la vérification des parties, le séquestre.
 *
 * La contrepartie est désignée par son adresse et non par un compte : elle n'en
 * a pas forcément encore. Le rattachement se fait à sa première connexion.
 */
export async function openDirectDealAction(
  _prev: DirectDealState,
  formData: FormData,
): Promise<DirectDealState> {
  const actor = await getActor();
  if (!actor) return { error: "Connectez-vous pour ouvrir un dossier." };
  if (!isOriasVerified(actor)) return { error: "ORIAS non validé." };

  const parsed = directDealSchema.safeParse({
    openerRole: formData.get("openerRole"),
    counterpartyEmail: formData.get("counterpartyEmail"),
    portfolioLabel: formData.get("portfolioLabel"),
    salePrice: formData.get("salePrice"),
    upfrontPercent: formData.get("upfrontPercent"),
  });
  if (!parsed.success) return { error: firstIssue(parsed.error) };

  const services: DirectServices = {
    kit: formData.get("kit") === "on",
    escrow: formData.get("escrow") === "on",
    attestations: formData.get("attestations") === "on",
  };
  if (!hasAnyService(services)) {
    return { error: "Choisissez au moins un service à formaliser." };
  }

  const { counterpartyEmail } = parsed.data;
  if (counterpartyEmail.toLowerCase() === actor.email.toLowerCase()) {
    return { error: "La contrepartie ne peut pas être vous-même." };
  }

  // Rattachement si la contrepartie a déjà un compte ; sinon l'adresse suffit.
  const contrepartie = await prisma.user.findUnique({
    where: { email: counterpartyEmail.toLowerCase() },
    select: { id: true, erasedAt: true },
  });

  const dossier = await prisma.directDeal.create({
    data: {
      openedById: actor.id,
      openerRole: parsed.data.openerRole,
      counterpartyEmail: counterpartyEmail.toLowerCase(),
      counterpartyUserId: contrepartie && !contrepartie.erasedAt ? contrepartie.id : null,
      portfolioLabel: parsed.data.portfolioLabel,
      salePrice: parsed.data.salePrice.toFixed(2),
      upfrontPercent: parsed.data.upfrontPercent.toFixed(2),
      kit: services.kit,
      escrow: services.escrow,
      attestations: services.attestations,
    },
    select: { id: true },
  });

  await prisma.auditLog.create({
    data: {
      actorId: actor.id,
      action: "direct.opened",
      entityType: "DirectDeal",
      entityId: dossier.id,
      metadata: { services, role: parsed.data.openerRole },
    },
  });

  revalidatePath("/app/formaliser");
  return { id: dossier.id };
}

/** Les deux parties d'un dossier de gré à gré, et elles seules. */
async function loadDirectDeal(id: string) {
  const actor = await getActor();
  if (!actor) throw new Error("Authentification requise.");
  const deal = await prisma.directDeal.findUnique({ where: { id } });
  if (!deal) throw new Error("Dossier introuvable.");

  const estPartie =
    deal.openedById === actor.id ||
    deal.counterpartyUserId === actor.id ||
    deal.counterpartyEmail.toLowerCase() === actor.email.toLowerCase();
  if (!estPartie) throw new Error("Dossier inaccessible.");

  return { actor, deal };
}

/**
 * Passage à l'étape suivante.
 *
 * Une seule action pour tout le parcours, parce qu'une seule règle le gouverne :
 * on avance d'un cran, sur les étapes que les services achetés prévoient, et
 * jamais en arrière. Chaque étape engage les parties — revenir dessus
 * laisserait un acte signé sur un dossier réputé non signé.
 */
export async function advanceDirectDealAction(
  _prev: DirectDealState,
  formData: FormData,
): Promise<DirectDealState> {
  try {
    const { actor, deal } = await loadDirectDeal(String(formData.get("dealId") ?? ""));
    const cible = String(formData.get("stage") ?? "") as DirectStage;
    const services: DirectServices = {
      kit: deal.kit,
      escrow: deal.escrow,
      attestations: deal.attestations,
    };

    if (!canAdvance(deal.stage as DirectStage, cible, services)) {
      return { error: "Cette étape n’est pas celle qui vient." };
    }

    /*
     * L'étape est exécutée avant d'être enregistrée.
     *
     * Le bouton porte le nom de l'étape qu'il accomplit : cliquer « Signature »,
     * c'est signer. Si le prestataire échoue, l'exception remonte et le dossier
     * ne bouge pas — l'inverse laisserait un acte réputé signé que personne n'a
     * signé, ou des fonds réputés bloqués qui n'ont jamais quitté un compte.
     */
    if (cible === "KYC") {
      const parties = [deal.openedById, deal.counterpartyUserId ?? actor.id];
      for (const userId of new Set(parties)) {
        await verifyPartyIdentity(userId);
      }
    }
    if (cible === "SIGNATURE") await signDirectDeed(deal.id);
    if (cible === "ESCROW") await holdDirectEscrow(deal.id);
    // Les fonds ne se libèrent qu'à la clôture, et seulement s'ils ont été bloqués.
    if (cible === "CLOSED" && deal.escrow && deal.escrowStage === "FUNDS_HELD") {
      await releaseDirectEscrow(deal.id);
    }

    // La contrepartie qui confirme se rattache au dossier par la même occasion.
    const rattachement =
      cible === "ACCEPTED" && !deal.counterpartyUserId && deal.openedById !== actor.id
        ? { counterpartyUserId: actor.id }
        : {};

    await prisma.directDeal.update({
      where: { id: deal.id },
      data: {
        stage: cible,
        ...rattachement,
        ...(cible === "CLOSED" ? { closedAt: new Date() } : {}),
      },
    });

    await prisma.auditLog.create({
      data: {
        actorId: actor.id,
        action: `direct.${cible.toLowerCase()}`,
        entityType: "DirectDeal",
        entityId: deal.id,
        metadata: { depuis: deal.stage },
      },
    });

    revalidatePath(`/app/formaliser/${deal.id}`);
    revalidatePath("/app/formaliser");
    return {};
  } catch (error) {
    return { error: error instanceof Error ? error.message : "Étape impossible." };
  }
}
