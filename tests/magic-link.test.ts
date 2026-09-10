/**
 * Lien magique et code e-mail, contre la D1 locale.
 *
 * Le jeton long et le code a six chiffres doivent etre haches (SHA-256, une
 * passe : le budget processeur d'un Worker interdit PBKDF2 ici). Chaque
 * consommation est a usage unique. Un e-mail inconnu ne laisse aucune trace.
 *
 * Prerequis : `npm run db:migrate && npm run db:seed`.
 */
import { afterAll, afterEach, describe, expect, it } from "vitest";
import { prisma } from "@/lib/prisma";
import { disposePlatformProxy } from "./setup/prisma-test";
import { consumeMagicLinkToken, generateEmailCode, issueMagicLink } from "@/lib/auth/magic-link";

const EMAIL = "claire.dubois@nord-assur-pro.demo";
const INCONNU = "personne@inexistant.demo";

afterEach(async () => {
  await prisma.verificationToken.deleteMany({
    where: { identifier: { in: [EMAIL, `otp:${EMAIL}`, INCONNU, `otp:${INCONNU}`] } },
  });
  await prisma.loginAttempt.deleteMany({
    where: { identifier: { in: [`lien:${EMAIL}`, `otp:${EMAIL}`, `lien:${INCONNU}`] } },
  });
  await prisma.outboundEmail.deleteMany({
    where: { to: { in: [EMAIL, INCONNU] }, purpose: "MAGIC_LINK" },
  });
});

afterAll(async () => {
  await disposePlatformProxy();
});

async function dernierMail(): Promise<string> {
  const row = await prisma.outboundEmail.findFirst({
    where: { to: EMAIL, purpose: "MAGIC_LINK" },
    orderBy: { createdAt: "desc" },
  });
  if (!row) throw new Error("Aucun e-mail MAGIC_LINK.");
  return row.bodyText;
}

describe("code e-mail et lien magique", () => {
  it("tire un code a six chiffres", () => {
    expect(generateEmailCode()).toMatch(/^\d{6}$/);
  });

  it("n'ecrit rien pour un e-mail inconnu", async () => {
    await issueMagicLink(INCONNU);
    const jetons = await prisma.verificationToken.count({
      where: { identifier: { in: [INCONNU, `otp:${INCONNU}`] } },
    });
    const mails = await prisma.outboundEmail.count({
      where: { to: INCONNU, purpose: "MAGIC_LINK" },
    });
    expect(jetons).toBe(0);
    expect(mails).toBe(0);
  });

  it("envoie un code et un lien, haches en base, consommables une fois", async () => {
    await issueMagicLink(EMAIL);
    const corps = await dernierMail();
    const code = corps.match(/code de connexion : (\d{6})/i)?.[1];
    const lien = corps.match(/token=([0-9a-f]+)/i)?.[1];
    expect(code).toMatch(/^\d{6}$/);
    expect(lien?.length).toBeGreaterThanOrEqual(32);

    const enClair = await prisma.verificationToken.findMany({
      where: { identifier: { in: [EMAIL, `otp:${EMAIL}`] } },
    });
    expect(enClair).toHaveLength(2);
    expect(enClair.some((row) => row.token === code)).toBe(false);
    expect(enClair.some((row) => row.token === lien)).toBe(false);

    const user = await consumeMagicLinkToken(EMAIL, code!);
    expect(user?.email).toBe(EMAIL);
    expect(await consumeMagicLinkToken(EMAIL, code!)).toBeNull();
    expect(await consumeMagicLinkToken(EMAIL, lien!)).toBeNull();
  });

  it("le lien long connecte aussi, et invalide le code", async () => {
    await issueMagicLink(EMAIL);
    const corps = await dernierMail();
    const code = corps.match(/code de connexion : (\d{6})/i)?.[1];
    const lien = corps.match(/token=([0-9a-f]+)/i)?.[1];
    const user = await consumeMagicLinkToken(EMAIL, lien!);
    expect(user?.email).toBe(EMAIL);
    expect(await consumeMagicLinkToken(EMAIL, code!)).toBeNull();
  });

  it("refuse un code faux", async () => {
    await issueMagicLink(EMAIL);
    expect(await consumeMagicLinkToken(EMAIL, "000000")).toBeNull();
    const corps = await dernierMail();
    const code = corps.match(/code de connexion : (\d{6})/i)?.[1];
    if (code === "000000") return;
    expect(await consumeMagicLinkToken(EMAIL, code!)).not.toBeNull();
  });
});
