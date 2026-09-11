"use server";

import { redirect } from "next/navigation";
import { getActor, isOriasVerified } from "@/lib/authz";
import { hasContactSubscription } from "@/lib/billing/contact-access";
import { activateGrowthSubscription } from "@/lib/billing/activate-growth";
import {
  stripeConfigured,
  stripeCreateCheckoutSession,
  stripeCreateCustomer,
  stripeId,
  stripeRetrieveCheckoutSession,
  stripeRetrieveSubscription,
} from "@/lib/billing/stripe";
import { prisma } from "@/lib/prisma";
import { siteUrl } from "@/lib/site";

export type BillingFormState = { error?: string };

export async function startGrowthCheckoutAction(
  _prev: BillingFormState,
  _formData: FormData,
): Promise<BillingFormState> {
  const actor = await getActor();
  if (!actor) redirect("/connexion?next=/tarifs#abonnements");
  if (!isOriasVerified(actor)) redirect("/en-attente-orias");
  if (!stripeConfigured()) {
    return { error: "Le paiement par carte n’est pas encore ouvert." };
  }
  if (await hasContactSubscription(actor)) {
    return { error: "Votre abonnement est déjà actif." };
  }

  const userBilling = await prisma.user.findUnique({
    where: { id: actor.id },
    select: { stripeCustomerId: true },
  });
  let customerId = userBilling?.stripeCustomerId ?? null;

  try {
    if (!customerId) {
      const customer = await stripeCreateCustomer({
        email: actor.email,
        name: actor.fullName,
        userId: actor.id,
      });
      customerId = customer.id;
      await prisma.user.update({
        where: { id: actor.id },
        data: { stripeCustomerId: customerId },
      });
    }

    const origin = siteUrl();
    const session = await stripeCreateCheckoutSession({
      customerId,
      userId: actor.id,
      successUrl: `${origin}/app/profil?session_id={CHECKOUT_SESSION_ID}`,
      cancelUrl: `${origin}/tarifs#abonnements`,
    });
    if (!session.url) return { error: "Session de paiement incomplète." };
    redirect(session.url);
  } catch (error) {
    if (error && typeof error === "object" && "digest" in error) throw error;
    console.error("startGrowthCheckoutAction", error);
    return { error: error instanceof Error ? error.message : "Paiement impossible pour le moment." };
  }
}

export async function confirmGrowthCheckout(sessionId: string, actorId: string): Promise<boolean> {
  if (!stripeConfigured() || !sessionId.startsWith("cs_")) return false;
  try {
    const session = await stripeRetrieveCheckoutSession(sessionId);
    if (session.client_reference_id !== actorId && session.metadata?.userId !== actorId) {
      return false;
    }
    if (session.status !== "complete" && session.payment_status !== "paid") return false;
    const customerId = stripeId(session.customer);
    const subscriptionId = stripeId(session.subscription);
    if (!customerId || !subscriptionId) return false;
    const subscription = await stripeRetrieveSubscription(subscriptionId);
    if (subscription.status !== "active" && subscription.status !== "trialing") return false;
    await activateGrowthSubscription({
      userId: actorId,
      stripeCustomerId: customerId,
      stripeSubscriptionId: subscriptionId,
      renewsAt: new Date(subscription.current_period_end * 1000),
    });
    return true;
  } catch (error) {
    console.error("confirmGrowthCheckout", error);
    return false;
  }
}
