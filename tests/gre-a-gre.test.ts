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
import {
  advanceDirectDealAction,
  openDirectDealAction,
  saveDirectCarriersAction,
} from "@/app/actions/direct-deals";
import { handleStripeEvent } from "@/lib/billing/handle-stripe-event";

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
    await prisma.outboundEmail.deleteMany({ where: { dedupeKey: { startsWith: `direct:${id}:` } } });
    await prisma.notification.deleteMany({ where: { href: `/app/formaliser/${id}` } });
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

  it("accepte des attestations seules sans prix, mais pas un kit", async () => {
    const attestations = await ouvrir({ attestations: "on" }, "0");
    expect(attestations.id).toBeTruthy();
    const kit = await ouvrir({ kit: "on" }, "0");
    expect(kit.error).toContain("supérieur à zéro");
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

/** Étape franchie par la bonne partie : l'accord vient de la contrepartie. */
async function avancer(id: string, etape: string) {
  connecterUtilisateur(etape === "ACCEPTED" ? acquereur.id : cedant.id);
  const resultat = await advanceDirectDealAction({}, form({ dealId: id, stage: etape }));
  connecterUtilisateur(cedant.id);
  return resultat;
}

async function renseignerCompagnies(id: string) {
  return saveDirectCarriersAction(
    {},
    form({ dealId: id, carriers: "AXA ; 123456\nAlptis", effectiveDate: new Date().toISOString().slice(0, 10) }),
  );
}

describe("invitation et accord", () => {
  it("envoie l’invitation à la contrepartie", async () => {
    const resultat = await ouvrir({ attestations: "on" });
    const mail = await prisma.outboundEmail.findUnique({
      where: { dedupeKey: `direct:${resultat.id}:invited` },
      select: { to: true },
    });
    expect(mail?.to).toBe(acquereur.email.toLowerCase());
  });

  it("refuse que l’ouvreur donne l’accord à la place de la contrepartie", async () => {
    const resultat = await ouvrir({ kit: "on" });
    const refus = await advanceDirectDealAction({}, form({ dealId: resultat.id!, stage: "ACCEPTED" }));
    expect(refus.error).toContain("contrepartie");

    const ok = await avancer(resultat.id!, "ACCEPTED");
    expect(ok.error).toBeUndefined();
  });

  it("prévient l’autre partie quand une étape est franchie", async () => {
    const resultat = await ouvrir({ kit: "on" });
    await avancer(resultat.id!, "ACCEPTED");
    const mail = await prisma.outboundEmail.findFirst({
      where: { dedupeKey: { startsWith: `direct:${resultat.id}:ACCEPTED:` } },
      select: { to: true },
    });
    expect(mail?.to).toBe(cedant.email);
  });
});

describe("attestations de transfert", () => {
  it("n’émet rien sans compagnie ni date d’effet", async () => {
    const resultat = await ouvrir({ attestations: "on" });
    const id = resultat.id!;
    await avancer(id, "ACCEPTED");

    const refus = await avancer(id, "TRANSFER");
    expect(refus.error).toContain("compagnie");

    const enregistre = await renseignerCompagnies(id);
    expect(enregistre.error).toBeUndefined();
    const deal = await prisma.directDeal.findUnique({ where: { id }, select: { carriers: true } });
    expect(deal?.carriers).toEqual([
      { name: "AXA", code: "123456" },
      { name: "Alptis", code: "" },
    ]);

    const ok = await avancer(id, "TRANSFER");
    expect(ok.error).toBeUndefined();
  });

  it("fige la liste une fois les attestations émises", async () => {
    const resultat = await ouvrir({ attestations: "on" });
    const id = resultat.id!;
    await avancer(id, "ACCEPTED");
    await renseignerCompagnies(id);
    await avancer(id, "TRANSFER");

    const refus = await renseignerCompagnies(id);
    expect(refus.error).toContain("figée");
  });

  it("refuse une date d’effet fantaisiste", async () => {
    const resultat = await ouvrir({ attestations: "on" });
    const refus = await saveDirectCarriersAction(
      {},
      form({ dealId: resultat.id!, carriers: "AXA", effectiveDate: "2099-01-01" }),
    );
    expect(refus.error).toContain("date d’effet");
  });
});

describe("règlement des honoraires", () => {
  const session = (dealId: string, payment_status: string, id: string) => ({
    type: "checkout.session.completed",
    data: {
      object: {
        id,
        payment_status,
        amount_total: 10_680,
        metadata: { kind: "direct_fees", directDealId: dealId, userId: cedant.id },
      },
    },
  });

  it("enregistre le paiement reçu par webhook, une seule fois", async () => {
    const resultat = await ouvrir({ attestations: "on" });
    const id = resultat.id!;

    await handleStripeEvent(session(id, "unpaid", "cs_test_impaye"));
    let deal = await prisma.directDeal.findUnique({ where: { id }, select: { feesPaidAt: true } });
    expect(deal?.feesPaidAt).toBeNull();

    await handleStripeEvent(session(id, "paid", "cs_test_premier"));
    await handleStripeEvent(session(id, "paid", "cs_test_rejeu"));
    const paye = await prisma.directDeal.findUnique({
      where: { id },
      select: { feesPaidAt: true, feesAmountCents: true, feesCheckoutSessionId: true },
    });
    expect(paye?.feesPaidAt).not.toBeNull();
    expect(paye?.feesAmountCents).toBe(10_680);
    // Le rejeu du webhook ne réécrit pas la trace du premier règlement.
    expect(paye?.feesCheckoutSessionId).toBe("cs_test_premier");
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
    await renseignerCompagnies(id);

    for (const etape of etapes) {
      const avance = await avancer(id, etape);
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
    await renseignerCompagnies(id);
    for (const etape of ["ACCEPTED", "KYC", "DEED", "SIGNATURE"]) {
      await avancer(id, etape);
    }

    const refus = await avancer(id, "ESCROW");
    expect(refus.error).toContain("celle qui vient");

    const ok = await avancer(id, "TRANSFER");
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
