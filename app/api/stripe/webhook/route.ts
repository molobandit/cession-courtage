import { NextResponse } from "next/server";
import { handleStripeEvent } from "@/lib/billing/handle-stripe-event";
import { verifyStripeWebhook } from "@/lib/billing/stripe-webhook";

export async function POST(request: Request) {
  const secret = process.env.STRIPE_WEBHOOK_SECRET;
  const payload = await request.text();
  const signature = request.headers.get("stripe-signature");
  if (!secret || !(await verifyStripeWebhook(payload, signature, secret))) {
    return NextResponse.json({ error: "Signature invalide." }, { status: 400 });
  }

  let event: { type: string; data: { object: Record<string, unknown> } };
  try {
    event = JSON.parse(payload) as typeof event;
  } catch {
    return NextResponse.json({ error: "JSON invalide." }, { status: 400 });
  }

  try {
    await handleStripeEvent(event);
  } catch (error) {
    console.error("stripe webhook", error);
    return NextResponse.json({ error: "Traitement impossible." }, { status: 500 });
  }
  return NextResponse.json({ received: true });
}
