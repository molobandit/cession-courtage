/**
 * Cession de gré à gré, sur la vraie base D1 locale.
 *
 * Deux cessions sur trois se nouent hors plateforme. Ce parcours ne reprend pas
 * la négociation — elle est faite — il vend la formalisation. Ce qu'il faut
 * tenir : le dossier n'appartient qu'à ses deux parties, on avance d'un cran,
 * et le parcours s'adapte aux services réellement achetés.
 *
 * Prérequis : `npm run db:migrate && npm run db:seed`.
 */
import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import { prisma } from "@/lib/prisma";
// Importés directement : l'alias de vitest ne vaut pas pour tsc.
import { disposePlatformProxy } from "./setup/prisma-test";
import { connecterUtilisateur } from "./setup/auth-stub";
import { advanceDirectDealAction, openDirectDealAction } from "@/app/actions/direct-deals";

let cedant: { id: string; email: string; kycStatus: string };
let acquereur: { id: string; email: string; kycStatus: string };
const crees: string[] = [];

function form(champs: Record<string, string>): FormData {
  const data = new FormData();
  for (const [c, v] of Object.entries(champs)) data.set(c, v);
  return data;
}

async function ouvrir(services: Record<string, string>, prix = "40000") {
  const resultat = await openDirectDealAction(
    {},
    form({
      openerRole: "SELLER",
      counterpartyEmail: acquereur.email,
      portfolioLabel: "Santé individuelle, Bretagne",
      salePrice: prix,
      upfrontPercent: "100",
      ...services,
    }),
  );
  if (resultat.id) crees.push(resultat.id);
  return resultat;
}

beforeAll(async () => {
  const deux = await prisma.user.findMany({
    where: { oriasVerifiedAt: { not: null }, erasedAt: null },
    select: { id: true, email: true, kycStatus: true },
    take: 2,
  });
  if (deux.length < 2) throw new Error("Deux comptes vérifiés sont nécessaires.");
  cedant = deux[0];
  acquereur = deux[1];
});

beforeEach(() => connecterUtilisateur(cedant.id));

afterAll(async () => {
  connecterUtilisateur(null);
  // La vérification simulée marque les comptes KYC vérifiés : on rend l'état initial.
  for (const u of [cedant, acquereur]) {
    await prisma.user.update({ where: { id: u.id }, data: { kycStatus: u.kycStatus as never } });
  }
  for (const id of crees) {
    await prisma.auditLog.deleteMany({ where: { entityType: "DirectDeal", entityId: id } });
    await prisma.directDeal.delete({ where: { id } }).catch(() => undefined);
  }
  await disposePlatformProxy();
});

describe("ouverture d’un dossier", () => {
  it("refuse un dossier sans aucun service", async () => {
    const resultat = await ouvrir({});
    expect(resultat.error).toContain("au moins un service");
  });

  it("refuse de se désigner soi-même comme contrepartie", async () => {
    const resultat = await openDirectDealAction(
      {},
      form({
        openerRole: "SELLER",
        counterpartyEmail: cedant.email,
        portfolioLabel: "Santé individuelle",
        salePrice: "40000",
        upfrontPercent: "100",
        kit: "on",
      }),
    );
    expect(resultat.error).toContain("vous-même");
  });

  it("ouvre le dossier et rattache une contrepartie déjà inscrite", async () => {
    const resultat = await ouvrir({ kit: "on", escrow: "on" });
    expect(resultat.id).toBeTruthy();

    const deal = await prisma.directDeal.findUnique({
      where: { id: resultat.id! },
      select: { stage: true, counterpartyUserId: true, kit: true, escrow: true },
    });
    expect(deal?.stage).toBe("INVITED");
    expect(deal?.counterpartyUserId).toBe(acquereur.id);
    expect(deal?.kit).toBe(true);
  });
});

describe("le dossier n’appartient qu’à ses deux parties", () => {
  it("refuse un tiers", async () => {
    const resultat = await ouvrir({ kit: "on" });
    const tiers = await prisma.user.findFirst({
      where: {
        id: { notIn: [cedant.id, acquereur.id] },
        oriasVerifiedAt: { not: null },
        erasedAt: null,
      },
      select: { id: true },
    });
    if (!tiers) throw new Error("Aucun tiers vérifié en base.");

    connecterUtilisateur(tiers.id);
    const avance = await advanceDirectDealAction(
      {},
      form({ dealId: resultat.id!, stage: "ACCEPTED" }),
    );
    expect(avance.error).toContain("inaccessible");
  });
});

describe("on avance d’un cran, jamais plus", () => {
  it("refuse de sauter une étape", async () => {
    const resultat = await ouvrir({ kit: "on" });
    const avance = await advanceDirectDealAction(
      {},
      form({ dealId: resultat.id!, stage: "SIGNATURE" }),
    );
    expect(avance.error).toContain("celle qui vient");

    const deal = await prisma.directDeal.findUnique({
      where: { id: resultat.id! },
      select: { stage: true },
    });
    expect(deal?.stage).toBe("INVITED");
  });

  it("déroule le parcours complet jusqu’à la clôture", async () => {
    const resultat = await ouvrir({ kit: "on", escrow: "on" });
    const id = resultat.id!;
    const etapes = ["ACCEPTED", "KYC", "DEED", "SIGNATURE", "ESCROW", "TRANSFER", "CLOSED"];

    for (const etape of etapes) {
      const avance = await advanceDirectDealAction({}, form({ dealId: id, stage: etape }));
      expect(avance.error).toBeUndefined();
    }

    const deal = await prisma.directDeal.findUnique({
      where: { id },
      select: {
        stage: true,
        closedAt: true,
        deedSignedAt: true,
        signatureProviderRef: true,
        escrowStage: true,
        escrowProviderRef: true,
      },
    });
    expect(deal?.stage).toBe("CLOSED");
    // La clôture est datée : c'est elle qui fait foi, pas l'étape seule.
    expect(deal?.closedAt).not.toBeNull();
    // Chaque étape a réellement appelé son rail, et en garde la trace.
    expect(deal?.deedSignedAt).not.toBeNull();
    expect(deal?.signatureProviderRef).toBeTruthy();
    expect(deal?.escrowProviderRef).toBeTruthy();
    // Bloqués au séquestre, puis libérés à la clôture.
    expect(deal?.escrowStage).toBe("RELEASED");
  });

  it("saute l’étape que les services ne prévoient pas", async () => {
    // Sans séquestre acheté, on passe de la signature aux attestations.
    const resultat = await ouvrir({ kit: "on" });
    const id = resultat.id!;
    for (const etape of ["ACCEPTED", "KYC", "DEED", "SIGNATURE"]) {
      await advanceDirectDealAction({}, form({ dealId: id, stage: etape }));
    }

    const refus = await advanceDirectDealAction({}, form({ dealId: id, stage: "ESCROW" }));
    expect(refus.error).toContain("celle qui vient");

    const ok = await advanceDirectDealAction({}, form({ dealId: id, stage: "TRANSFER" }));
    expect(ok.error).toBeUndefined();

    // Sans séquestre acheté, aucun fonds n'a jamais été bloqué.
    const deal = await prisma.directDeal.findUnique({
      where: { id },
      select: { escrowStage: true, escrowProviderRef: true },
    });
    expect(deal?.escrowStage).toBe("NONE");
    expect(deal?.escrowProviderRef).toBeNull();
  });
});
