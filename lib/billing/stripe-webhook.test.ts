import { describe, expect, it } from "vitest";
import { verifyStripeWebhook } from "@/lib/billing/stripe-webhook";

async function hexHmac(secret: string, message: string): Promise<string> {
  const key = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );
  const signature = await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(message));
  return [...new Uint8Array(signature)].map((byte) => byte.toString(16).padStart(2, "0")).join("");
}

describe("verifyStripeWebhook", () => {
  it("accepte une signature dans la fenêtre de cinq minutes", async () => {
    const secret = "whsec_test";
    const payload = '{"id":"evt_1"}';
    const t = 1_700_000_000;
    const v1 = await hexHmac(secret, `${t}.${payload}`);
    await expect(verifyStripeWebhook(payload, `t=${t},v1=${v1}`, secret, t)).resolves.toBe(true);
  });

  it("refuse une signature périmée", async () => {
    const secret = "whsec_test";
    const payload = '{"id":"evt_1"}';
    const t = 1_700_000_000;
    const v1 = await hexHmac(secret, `${t}.${payload}`);
    await expect(verifyStripeWebhook(payload, `t=${t},v1=${v1}`, secret, t + 301)).resolves.toBe(false);
  });
});
