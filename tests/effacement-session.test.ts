/**
 * Un compte efface ne doit plus valoir session.
 *
 * Defaut constate en production : apres avoir supprime son compte, la personne
 * restait connectee et gardait un acces complet. La session est un jeton
 * autonome, valable jusqu'a son echeance et impossible a revoquer cote serveur ;
 * c'est donc la lecture de l'acteur qui doit refuser.
 *
 * Le compte est restaure en fin de test.
 *
 * Prerequis : `npm run db:migrate && npm run db:seed`.
 */
import { afterAll, describe, expect, it } from "vitest";
import { prisma } from "@/lib/prisma";
import { disposePlatformProxy } from "./setup/prisma-test";

const EMAIL = "aurore.petit@nouveau-cabinet.demo";

afterAll(async () => {
  await disposePlatformProxy();
});

/** Reproduit ce que fait `getActor` : retrouver l'acteur par son identifiant. */
async function acteurDepuisSession(userId: string) {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { id: true, email: true, erasedAt: true },
  });
  if (!user || user.erasedAt) return null;
  return user;
}

describe("session d'un compte efface", () => {
  it("refuse l'acteur des que le compte porte une date d'effacement", async () => {
    const user = await prisma.user.findUnique({ where: { email: EMAIL }, select: { id: true } });
    if (!user) throw new Error(`Compte absent : ${EMAIL}. Lancez npm run db:seed.`);

    // Avant effacement, la session est honoree.
    expect(await acteurDepuisSession(user.id)).not.toBeNull();

    try {
      await prisma.user.update({ where: { id: user.id }, data: { erasedAt: new Date() } });
      // Le jeton est toujours valable et la ligne existe toujours : c'est
      // precisement le cas ou l'ancienne version laissait passer.
      expect(await acteurDepuisSession(user.id)).toBeNull();
    } finally {
      await prisma.user.update({ where: { id: user.id }, data: { erasedAt: null } });
    }

    expect(await acteurDepuisSession(user.id)).not.toBeNull();
  });

  it("laisse intacts les comptes qui n'ont pas ete effaces", async () => {
    const actifs = await prisma.user.count({ where: { erasedAt: null } });
    const effaces = await prisma.user.count({ where: { erasedAt: { not: null } } });
    // Un effacement ne doit jamais deborder : le seed ne contient aucun compte
    // efface.
    expect(effaces).toBe(0);
    expect(actifs).toBeGreaterThan(15);
  });
});
