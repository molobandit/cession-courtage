import "server-only";
import { loadAgreementsStatus } from "@/lib/account/agreements-load";
import { interestDepositFor } from "@/lib/billing/rates";
import {
  stripeConfigured,
  stripeCreatePaymentCheckout,
  stripeId,
  stripeRetrieveCheckoutSession,
  type StripeCheckoutSession,
} from "@/lib/billing/stripe";
import { depositReleasesIdentity } from "@/lib/listing/identity-access";
import { placeDeposit } from "@/lib/listing/place-deposit";
import { recordOffer, type PendingOffer } from "@/lib/offer/record";
import { prisma } from "@/lib/prisma";
import { siteUrl } from "@/lib/site";

/**
 * Dépôt de garantie payé en ligne, par carte ou par prélèvement SEPA.
 *
 * Le dépôt n'existe qu'une fois le paiement accepté : une session abandonnée ne
 * lève pas l'anonymat du cédant et n'ouvre aucune pièce. Un prélèvement SEPA
 * est accepté puis encaissé quelques jours plus tard ; il vaut engagement dès
 * l'acceptation du mandat, et le dépôt tombe s'il est rejeté.
 *
 * Sans paiement en ligne configuré, le dépôt est enregistré sans débit, avec le
 * moyen choisi : le parcours reste le même, l'argent ne circule pas.
 */

export const DEPOSIT_KIND = "interest_deposit";

export type DepositMethod = "CARD" | "SEPA";

export function isDepositMethod(value: unknown): value is DepositMethod {
  return value === "CARD" || value === "SEPA";
}

type ListingForDeposit = {
  id: string;
  askingPrice: unknown;
  publicNumber: number | null;
  status: import("@prisma/client").ListingStatus;
  offerWindowClosesAt: Date | null;
  portfolio: { firmId: string };
};

async function ndaDate(buyer: { id: string; oriasNumber: string | null }): Promise<Date | null> {
  const statut = await loadAgreementsStatus(buyer);
  return statut.signed.NDA?.signedAt ?? null;
}

/**
 * Pose la position d'un investisseur, avec l'état de son règlement.
 *
 * Le dossier investisseurs applique la même règle qu'à l'acquéreur : 2,5 % du
 * montant, versés dans un trust, et c'est ce dépôt qui lève l'anonymat. La
 * position s'enregistre donc avec son état de paiement, et non plus nue.
 */
async function placeInvestorPosition(
  investorId: string,
  listing: { id: string; askingPrice: unknown },
  payment: { method: DepositMethod | null; ref: string | null; status: string },
) {
  const montant = interestDepositFor(Number(listing.askingPrice));
  const position = await prisma.investorPosition.upsert({
    where: { listingId_investorId: { listingId: listing.id, investorId } },
    update: { paymentMethod: payment.method, paymentRef: payment.ref, paymentStatus: payment.status },
    create: {
      listingId: listing.id,
      investorId,
      depositAmount: montant.toFixed(2),
      paymentMethod: payment.method,
      paymentRef: payment.ref,
      paymentStatus: payment.status,
    },
  });

  /*
   * Un dépôt reçu retire l'annonce du marché, qu'il vienne d'un acquéreur ou
   * d'un investisseur : la règle du dossier de référence est la même pour les
   * deux, et la salle de marché doit le dire du même mot.
   */
  if (depositReleasesIdentity(payment.status, stripeConfigured())) {
    await prisma.listing.updateMany({
      where: { id: listing.id, status: { notIn: ["SOLD", "WITHDRAWN", "UNDER_NEGOTIATION"] } },
      data: { status: "UNDER_NEGOTIATION" },
    });
  }
  return position;
}

export async function startInvestorDepositPayment(input: {
  investor: { id: string; email: string };
  listing: ListingForDeposit;
  method: DepositMethod;
  cancelPath: string;
}): Promise<{ kind: "redirect"; url: string } | { kind: "placed"; positionId: string }> {
  const { investor, listing, method } = input;
  const montant = interestDepositFor(Number(listing.askingPrice));
  if (montant <= 0) throw new Error("Montant de dépôt invalide.");

  if (!stripeConfigured()) {
    const position = await placeInvestorPosition(investor.id, listing, { method, ref: null, status: "RECORDED" });
    return { kind: "placed", positionId: position.id };
  }

  const checkout = await prisma.depositCheckout.create({
    data: {
      listingId: listing.id,
      buyerId: investor.id,
      method,
      amountCents: Math.round(montant * 100),
      investor: true,
    },
  });
  const origine = siteUrl();
  const session = await stripeCreatePaymentCheckout({
    userId: investor.id,
    email: investor.email,
    amountCents: checkout.amountCents,
    name: `Dépôt de positionnement · dossier n° ${listing.publicNumber ?? ""}`,
    description: "Versé dans un trust. Il lance la procédure de cession et lève l’anonymat du cédant.",
    metadata: { kind: DEPOSIT_KIND, depositCheckoutId: checkout.id, listingId: listing.id },
    successUrl: `${origine}/app/depot/retour?session_id={CHECKOUT_SESSION_ID}`,
    cancelUrl: `${origine}${input.cancelPath}`,
    paymentMethodTypes: [method === "SEPA" ? "sepa_debit" : "card"],
  });
  await prisma.depositCheckout.update({ where: { id: checkout.id }, data: { sessionId: session.id } });
  if (!session.url) throw new Error("Session de paiement incomplète.");
  return { kind: "redirect", url: session.url };
}

export async function startDepositPayment(input: {
  buyer: { id: string; email: string; oriasNumber: string | null };
  listing: ListingForDeposit;
  method: DepositMethod;
  pendingOffer?: PendingOffer | null;
  cancelPath: string;
}): Promise<{ kind: "redirect"; url: string } | { kind: "placed"; positionId: string | null }> {
  const { buyer, listing, method } = input;
  const montant = interestDepositFor(Number(listing.askingPrice));
  if (montant <= 0) throw new Error("Montant de dépôt invalide.");

  if (!stripeConfigured()) {
    const { position } = await placeDeposit(buyer, listing, await ndaDate(buyer), { method, ref: null, status: "RECORDED" });
    const offre = input.pendingOffer ? await recordOffer(buyer, listing, input.pendingOffer) : null;
    return { kind: "placed", positionId: offre?.positionId ?? position.id };
  }

  const checkout = await prisma.depositCheckout.create({
    data: {
      listingId: listing.id,
      buyerId: buyer.id,
      method,
      amountCents: Math.round(montant * 100),
      pendingOffer: input.pendingOffer ?? undefined,
    },
  });
  const origine = siteUrl();
  const session = await stripeCreatePaymentCheckout({
    userId: buyer.id,
    email: buyer.email,
    amountCents: checkout.amountCents,
    name: `Dépôt de garantie · dossier n° ${listing.publicNumber ?? ""}`,
    description: "Déduit du montant si la cession aboutit, acquis au cédant en cas de retrait.",
    metadata: { kind: DEPOSIT_KIND, depositCheckoutId: checkout.id, listingId: listing.id },
    successUrl: `${origine}/app/depot/retour?session_id={CHECKOUT_SESSION_ID}`,
    cancelUrl: `${origine}${input.cancelPath}`,
    paymentMethodTypes: [method === "SEPA" ? "sepa_debit" : "card"],
  });
  await prisma.depositCheckout.update({ where: { id: checkout.id }, data: { sessionId: session.id } });
  if (!session.url) throw new Error("Session de paiement incomplète.");
  return { kind: "redirect", url: session.url };
}

/**
 * Suite d'une session Stripe : pose le dépôt, puis l'offre saisie avec lui.
 *
 * Appelée au retour du paiement et par le webhook : elle est rejouable, le
 * premier passage fait foi.
 */
export async function settleDepositSession(session: StripeCheckoutSession & { payment_intent?: string | { id: string } | null }) {
  const id = session.metadata?.depositCheckoutId;
  if (!id) return null;
  const checkout = await prisma.depositCheckout.findUnique({ where: { id } });
  if (!checkout) return null;

  const payee = session.payment_status === "paid";
  // Prélèvement SEPA : la session est terminée, le paiement suivra.
  const enCours = session.status === "complete" && session.payment_status === "unpaid";
  if (!payee && !enCours) return null;

  if (checkout.investor) {
    const annonce = await prisma.listing.findUnique({
      where: { id: checkout.listingId },
      select: { id: true, askingPrice: true },
    });
    if (!annonce) return null;
    const etat = session.payment_status === "paid" ? "PAID" : "PROCESSING";
    await prisma.depositCheckout.update({ where: { id }, data: { status: etat } });
    const position = await placeInvestorPosition(checkout.buyerId, annonce, {
      method: checkout.method === "SEPA" ? "SEPA" : "CARD",
      ref: stripeId(session.payment_intent ?? null) ?? session.id,
      status: etat,
    });
    return { positionId: position.id };
  }

  const [buyer, listing] = await Promise.all([
    prisma.user.findUnique({ where: { id: checkout.buyerId }, select: { id: true, email: true, oriasNumber: true } }),
    prisma.listing.findUnique({
      where: { id: checkout.listingId },
      select: { id: true, askingPrice: true, publicNumber: true, status: true, offerWindowClosesAt: true, portfolio: { select: { firmId: true } } },
    }),
  ]);
  if (!buyer || !listing) return null;

  const statut = payee ? "PAID" : "PROCESSING";
  const ref = stripeId(session.payment_intent ?? null) ?? session.id;
  const dejaPose = checkout.status === "PAID" || checkout.status === "PROCESSING";
  await prisma.depositCheckout.update({ where: { id }, data: { status: statut } });

  const { position } = await placeDeposit(buyer, listing, await ndaDate(buyer), {
    method: checkout.method === "SEPA" ? "SEPA" : "CARD",
    ref,
    status: statut,
  });
  let positionId = position.id;
  if (!dejaPose && checkout.pendingOffer) {
    positionId = (await recordOffer(buyer, listing, checkout.pendingOffer as unknown as PendingOffer)).positionId;
  }
  return { positionId };
}

/** Prélèvement rejeté : le dépôt tombe, et l'offre qu'il portait avec lui. */
export async function failDepositSession(session: StripeCheckoutSession) {
  const id = session.metadata?.depositCheckoutId;
  if (!id) return;
  const checkout = await prisma.depositCheckout.findUnique({ where: { id } });
  if (!checkout) return;
  await prisma.depositCheckout.update({ where: { id }, data: { status: "FAILED" } });
  if (checkout.investor) {
    await prisma.investorPosition.deleteMany({
      where: { listingId: checkout.listingId, investorId: checkout.buyerId, paymentStatus: { not: "PAID" } },
    });
    return;
  }
  const dossier = await prisma.deal.findUnique({ where: { listingId_buyerId: { listingId: checkout.listingId, buyerId: checkout.buyerId } }, select: { id: true } });
  if (dossier) return;
  await prisma.interestDeposit.deleteMany({ where: { listingId: checkout.listingId, buyerId: checkout.buyerId, outcome: "PENDING" } });
  await prisma.offer.updateMany({ where: { listingId: checkout.listingId, buyerId: checkout.buyerId, status: "SUBMITTED" }, data: { status: "WITHDRAWN" } });
}

/** Retour du navigateur après paiement : la session est relue chez Stripe, jamais crue sur parole. */
export async function confirmDepositReturn(sessionId: string, buyerId: string) {
  if (!stripeConfigured() || !sessionId.startsWith("cs_")) return null;
  const session = await stripeRetrieveCheckoutSession(sessionId);
  if (session.metadata?.kind !== DEPOSIT_KIND) return null;
  const checkout = await prisma.depositCheckout.findUnique({ where: { id: session.metadata.depositCheckoutId ?? "" }, select: { buyerId: true } });
  if (!checkout || checkout.buyerId !== buyerId) return null;
  return settleDepositSession(session);
}
