/** Vérification de signature Stripe, compatible Workers (Web Crypto). */

export async function verifyStripeWebhook(
  payload: string,
  signatureHeader: string | null,
  secret: string,
  nowSec = Math.floor(Date.now() / 1000),
): Promise<boolean> {
  if (!signatureHeader || !secret) return false;
  const parts: Record<string, string[]> = {};
  for (const item of signatureHeader.split(",")) {
    const [key, ...rest] = item.split("=");
    if (!key || rest.length === 0) continue;
    (parts[key.trim()] ??= []).push(rest.join("=").trim());
  }
  const timestamp = parts.t?.[0];
  const signatures = parts.v1 ?? [];
  if (!timestamp || signatures.length === 0) return false;
  const ts = Number(timestamp);
  if (!Number.isFinite(ts) || Math.abs(nowSec - ts) > 300) return false;

  const signed = `${timestamp}.${payload}`;
  const expected = await hmacSha256Hex(secret, signed);
  return signatures.some((item) => timingSafeEqualHex(item, expected));
}

async function hmacSha256Hex(secret: string, message: string): Promise<string> {
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

function timingSafeEqualHex(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i += 1) diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return diff === 0;
}
