"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { getActor, isOriasVerified } from "@/lib/authz/actor";
import { stripeConfigured, stripeCreatePaymentCheckout } from "@/lib/billing/stripe";
import { prisma } from "@/lib/prisma";
import { feeLines, feesTotal, hasAnyService, type DirectServices } from "@/lib/direct/fees";
import { DIRECT_FEES_KIND } from "@/lib/direct/fees-payment";
import {
  carriersEditable,
  feesTtcCents,
  parseCarrierLines,
  priceRequired,
  readTransferCarriers,
  transferBlockers,
} from "@/lib/direct/services";
import { canAdvance, stepByKey, type DirectStage } from "@/lib/direct/stages";
import { formatEuroWhole } from "@/lib/format/number";
import { notifyDirectDealAdvanced, notifyDirectDealInvited } from "@/lib/notify/transactional";
import { siteUrl } from "@/lib/site";
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
  if (priceRequired(services) && parsed.data.salePrice <= 0) {
    return { error: "Le montant doit être supérieur à zéro." };
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

  /*
   * L'invitation part vraiment. Sans elle, la contrepartie n'apprend l'existence
   * du dossier que si l'on pense à la prévenir soi-même — et le dossier reste
   * bloqué à l'étape que seule elle peut franchir.
   */
  await notifyDirectDealInvited({
    dealId: dossier.id,
    to: counterpartyEmail.toLowerCase(),
    inviterAlias: actor.publicAlias,
    portfolioLabel: parsed.data.portfolioLabel,
    priceLabel: formatEuroWhole(parsed.data.salePrice),
    services: feeLines({ services, salePrice: parsed.data.salePrice, escrowedAmount: 0 }).map((l) => l.label),
    hasAccount: Boolean(contrepartie && !contrepartie.erasedAt),
  });

  revalidatePath("/app/formaliser");
  revalidatePath("/app");
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

    const estOuvreur = deal.openedById === actor.id;

    // Un accord ne se donne pas à soi-même : c'est l'autre partie qui confirme.
    if (cible === "ACCEPTED" && estOuvreur) {
      return { error: "L’accord doit venir de la contrepartie. Elle a reçu l’invitation par e-mail." };
    }

    /*
     * Les honoraires sont réglés avant qu'un prestataire ne travaille : la
     * vérification, l'acte, le séquestre et les attestations ont un coût dès
     * qu'on les déclenche. Tant que le paiement en ligne est fermé, rien n'est
     * exigé — on ne bloque pas un dossier sur un guichet qui n'existe pas.
     */
    if (cible !== "ACCEPTED" && !deal.feesPaidAt && stripeConfigured()) {
      return { error: "Réglez les honoraires pour poursuivre." };
    }

    if (cible === "TRANSFER") {
      const manques = transferBlockers({
        carriers: readTransferCarriers(deal.carriers),
        effectiveDate: deal.transferEffectiveDate,
      });
      if (manques.length > 0) {
        return { error: `Avant les attestations, renseignez ${manques.join(" et ")}.` };
      }
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
      cible === "ACCEPTED" && !deal.counterpartyUserId ? { counterpartyUserId: actor.id } : {};

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

    // L'autre partie est prévenue ; celle qui vient d'agir le sait déjà.
    const ouvreur = await prisma.user.findUnique({
      where: { id: deal.openedById },
      select: { id: true, email: true },
    });
    const parties = [
      ouvreur ? { userId: ouvreur.id, email: ouvreur.email } : null,
      { userId: deal.counterpartyUserId ?? (estOuvreur ? null : actor.id), email: deal.counterpartyEmail },
    ].filter((p): p is { userId: string | null; email: string } => p !== null);
    await notifyDirectDealAdvanced({
      dealId: deal.id,
      stage: cible,
      stageLabel: stepByKey(cible).label,
      portfolioLabel: deal.portfolioLabel,
      recipients: parties.filter((p) => p.email.toLowerCase() !== actor.email.toLowerCase()),
    });

    revalidatePath(`/app/formaliser/${deal.id}`);
    revalidatePath("/app/formaliser");
    revalidatePath("/app");
    return {};
  } catch (error) {
    return { error: error instanceof Error ? error.message : "Étape impossible." };
  }
}

/**
 * Compagnies et date d'effet, pour les attestations.
 *
 * Les deux parties peuvent les tenir à jour — c'est souvent l'acquéreur qui a
 * les codes sous les yeux — mais seulement jusqu'à l'étape des attestations.
 */
export async function saveDirectCarriersAction(
  _prev: DirectDealState,
  formData: FormData,
): Promise<DirectDealState> {
  try {
    const { actor, deal } = await loadDirectDeal(String(formData.get("dealId") ?? ""));
    const services: DirectServices = {
      kit: deal.kit,
      escrow: deal.escrow,
      attestations: deal.attestations,
    };
    if (!carriersEditable(deal.stage as DirectStage, services)) {
      return { error: "Les attestations sont émises : la liste des compagnies est figée." };
    }

    const carriers = parseCarrierLines(String(formData.get("carriers") ?? ""));
    const brute = String(formData.get("effectiveDate") ?? "").trim();
    let effectiveDate: Date | null = null;
    if (brute) {
      if (!/^\d{4}-\d{2}-\d{2}$/.test(brute)) return { error: "Date d’effet invalide." };
      effectiveDate = new Date(`${brute}T12:00:00Z`);
      const an = 365 * 24 * 60 * 60 * 1000;
      if (
        Number.isNaN(effectiveDate.getTime()) ||
        effectiveDate.getTime() < Date.now() - an ||
        effectiveDate.getTime() > Date.now() + 2 * an
      ) {
        return { error: "La date d’effet doit se situer entre l’an dernier et les deux ans à venir." };
      }
    }

    await prisma.directDeal.update({
      where: { id: deal.id },
      data: { carriers, transferEffectiveDate: effectiveDate },
    });
    await prisma.auditLog.create({
      data: {
        actorId: actor.id,
        action: "direct.carriers_saved",
        entityType: "DirectDeal",
        entityId: deal.id,
        metadata: { count: carriers.length },
      },
    });

    revalidatePath(`/app/formaliser/${deal.id}`);
    return { id: deal.id };
  } catch (error) {
    return { error: error instanceof Error ? error.message : "Enregistrement impossible." };
  }
}

/**
 * Règlement des honoraires par carte.
 *
 * L'une ou l'autre partie peut payer : qui prend en charge les frais se
 * convient entre elles, la plateforme n'a pas à trancher. Le montant est
 * recalculé ici, jamais lu dans le formulaire.
 */
export async function startDirectFeesCheckoutAction(
  _prev: DirectDealState,
  formData: FormData,
): Promise<DirectDealState> {
  let destination: string | null = null;
  try {
    const { actor, deal } = await loadDirectDeal(String(formData.get("dealId") ?? ""));
    if (deal.feesPaidAt) return { error: "Les honoraires sont déjà réglés." };
    // Rien n'est encaissé sur un dossier que la contrepartie n'a pas accepté.
    if (deal.stage === "INVITED") {
      return { error: "Les honoraires se règlent une fois les conditions confirmées par la contrepartie." };
    }
    if (!stripeConfigured()) return { error: "Le règlement en ligne n’est pas encore ouvert." };

    const services: DirectServices = {
      kit: deal.kit,
      escrow: deal.escrow,
      attestations: deal.attestations,
    };
    const prix = Number(deal.salePrice);
    const sequestre = Math.round(prix * (Number(deal.upfrontPercent) / 100) * 100) / 100;
    const lignes = feeLines({ services, salePrice: prix, escrowedAmount: sequestre });
    const montant = feesTtcCents(feesTotal(lignes));
    if (montant <= 0) return { error: "Aucun honoraire à régler sur ce dossier." };

    const origine = siteUrl();
    const session = await stripeCreatePaymentCheckout({
      userId: actor.id,
      email: actor.email,
      amountCents: montant,
      name: `Services à la carte : ${lignes.map((l) => l.label).join(", ")}`,
      description: `${deal.portfolioLabel} · ${formatEuroWhole(feesTotal(lignes))} HT + TVA`,
      metadata: { kind: DIRECT_FEES_KIND, directDealId: deal.id },
      successUrl: `${origine}/app/formaliser/${deal.id}?session_id={CHECKOUT_SESSION_ID}`,
      cancelUrl: `${origine}/app/formaliser/${deal.id}`,
    });
    if (!session.url) return { error: "Session incomplète." };
    destination = session.url;
  } catch (error) {
    console.error("startDirectFeesCheckoutAction", error);
    return { error: error instanceof Error ? error.message : "Règlement impossible pour le moment." };
  }
  redirect(destination);
}
