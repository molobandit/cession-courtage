/**
 * La garde d'effacement, confrontee aux vrais dossiers de la base D1 locale.
 *
 * Le test unitaire verifie le predicat sur des donnees inventees. Celui-ci
 * verifie qu'applique aux dossiers reellement presents, il protege bien les
 * personnes engagees dans une cession en cours : effacer un cedant en plein
 * sequestre priverait l'acquereur de sa contrepartie et de toute preuve.
 *
 * Aucune ecriture : ce test lit, il ne supprime rien.
 *
 * Prerequis : `npm run db:migrate && npm run db:seed`.
 */
import { afterAll, describe, expect, it } from "vitest";
import { prisma } from "@/lib/prisma";
import { disposePlatformProxy } from "./setup/prisma-test";
import { effacementPossible, dossiersBloquants } from "@/lib/rgpd/effacement";

afterAll(async () => {
  await disposePlatformProxy();
});

async function dossiersDe(email: string) {
  const user = await prisma.user.findUnique({ where: { email }, select: { id: true } });
  if (!user) throw new Error(`Compte absent : ${email}. Lancez npm run db:seed.`);
  return prisma.deal.findMany({
    where: { OR: [{ sellerId: user.id }, { buyerId: user.id }] },
    select: { stage: true },
  });
}

describe("garde d'effacement sur les dossiers reels", () => {
  it("refuse d'effacer un cedant dont le dossier est encore ouvert", async () => {
    // Sofia est en salle de donnees sur 10007 : la cession est engagee.
    const dossiers = await dossiersDe("sofia.martinez@occitanie-prevoyance.demo");
    expect(dossiers.length).toBeGreaterThan(0);
    expect(effacementPossible(dossiers)).toBe(false);
  });

  it("refuse d'effacer un acquereur engage dans une LOI", async () => {
    const dossiers = await dossiersDe("yann.legoff@bretagne-courtage.demo");
    expect(dossiersBloquants(dossiers)).toBeGreaterThan(0);
    expect(effacementPossible(dossiers)).toBe(false);
  });

  it("autorise l'effacement quand tous les dossiers sont clos", async () => {
    // Helene est sur 10009, dossier CLOSED avec ses relevés de retention.
    const dossiers = await dossiersDe("helene.wagner@est-protection.demo");
    expect(dossiers.length).toBeGreaterThan(0);
    expect(dossiers.every((d) => d.stage === "CLOSED")).toBe(true);
    expect(effacementPossible(dossiers)).toBe(true);
  });

  it("autorise l'effacement d'un compte sans aucun dossier", async () => {
    const dossiers = await dossiersDe("aurore.petit@nouveau-cabinet.demo");
    expect(dossiers).toHaveLength(0);
    expect(effacementPossible(dossiers)).toBe(true);
  });
});
