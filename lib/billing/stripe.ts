import "server-only";
import { BRAND_NAME } from "@/lib/site";
import {
  GROWTH_PLAN_ANNUAL_EUR,
  VAT_RATE,
  growthPlanAnnualTtcCents,
} from "@/lib/billing/rates";

const API = "https://api.stripe.com/v1";

export function stripeConfigured(): boolean {
  return Boolean(process.env.STRIPE_SECRET_KEY?.startsWith("sk_"));
}

function secretKey(): string {
  const key = process.env.STRIPE_SECRET_KEY;
  if (!key?.startsWith("sk_")) {
    throw new Error("Stripe n’est pas configuré (STRIPE_SECRET_KEY).");
  }
  return key;
}

async function stripeRequest<T>(
  method: "GET" | "POST",
  path: string,
  params?: URLSearchParams,
): Promise<T> {
  const url = method === "GET" && params ? `${API}${path}?${params}` : `${API}${path}`;
  const response = await fetch(url, {
    method,
    headers: {
      Authorization: `Bearer ${secretKey()}`,
      "Stripe-Version": "2024-06-20",
      ...(method === "POST" ? { "Content-Type": "application/x-www-form-urlencoded" } : {}),
    },
    body: method === "POST" ? params : undefined,
  });
  const data = (await response.json()) as T & { error?: { message?: string } };
  if (!response.ok) {
    throw new Error(data.error?.message ?? "Erreur Stripe.");
  }
  return data;
}

export type StripeCustomer = { id: string };
export type StripeCheckoutSession = {
  id: string;
  url: string | null;
  status: string | null;
  payment_status: string | null;
  customer: string | { id: string } | null;
  subscription: string | { id: string } | null;
  metadata: Record<string, string> | null;
  client_reference_id: string | null;
};
export type StripeSubscription = {
  id: string;
  status: string;
  customer: string | { id: string };
  current_period_end: number;
  metadata?: Record<string, string> | null;
};

export async function stripeCreateCustomer(input: {
  email: string;
  name: string | null;
  userId: string;
}): Promise<StripeCustomer> {
  const body = new URLSearchParams();
  body.set("email", input.email);
  if (input.name) body.set("name", input.name);
  body.set("metadata[userId]", input.userId);
  return stripeRequest("POST", "/customers", body);
}

export async function stripeCreateCheckoutSession(input: {
  customerId: string;
  userId: string;
  successUrl: string;
  cancelUrl: string;
}): Promise<StripeCheckoutSession> {
  const body = new URLSearchParams();
  body.set("mode", "subscription");
  body.set("customer", input.customerId);
  body.set("client_reference_id", input.userId);
  body.set("success_url", input.successUrl);
  body.set("cancel_url", input.cancelUrl);
  body.set("locale", "fr");
  body.set("allow_promotion_codes", "true");
  body.set("payment_method_types[0]", "card");
  body.set("billing_address_collection", "required");
  body.set("tax_id_collection[enabled]", "true");
  body.set("customer_update[address]", "auto");
  body.set("customer_update[name]", "auto");
  body.set("metadata[userId]", input.userId);
  body.set("subscription_data[metadata][userId]", input.userId);
  body.set("line_items[0][quantity]", "1");
  body.set("line_items[0][price_data][currency]", "eur");
  body.set("line_items[0][price_data][unit_amount]", String(growthPlanAnnualTtcCents()));
  body.set("line_items[0][price_data][recurring][interval]", "year");
  body.set(
    "line_items[0][price_data][product_data][name]",
    `Abonnement annuel ${BRAND_NAME}`,
  );
  body.set(
    "line_items[0][price_data][product_data][description]",
    `${GROWTH_PLAN_ANNUAL_EUR.toLocaleString("fr-FR")} € HT + TVA ${(VAT_RATE * 100).toLocaleString("fr-FR")} %`,
  );
  return stripeRequest("POST", "/checkout/sessions", body);
}

export async function stripeRetrieveCheckoutSession(id: string): Promise<StripeCheckoutSession> {
  return stripeRequest("GET", `/checkout/sessions/${encodeURIComponent(id)}`);
}

export async function stripeRetrieveSubscription(id: string): Promise<StripeSubscription> {
  return stripeRequest("GET", `/subscriptions/${encodeURIComponent(id)}`);
}

export function stripeId(value: string | { id: string } | null | undefined): string | null {
  if (!value) return null;
  return typeof value === "string" ? value : value.id;
}
