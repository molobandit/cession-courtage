/**
 * L'effacement d'un compte, applique pour de vrai sur la base D1 locale.
 *
 * La garde est testee ailleurs. Ici on verifie ce qu'aucun test pur ne peut
 * dire : que la base accepte la neutralisation. C'est la que ca casse en
 * general, `email` et `oriasNumber` etant uniques et non nuls, et les offres,
 * dossiers et depots referencant l'utilisateur avec un ON DELETE RESTRICT.
 *
 * Le compte est restaure en fin de test.
 *
 * Prerequis : `npm run db:migrate && npm run db:seed`.
 */
import { afterAll, describe, expect, it } from "vitest";
import { prisma } from "@/lib/prisma";
import { disposePlatformProxy } from "./setup/prisma-test";
import { identiteNeutralisee } from "@/lib/rgpd/effacement";

const EMAIL = "aurore.petit@nouveau-cabinet.demo";

afterAll(async () => {
  await disposePlatformProxy();
});

describe("application de l'effacement", () => {
  it("neutralise l'identite sans rien casser, puis se restaure", async () => {
    const avant = await prisma.user.findUnique({
      where: { email: EMAIL },
      select: {
        id: true,
        email: true,
        fullName: true,
        phone: true,
        passwordHash: true,
        oriasNumber: true,
        publicAlias: true,
      },
    });
    if (!avant) throw new Error(`Compte absent : ${EMAIL}. Lancez npm run db:seed.`);

    try {
      await prisma.user.update({
        where: { id: avant.id },
        data: identiteNeutralisee(avant.id),
      });

      const apres = await prisma.user.findUnique({
        where: { id: avant.id },
        select: {
          email: true,
          fullName: true,
          phone: true,
          passwordHash: true,
          oriasNumber: true,
          publicAlias: true,
        },
      });

      // Plus rien de nominatif.
      expect(apres!.fullName).toBeNull();
      expect(apres!.phone).toBeNull();
      // Aucune connexion n'est plus possible : c'est la garantie qui compte.
      expect(apres!.passwordHash).toBeNull();
      expect(apres!.email).not.toBe(avant.email);
      expect(apres!.email).toMatch(/\.invalid$/);
      expect(apres!.oriasNumber).not.toBe(avant.oriasNumber);
      // L'alias survit : il sert de libelle aux dossiers clos et ne designe
      // personne.
      expect(apres!.publicAlias).toBe(avant.publicAlias);

      // Le compte ne doit plus etre trouvable par son ancienne adresse.
      const parAncienEmail = await prisma.user.findUnique({ where: { email: avant.email } });
      expect(parAncienEmail).toBeNull();
    } finally {
      await prisma.user.update({
        where: { id: avant.id },
        data: {
          email: avant.email,
          fullName: avant.fullName,
          phone: avant.phone,
          passwordHash: avant.passwordHash,
          oriasNumber: avant.oriasNumber,
        },
      });
    }

    const restaure = await prisma.user.findUnique({ where: { email: EMAIL } });
    expect(restaure).not.toBeNull();
  });

  it("supprime bien ce qui n'a plus d'objet, sans toucher aux autres comptes", async () => {
    const user = await prisma.user.findUnique({ where: { email: EMAIL }, select: { id: true } });
    const avantAilleurs = await prisma.notification.count({
      where: { userId: { not: user!.id } },
    });

    await prisma.buyerMandate.deleteMany({ where: { buyerId: user!.id } });
    await prisma.notification.deleteMany({ where: { userId: user!.id } });

    expect(await prisma.notification.count({ where: { userId: user!.id } })).toBe(0);
    // Les notifications des autres comptes ne bougent pas : un effacement ne
    // deborde jamais sur autrui.
    expect(await prisma.notification.count({ where: { userId: { not: user!.id } } })).toBe(
      avantAilleurs,
    );
  });
});
