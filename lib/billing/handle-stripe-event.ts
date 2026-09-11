import "server-only";
import { activateGrowthSubscription, cancelGrowthSubscription } from "@/lib/billing/activate-growth";
import {
  stripeId,
  stripeRetrieveSubscription,
  type StripeCheckoutSession,
  type StripeSubscription,
} from "@/lib/billing/stripe";

type StripeEvent = {
  type: string;
  data: { object: Record<string, unknown> };
};

export async function handleStripeEvent(event: StripeEvent): Promise<void> {
  if (event.type === "checkout.session.completed") {
    const session = event.data.object as unknown as StripeCheckoutSession;
    const userId = session.metadata?.userId ?? session.client_reference_id;
    const customerId = stripeId(session.customer);
    const subscriptionId = stripeId(session.subscription);
    if (!userId || !customerId || !subscriptionId) return;
    const subscription = await stripeRetrieveSubscription(subscriptionId);
    await activateFromStripeSubscription(userId, customerId, subscription);
    return;
  }

  if (event.type === "invoice.paid" || event.type === "invoice.payment_succeeded") {
    const invoice = event.data.object as {
      subscription?: string | { id: string } | null;
      customer?: string | { id: string } | null;
    };
    const subscriptionId = stripeId(invoice.subscription);
    if (!subscriptionId) return;
    const subscription = await stripeRetrieveSubscription(subscriptionId);
    const userId = subscription.metadata?.userId ?? null;
    const customerId = stripeId(subscription.customer) ?? stripeId(invoice.customer);
    if (!userId || !customerId) return;
    await activateFromStripeSubscription(userId, customerId, subscription);
    return;
  }

  if (event.type === "customer.subscription.deleted") {
    const subscription = event.data.object as unknown as StripeSubscription;
    await cancelGrowthSubscription(subscription.id);
    return;
  }

  if (event.type === "customer.subscription.updated") {
    const subscription = event.data.object as unknown as StripeSubscription;
    const userId = subscription.metadata?.userId ?? null;
    const customerId = stripeId(subscription.customer);
    if (!userId || !customerId) return;
    if (subscription.status === "canceled" || subscription.status === "unpaid") {
      await cancelGrowthSubscription(subscription.id);
      return;
    }
    await activateFromStripeSubscription(userId, customerId, subscription);
  }
}

async function activateFromStripeSubscription(
  userId: string,
  customerId: string,
  subscription: StripeSubscription,
) {
  if (subscription.status !== "active" && subscription.status !== "trialing") return;
  await activateGrowthSubscription({
    userId,
    stripeCustomerId: customerId,
    stripeSubscriptionId: subscription.id,
    renewsAt: new Date((subscription.current_period_end || 0) * 1000 || Date.now() + 365 * 24 * 60 * 60 * 1000),
  });
}
