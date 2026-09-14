"use server";

import { DealStage, ListingStatus, OfferStatus } from "@prisma/client";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { canBuy, getActor, isOriasVerified, listOffersForListing } from "@/lib/authz";
import { isOfferWindowSealed, ownsFirm } from "@/lib/authz/policies";
import { ForbiddenError, UnauthenticatedError } from "@/lib/authz/errors";
import { hasContactSubscription } from "@/lib/billing/contact-access";
import { offPlatformPhoneError } from "@/lib/chat/phone-block";
import { prisma } from "@/lib/prisma";
import {
  checkOfferLot,
  conflictingOfferIds,
  listingLots,
  readCarriers,
} from "@/lib/listing/lot-availability";
import { fullyCommitted } from "@/lib/listing/lots";
import { findMyDeposit } from "@/lib/listing/deposit";
import { loadAgreementsStatus, AGREEMENTS_REQUIRED_MESSAGE } from "@/lib/account/agreements-load";
import { isDepositMethod, startDepositPayment } from "@/lib/billing/deposit-checkout";
import { checkFinancing } from "@/lib/buyer/financing-load";
import { recordOffer } from "@/lib/offer/record";
import { listingAcceptsOffers } from "@/lib/offer/acceptance";
import { notifyOfferDecision } from "@/lib/position/events";
import { ensurePosition } from "@/lib/position/load";
import { INTEREST_DEPOSIT_LABEL } from "@/lib/billing/rates";
import { firstIssue, offerIdSchema, offerSchema } from "@/lib/validations/actions";

export type OfferFormState = { error?: string };

async function requireBuyerActor() {
  const actor = await getActor();
  if (!actor) throw new UnauthenticatedError();
  if (!isOriasVerified(actor)) throw new ForbiddenError("ORIAS non validé.");
  if (!canBuy(actor)) throw new ForbiddenError("Réservé aux acquéreurs.");
  return actor;
}

const REDIRECTION = new Error("redirection vers le paiement");

export async function submitOfferAction(
  _prev: OfferFormState,
  formData: FormData,
): Promise<OfferFormState> {
  let paiement: string | null = null;
  try {
    const actor = await requireBuyerActor();
    if (!(await hasContactSubscription(actor))) {
      return {
        error:
          "Un abonnement annuel est requis pour accéder au détail de l’offre, au contact et à la messagerie.",
      };
    }
    const parsed = offerSchema.safeParse({
      listingId: formData.get("listingId"),
      amount: formData.get("amount"),
      upfrontPercent: formData.get("upfrontPercent"),
      message: formData.get("message"),
      effectiveDate: formData.get("effectiveDate"),
    });
    if (!parsed.success) return { error: firstIssue(parsed.error) };
    const { listingId, amount, upfrontPercent: upfront, message, effectiveDate } = parsed.data;
    const blockedOffer = message ? offPlatformPhoneError(message) : null;
    if (blockedOffer) return { error: blockedOffer };

    const listing = await prisma.listing.findUnique({
      where: { id: listingId },
      include: { portfolio: { select: { firmId: true } } },
    });
    if (!listing) return { error: "Annonce introuvable." };
    if (ownsFirm(actor, listing.portfolio.firmId)) {
      return { error: "Vous ne pouvez pas enchérir sur votre propre annonce." };
    }
    if (!listingAcceptsOffers(listing.status)) {
      return { error: "Cette annonce ne reçoit plus d’offres." };
    }

    /*
     * Avant toute offre : les engagements signés une fois (confidentialité,
     * contrat d'intermédiation), un financement justifié qui couvre le montant,
     * et un dépôt de garantie. Chaque refus dit le geste à faire.
     */
    const engagements = await loadAgreementsStatus(actor);
    if (!engagements.valid) return { error: AGREEMENTS_REQUIRED_MESSAGE };
    const financement = await checkFinancing(actor.id, amount);
    if (!financement.ok) return { error: financement.raison };

    /*
     * Lot visé. Vide = portefeuille entier, ce qui reste le cas courant.
     * La vérification a lieu ici, avant l'écriture : une offre déposée sur un
     * fournisseur déjà cédé serait invisible jusqu'à son acceptation, et le
     * cédant découvrirait le conflit au pire moment.
     */
    const demandes = formData
      .getAll("carriers")
      .map((v) => String(v).trim())
      .filter(Boolean);
    const lot = await checkOfferLot(listingId, demandes);
    if (!lot.ok) return { error: lot.error };

    const offre = {
      amount,
      upfrontPercent: upfront,
      message,
      effectiveDate: effectiveDate ? effectiveDate.toISOString().slice(0, 10) : null,
      carriers: lot.carriers,
    };

    const depot = await findMyDeposit(listingId, actor.id);
    let positionId: string;
    if (depot) {
      positionId = (await recordOffer(actor, listing, offre)).positionId;
    } else {
      // Dépôt et offre en un seul geste : l'offre part dès que le dépôt est payé.
      const methode = formData.get("paymentMethod");
      if (formData.get("engagement") !== "on" || !isDepositMethod(methode)) {
        return {
          error: `Choisissez la carte ou le prélèvement et cochez le dépôt de garantie de ${INTEREST_DEPOSIT_LABEL} du prix demandé. Il vient en déduction du prix si la cession aboutit.`,
        };
      }
      const suite = await startDepositPayment({
        buyer: actor,
        listing,
        method: methode,
        pendingOffer: offre,
        cancelPath: `/annonces/${listing.publicNumber}#position`,
      });
      if (suite.kind === "redirect") {
        paiement = suite.url;
        throw REDIRECTION;
      }
      positionId = suite.positionId ?? (await ensurePosition({ listingId, buyerId: actor.id })).id;
    }
    revalidatePath(`/annonces/${listing.publicNumber}`);
    revalidatePath("/app");
    // L'offre faite, l'acquéreur retrouve son dossier : c'est là qu'il suit la réponse.
    redirect(`/app/positions/${positionId}`);
  } catch (error) {
    if (error === REDIRECTION && paiement) redirect(paiement);
    if (
      typeof error === "object" &&
      error !== null &&
      "digest" in error &&
      String((error as { digest?: string }).digest).startsWith("NEXT_REDIRECT")
    ) {
      throw error;
    }
    return { error: error instanceof Error ? error.message : "Dépôt impossible." };
  }
}

/** Le retrait d'une offre rend le dépôt acquis au cédant, à titre indemnitaire. */
export async function withdrawOfferAction(
  _prev: OfferFormState,
  formData: FormData,
): Promise<OfferFormState> {
  try {
    const actor = await requireBuyerActor();
    const parsed = offerIdSchema.safeParse({ offerId: formData.get("offerId") });
    if (!parsed.success) return { error: firstIssue(parsed.error) };
    const { offerId } = parsed.data;
    const offer = await prisma.offer.findUnique({ where: { id: offerId } });
    if (!offer || offer.buyerId !== actor.id) return { error: "Offre introuvable." };
    if (offer.status !== OfferStatus.SUBMITTED) return { error: "Cette offre ne peut plus être retirée." };
    await prisma.offer.update({ where: { id: offerId }, data: { status: OfferStatus.WITHDRAWN } });

    /*
     * Le dépôt reste acquis au cédant. C'est la contrepartie annoncée avant
     * le versement : il a ouvert ses pièces et cessé de chercher ailleurs.
     * `updateMany` plutôt que `update` : un acquéreur peut retirer une offre
     * sans avoir de dépôt sur d'anciens dossiers, et l'absence n'est pas une
     * erreur.
     */
    await prisma.interestDeposit.updateMany({
      where: { listingId: offer.listingId, buyerId: actor.id, outcome: "PENDING" },
      data: { outcome: "RETAINED", settledAt: new Date() },
    });

    revalidatePath("/app");
    return {};
  } catch (error) {
    return { error: error instanceof Error ? error.message : "Retrait impossible." };
  }
}

export async function acceptOfferAction(
  _prev: OfferFormState,
  formData: FormData,
): Promise<OfferFormState> {
  let destination: string | null = null;
  try {
    const actor = await getActor();
    if (!actor) throw new UnauthenticatedError();
    const parsedId = offerIdSchema.safeParse({ offerId: formData.get("offerId") });
    if (!parsedId.success) return { error: firstIssue(parsedId.error) };

    const offer = await prisma.offer.findUnique({
      where: { id: parsedId.data.offerId },
      include: {
        listing: { include: { portfolio: { select: { firmId: true } } } },
        buyer: { select: { id: true, publicAlias: true } },
      },
    });
    if (!offer) return { error: "Offre introuvable." };
    if (!ownsFirm(actor, offer.listing.portfolio.firmId)) {
      return { error: "Seul le cédant peut retenir une offre." };
    }

    const engagementsCedant = await loadAgreementsStatus(actor);
    if (!engagementsCedant.valid) return { error: AGREEMENTS_REQUIRED_MESSAGE };

    await listOffersForListing(offer.listingId, actor);
    if (isOfferWindowSealed(offer.listing)) {
      const cloture = offer.listing.offerWindowClosesAt;
      return {
        error: `La séance est en cours${cloture ? ` jusqu’au ${cloture.toLocaleDateString("fr-FR", { timeZone: "Europe/Paris" })}` : ""} : vous pourrez retenir une offre à sa clôture.`,
      };
    }

    const dealKey = { listingId: offer.listingId, buyerId: offer.buyerId };
    const existingDeal = await prisma.deal.findUnique({
      where: { listingId_buyerId: dealKey },
      select: { id: true },
    });

    // Le dossier existe déjà : l'action a donc abouti, on y renvoie sans rien refaire.
    if (existingDeal) {
      redirect(`/app/dossiers/${existingDeal.id}`);
    }

    // D1 n'offre pas de transaction. Une acceptation interrompue laisse l'offre
    // en ACCEPTED sans dossier : cet état précis est reprenable.
    const resumable = offer.status === OfferStatus.ACCEPTED;
    if (offer.status !== OfferStatus.SUBMITTED && !resumable) {
      return { error: "Offre non recevable." };
    }

    const quota = await prisma.subscription.findFirst({
      where: { userId: actor.id, status: "ACTIVE" },
    });
    if (!resumable && quota?.dealQuota != null && quota.dealsUsed >= quota.dealQuota) {
      return { error: "Quota de dossiers du forfait atteint." };
    }

    const amount = Number(offer.amount);
    // Tout le prix passe par le séquestre ; le dépôt en sera déduit au versement.
    const upfront = Math.round(amount * 100) / 100;
    const seller = await prisma.user.findUnique({
      where: { id: actor.id },
      select: { publicAlias: true },
    });

    // Les étapes s'exécutent en requêtes indépendantes. L'ordre est choisi pour
    // qu'un échec en cours de route laisse un état reprenable, et la contrainte
    // unique (listingId, buyerId) empêche tout doublon à la reprise.

    // 1. Point d'engagement.
    if (!resumable) {
      await prisma.offer.update({
        where: { id: offer.id },
        data: { status: OfferStatus.ACCEPTED },
      });
    }

    // 2. Création du dossier, sans doublon possible.
    // Le dossier reprend le lot de l'offre : c'est lui qui sera transféré.
    const lotRetenu = readCarriers(offer.carriers);

    const deal = await prisma.deal.upsert({
      where: { listingId_buyerId: dealKey },
      update: {},
      create: {
        listingId: offer.listingId,
        sellerId: actor.id,
        buyerId: offer.buyerId,
        agreedPrice: amount.toFixed(2),
        upfrontAmount: upfront.toFixed(2),
        deferredAmount: (amount - upfront).toFixed(2),
        carriers: lotRetenu,
        // L'offre retenue vaut lettre d'intention : le dossier commence aux vérifications.
        stage: DealStage.DATA_ROOM,
        loiEffectiveDate: offer.effectiveDate,
        loiConditions: null,
        sellerAlias: `Cédant ${seller?.publicAlias ?? "C"}`,
        buyerAlias: `Acquéreur ${offer.buyer.publicAlias}`,
      },
    });
    // Confidentialité : signée une fois par chaque partie, pour la durée de son ORIAS.
    const acheteur = await prisma.user.findUnique({ where: { id: offer.buyerId }, select: { id: true, oriasNumber: true } });
    const [ndaAcheteur, ndaCedant] = await Promise.all([
      acheteur ? loadAgreementsStatus(acheteur) : null,
      loadAgreementsStatus(actor),
    ]);
    for (const [userId, at] of [
      [offer.buyerId, ndaAcheteur?.signed.NDA?.signedAt ?? offer.submittedAt],
      [actor.id, ndaCedant.signed.NDA?.signedAt ?? new Date()],
    ] as const) {
      await prisma.dealSignoff.upsert({
        where: { dealId_kind_userId: { dealId: deal.id, kind: "NDA_SIGNED", userId } },
        update: {},
        create: { dealId: deal.id, kind: "NDA_SIGNED", userId, createdAt: at },
      });
    }

    // 3. Conséquences dérivables : rejouables sans dommage.
    /*
     * Seules les offres qui visent un fournisseur du lot retenu sont écartées.
     * Retenir le livre AXA ne doit pas faire tomber l'offre de celui qui voulait
     * le Generali : c'est toute la raison d'être de la vente par lots.
     */
    const lots = await listingLots(offer.listingId);
    const aEcarter = await conflictingOfferIds(offer.listingId, offer.id, lotRetenu, lots);
    if (aEcarter.length > 0) {
      const ecartees = await prisma.offer.findMany({
        where: { id: { in: aEcarter } },
        select: { buyerId: true },
      });
      await prisma.offer.updateMany({
        where: { id: { in: aEcarter } },
        data: { status: OfferStatus.DECLINED },
      });
      for (const e of ecartees) {
        await notifyOfferDecision({ listingId: offer.listingId, buyerId: e.buyerId, accepted: false }).catch(
          (err) => console.error("notifyOfferDecision", err),
        );
      }
    }
    await notifyOfferDecision({
      listingId: offer.listingId,
      buyerId: offer.buyerId,
      accepted: true,
      dealId: deal.id,
    }).catch((err) => console.error("notifyOfferDecision", err));

    /*
     * L'annonce ne quitte le marché que lorsque plus aucun fournisseur n'est
     * libre. Sinon elle reste ouverte, pour que le reliquat trouve preneur.
     */
    const deals = await prisma.deal.findMany({
      where: { listingId: offer.listingId },
      select: { carriers: true },
    });
    const tous = lots.map((l) => l.carrier);
    const engages = deals.map((d) => {
      const c = readCarriers(d.carriers);
      return c.length > 0 ? c : tous;
    });
    if (lots.length === 0 || fullyCommitted(lots, engages)) {
      await prisma.listing.update({
        where: { id: offer.listingId },
        data: { status: ListingStatus.UNDER_NEGOTIATION },
      });
    }
    if (quota && !resumable) {
      await prisma.subscription.update({
        where: { id: quota.id },
        data: { dealsUsed: { increment: 1 } },
      });
    }

    destination = `/app/dossiers/${deal.id}`;
  } catch (error) {
    // redirect() lève une erreur de contrôle interne à Next : ne pas l'avaler.
    if (error && typeof error === "object" && "digest" in error) throw error;
    return { error: error instanceof Error ? error.message : "Acceptation impossible." };
  }
  if (destination) redirect(destination);
  return { error: "Acceptation impossible." };
}
