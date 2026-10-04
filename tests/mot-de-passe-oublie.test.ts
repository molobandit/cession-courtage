/**
 * Le parcours « mot de passe oublié », sur la vraie base D1.
 *
 * Un lien de réinitialisation ouvre davantage qu'une session : il doit expirer,
 * ne servir qu'une fois, et ne jamais dire si une adresse est inscrite.
 *
 * Prérequis : `npm run db:migrate && npm run db:seed`.
 */
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { prisma } from "@/lib/prisma";
// Importés directement : l'alias de vitest ne vaut pas pour tsc.
import { disposePlatformProxy } from "./setup/prisma-test";
import {
  checkPasswordResetToken,
  consumePasswordReset,
  issuePasswordReset,
} from "@/lib/auth/password-reset";
import { verifyPassword } from "@/lib/auth/password";

const NOUVEAU = "EssaiReinit2026";
let email: string;
let empreinteAvant: string;

/** Relit le lien tel qu'il part dans l'e-mail, pour en extraire le jeton. */
async function dernierJeton(adresse: string): Promise<string | null> {
  const mail = await prisma.outboundEmail.findFirst({
    where: { to: adresse, purpose: "PASSWORD_RESET" },
    orderBy: { createdAt: "desc" },
    select: { bodyText: true },
  });
  return mail?.bodyText.match(/token=([a-f0-9]{64})/)?.[1] ?? null;
}

beforeAll(async () => {
  const u = await prisma.user.findFirst({
    where: { erasedAt: null, passwordHash: { not: null } },
    select: { email: true, passwordHash: true },
  });
  if (!u) throw new Error("Aucun compte en base. Lancez npm run db:seed.");
  email = u.email;
  empreinteAvant = u.passwordHash!;
});

afterAll(async () => {
  // Le compte de démonstration retrouve son mot de passe.
  await prisma.user.update({ where: { email }, data: { passwordHash: empreinteAvant } });
  await prisma.verificationToken.deleteMany({ where: { identifier: `reset:${email}` } });
  await prisma.outboundEmail.deleteMany({ where: { to: email, purpose: "PASSWORD_RESET" } });
  await disposePlatformProxy();
});

describe("la demande de réinitialisation", () => {
  it("ne dit pas si une adresse est inscrite", async () => {
    await issuePasswordReset("personne-ici@exemple.invalid");
    const jetons = await prisma.verificationToken.count({
      where: { identifier: "reset:personne-ici@exemple.invalid" },
    });
    expect(jetons).toBe(0);
  });

  it("pose un jeton et envoie le lien", async () => {
    await issuePasswordReset(email);
    const jeton = await dernierJeton(email);
    expect(jeton).toMatch(/^[a-f0-9]{64}$/);
    expect(await checkPasswordResetToken(email, jeton!)).toBe(true);
  });
});

describe("le lien de réinitialisation", () => {
  it("pose le nouveau mot de passe, puis ne sert plus", async () => {
    const jeton = (await dernierJeton(email))!;
    expect(await consumePasswordReset(email, jeton, NOUVEAU)).toBe(true);

    const apres = await prisma.user.findUniqueOrThrow({ where: { email }, select: { passwordHash: true } });
    expect(await verifyPassword(NOUVEAU, apres.passwordHash!)).toBe(true);

    // Rejoué, le même lien ne pose rien.
    expect(await consumePasswordReset(email, jeton, "AutreEssai2026")).toBe(false);
    expect(await checkPasswordResetToken(email, jeton)).toBe(false);
  });

  it("refuse un jeton expiré", async () => {
    await issuePasswordReset(email);
    const jeton = (await dernierJeton(email))!;
    await prisma.verificationToken.updateMany({
      where: { identifier: `reset:${email}` },
      data: { expires: new Date(Date.now() - 1000) },
    });
    expect(await checkPasswordResetToken(email, jeton)).toBe(false);
    expect(await consumePasswordReset(email, jeton, "EncoreUnEssai26")).toBe(false);
  });

  it("refuse un jeton qui n'existe pas", async () => {
    expect(await consumePasswordReset(email, "f".repeat(64), "EncoreUnEssai26")).toBe(false);
  });
});
