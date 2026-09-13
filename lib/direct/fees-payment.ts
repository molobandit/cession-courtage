import "server-only";
import { stripeConfigured, stripeRetrieveCheckoutSession, type StripeCheckoutSession } from "@/lib/billing/stripe";
import { prisma } from "@/lib/prisma";

/** Métadonnée qui distingue ces paiements des abonnements dans le webhook. */
export const DIRECT_FEES_KIND = "direct_fees";

/**
 * Enregistre le règlement des honoraires d'un dossier à la carte.
 *
 * Appelé deux fois dans le cas nominal — au retour du paiement, puis par le
 * webhook — et doit donc être idempotent : le premier passage fait foi, le
 * second ne réécrit ni la date ni le montant.
 */
export async function settleDirectFeesFromSession(session: StripeCheckoutSession): Promise<boolean> {
  const dealId = session.metadata?.directDealId;
  if (!dealId) return false;
  if (session.payment_status !== "paid") return false;

  const deal = await prisma.directDeal.findUnique({
    where: { id: dealId },
    select: { id: true, feesPaidAt: true, openedById: true },
  });
  if (!deal) return false;
  if (deal.feesPaidAt) return true;

  await prisma.directDeal.update({
    where: { id: deal.id },
    data: {
      feesPaidAt: new Date(),
      feesAmountCents: typeof session.amount_total === "number" ? session.amount_total : null,
      feesCheckoutSessionId: session.id,
    },
  });
  await prisma.auditLog.create({
    data: {
      actorId: session.metadata?.userId ?? deal.openedById,
      action: "direct.fees_paid",
      entityType: "DirectDeal",
      entityId: deal.id,
      metadata: { session: session.id, amount: session.amount_total ?? null },
    },
  });
  return true;
}

/**
 * Confirmation au retour de Stripe, sans attendre le webhook.
 *
 * La session est relue chez Stripe : l'identifiant passé dans l'adresse ne
 * prouve rien, n'importe qui peut en taper un. Elle doit en outre viser ce
 * dossier-là.
 */
export async function confirmDirectFeesCheckout(sessionId: string, dealId: string): Promise<boolean> {
  if (!stripeConfigured() || !sessionId.startsWith("cs_")) return false;
  try {
    const session = await stripeRetrieveCheckoutSession(sessionId);
    if (session.metadata?.kind !== DIRECT_FEES_KIND) return false;
    if (session.metadata?.directDealId !== dealId) return false;
    return await settleDirectFeesFromSession(session);
  } catch (error) {
    console.error("confirmDirectFeesCheckout", error);
    return false;
  }
}
