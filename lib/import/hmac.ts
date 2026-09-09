import { createHmac } from "crypto";

export function hmacClientKey(raw: string): string {
  const secret = process.env.AUTH_SECRET ?? "dev-import-hmac";
  return createHmac("sha256", secret)
    .update(raw.normalize("NFKC").toLowerCase().trim())
    .digest("hex")
    .slice(0, 24);
}
