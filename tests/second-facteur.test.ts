/**
 * Second facteur, sur la vraie base D1 locale.
 *
 * Les tests unitaires prouvent la conformite du calcul TOTP aux vecteurs de la
 * RFC. Celui-ci verifie la chaine complete : un facteur non confirme ne protege
 * rien, un code temporaire ouvre, un code de secours ouvre une seule fois, et
 * le code d'un compte n'ouvre pas celui d'un autre.
 *
 * Prerequis : `npm run db:migrate && npm run db:seed`.
 */
import { afterAll, afterEach, beforeAll, describe, expect, it } from "vitest";
import { prisma } from "@/lib/prisma";
import { disposePlatformProxy } from "./setup/prisma-test";
import { codePourCompteur, compteurPour, empreinteCodeDeSecours, genererSecret } from "@/lib/auth/totp";
import { codesDeSecoursRestants, secondFacteurActif, verifierSecondFacteur } from "@/lib/auth/second-facteur";

let userId: string;
let autreId: string;
const SECRET = genererSecret();
const CODE_SECOURS = "ABCD2345";

beforeAll(async () => {
  const a = await prisma.user.findUnique({
    where: { email: "claire.dubois@nord-assur-pro.demo" },
    select: { id: true },
  });
  const b = await prisma.user.findUnique({
    where: { email: "marie.lefort@parisienne-courtage.demo" },
    select: { id: true },
  });
  if (!a || !b) throw new Error("Comptes de demonstration absents. Lancez npm run db:seed.");
  userId = a.id;
  autreId = b.id;
});

afterEach(async () => {
  await prisma.recoveryCode.deleteMany({ where: { userId: { in: [userId, autreId] } } });
  await prisma.twoFactor.deleteMany({ where: { userId: { in: [userId, autreId] } } });
});

afterAll(async () => {
  await disposePlatformProxy();
});

async function activer(pour: string, confirme = true) {
  await prisma.twoFactor.create({
    data: { userId: pour, secret: SECRET, confirmedAt: confirme ? new Date() : null },
  });
}

async function codeDuMoment(): Promise<string> {
  return codePourCompteur(SECRET, compteurPour(new Date()));
}

describe("second facteur, chaine complete", () => {
  it("ne protege rien tant que le facteur n'est pas confirme", async () => {
    await activer(userId, false);
    expect(await secondFacteurActif(userId)).toBe(false);
    // Un secret cree mais jamais valide ne doit pas fermer le compte : sans
    // cela, une cle mal recopiee enfermerait son titulaire dehors.
    expect(await verifierSecondFacteur(userId, await codeDuMoment())).toBe(false);
  });

  it("accepte le code temporaire une fois le facteur confirme", async () => {
    await activer(userId);
    expect(await secondFacteurActif(userId)).toBe(true);
    expect(await verifierSecondFacteur(userId, await codeDuMoment())).toBe(true);
  });

  it("refuse un code faux", async () => {
    await activer(userId);
    for (const faux of ["000000", "123456", "", "abcdef"]) {
      if (faux === (await codeDuMoment())) continue;
      expect(await verifierSecondFacteur(userId, faux)).toBe(false);
    }
  });

  it("accepte un code de secours, et une seule fois", async () => {
    await activer(userId);
    await prisma.recoveryCode.create({
      data: { userId, codeHash: await empreinteCodeDeSecours(CODE_SECOURS) },
    });
    expect(await codesDeSecoursRestants(userId)).toBe(1);

    expect(await verifierSecondFacteur(userId, CODE_SECOURS)).toBe(true);
    // Consomme : un code a usage unique qui resterait valable n'aurait plus
    // rien d'unique.
    expect(await verifierSecondFacteur(userId, CODE_SECOURS)).toBe(false);
    expect(await codesDeSecoursRestants(userId)).toBe(0);
  });

  it("tolere la casse et les espaces sur un code de secours", async () => {
    await activer(userId);
    await prisma.recoveryCode.create({
      data: { userId, codeHash: await empreinteCodeDeSecours(CODE_SECOURS) },
    });
    expect(await verifierSecondFacteur(userId, " abcd 2345 ")).toBe(true);
  });

  it("n'ouvre pas un compte avec le code de secours d'un autre", async () => {
    await activer(userId);
    await activer(autreId);
    await prisma.recoveryCode.create({
      data: { userId: autreId, codeHash: await empreinteCodeDeSecours(CODE_SECOURS) },
    });
    // Le code existe, mais il appartient a quelqu'un d'autre.
    expect(await verifierSecondFacteur(userId, CODE_SECOURS)).toBe(false);
    expect(await codesDeSecoursRestants(autreId)).toBe(1);
  });
});
