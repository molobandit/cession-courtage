/**
 * L'accès au marché, sur la vraie base D1 locale.
 *
 * La page d'accueil vend un accès au marché à 250 € HT par an. C'est lui qui
 * ouvre le détail d'un dossier, la messagerie et le dépôt de positionnement.
 * Le test tient la règle dans les deux sens : sans abonnement actif, la porte
 * reste fermée ; avec, elle s'ouvre. L'administrateur passe toujours.
 *
 * Prérequis : `npm run db:migrate && npm run db:seed`.
 */
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { prisma } from "@/lib/prisma";
// Importé directement : l'alias de vitest ne vaut pas pour tsc.
import { disposePlatformProxy } from "./setup/prisma-test";
import type { Actor } from "@/lib/authz/actor";
import { hasContactSubscription } from "@/lib/billing/contact-access";

async function actorByEmail(email: string): Promise<Actor> {
  const user = await prisma.user.findUnique({
    where: { email },
    select: {
      id: true,
      email: true,
      fullName: true,
      role: true,
      firmId: true,
      oriasNumber: true,
      oriasVerifiedAt: true,
      kycStatus: true,
      publicAlias: true,
    },
  });
  if (!user) throw new Error(`Compte de demonstration absent : ${email}. Lancez npm run db:seed.`);
  return user as Actor;
}

let acquereur: Actor;
let admin: Actor;
let abonnements: { id: string; status: string }[] = [];

beforeAll(async () => {
  acquereur = await actorByEmail("acquisition@expansion-idf.demo");
  admin = await actorByEmail("admin@cession-courtage.demo");
  abonnements = await prisma.subscription.findMany({
    where: { userId: acquereur.id },
    select: { id: true, status: true },
  });
});

afterAll(async () => {
  for (const a of abonnements) {
    await prisma.subscription.update({ where: { id: a.id }, data: { status: a.status as never } });
  }
  await disposePlatformProxy();
});

describe("l’accès au marché", () => {
  it("s’ouvre avec un abonnement actif", async () => {
    for (const a of abonnements) {
      await prisma.subscription.update({ where: { id: a.id }, data: { status: "ACTIVE" } });
    }
    expect(abonnements.length).toBeGreaterThan(0);
    expect(await hasContactSubscription(acquereur)).toBe(true);
  });

  it("reste fermé quand aucun abonnement n’est actif", async () => {
    for (const a of abonnements) {
      await prisma.subscription.update({ where: { id: a.id }, data: { status: "CANCELLED" } });
    }
    expect(await hasContactSubscription(acquereur)).toBe(false);
  });

  it("laisse toujours passer l’administrateur", async () => {
    expect(await hasContactSubscription(admin)).toBe(true);
  });
});
