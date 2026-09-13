/**
 * Simulation complète du parcours d'achat, jusqu'à la vente.
 *
 * Le tunnel du dossier est couvert ailleurs, à partir d'un dossier déjà
 * ouvert. Ici on part d'avant, par les deux portes d'entrée d'un acquéreur :
 *
 * 1. Il trouve une annonce au catalogue, dont la fenêtre de 21 jours est close,
 *    et prend position : dépôt, offre, le cédant retient, dossier, clôture.
 * 2. Il publie une demande d'acquisition, un cédant lui propose un
 *    portefeuille, et il enchaîne sur le même parcours.
 *
 * Ce sont exactement les deux chemins qui s'arrêtaient net : « Prendre
 * position » ne menait à rien sur une annonce close, et une demande publiée
 * ne produisait rien. Les deux annonces viennent du catalogue de
 * démonstration, pour vérifier au passage qu'il a bien un cédant pour
 * retenir les offres.
 *
 * Prérequis : `npm run db:migrate && npm run db:seed && npm run db:catalog`.
 */
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { DealStage, ListingStatus } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { disposePlatformProxy } from "./setup/prisma-test";
import { connecterUtilisateur } from "./setup/auth-stub";
import { placeInterestDepositAction } from "@/app/actions/deposits";
import { createMandateAction } from "@/app/actions/mandates";
import { proposeListingAction } from "@/app/actions/mandate-proposals";
import { acceptOfferAction, submitOfferAction } from "@/app/actions/offers";
import { takePositionAction } from "@/app/actions/positions";
import { loadPosition } from "@/lib/position/load";
import { fundEscrowAction } from "@/app/actions/deal-process";
import { menerDossier } from "./setup/dossier";

const ANNONCE_CATALOGUE = "lst_catalog_05";
const ANNONCE_DEMANDE = "lst_catalog_10";
const CEDANT = "usr_catalog_seller";

type Compte = { id: string; email: string; kycStatus: string };

let cedant: Compte;
let acheteurCatalogue: Compte;
let acheteurDemande: Compte;
const etatsAnnonces = new Map<string, ListingStatus>();
let quotas: { id: string; dealsUsed: number }[] = [];
const mandatsCrees: string[] = [];
const debut = new Date();

function form(champs: Record<string, string | string[]>): FormData {
  const data = new FormData();
  for (const [cle, valeur] of Object.entries(champs)) {
    for (const v of Array.isArray(valeur) ? valeur : [valeur]) data.append(cle, v);
  }
  return data;
}

/** Les actions qui redirigent lèvent l'erreur de contrôle de Next : on lit sa destination. */
async function destination(appel: Promise<unknown>): Promise<string> {
  try {
    await appel;
  } catch (error) {
    const cible = (error as { destination?: string }).destination;
    if (cible) return cible;
    throw error;
  }
  throw new Error("L’action devait rediriger.");
}

async function compte(where: { id?: string; email?: string }): Promise<Compte> {
  const u = await prisma.user.findFirst({ where, select: { id: true, email: true, kycStatus: true } });
  if (!u) throw new Error(`Compte de démonstration absent : ${JSON.stringify(where)}.`);
  return u;
}

/** Dépôt, offre, acceptation, puis tout le dossier jusqu'à la vente. */
async function acheterJusquALaVente(listingId: string, acheteur: Compte, enUnGeste = false) {
  const listing = await prisma.listing.findUniqueOrThrow({
    where: { id: listingId },
    select: { publicNumber: true, askingPrice: true },
  });

  // « Prendre position » ouvre le dossier et prévient le cédant.
  connecterUtilisateur(acheteur.id);
  const versPosition = await destination(takePositionAction({}, form({ listingId })));
  expect(versPosition).toMatch(/^\/app\/positions\//);
  const positionId = versPosition.split("/").pop()!;
  expect((await loadPosition(positionId))?.state.key).toBe("POSITION");
  const avisCedant = await prisma.notification.findFirst({
    where: { userId: cedant.id, href: versPosition },
    select: { title: true },
  });
  expect(avisCedant?.title).toContain("prise de position");
  // Reprendre position ne crée pas un second dossier.
  expect(await destination(takePositionAction({}, form({ listingId })))).toBe(versPosition);

  const sansDepot = await submitOfferAction(
    {},
    form({ listingId, amount: String(Number(listing.askingPrice)), upfrontPercent: "80", message: "Reprise complète envisagée." }),
  );
  expect(sansDepot.error).toContain("dépôt");

  let versFiche: string;
  if (enUnGeste) {
    // Engagement, confidentialité et offre, date d'effet comprise, en un seul formulaire.
    const dateEffet = new Date(Date.UTC(new Date().getUTCFullYear(), new Date().getUTCMonth() + 2, 1)).toISOString().slice(0, 10);
    versFiche = await destination(
      submitOfferAction({}, form({ listingId, amount: String(Number(listing.askingPrice)), effectiveDate: dateEffet, engagement: "on", nda: "on" })),
    );
  } else {
    // Sans l'engagement de confidentialité, pas de dépôt.
    expect((await placeInterestDepositAction({}, form({ listingId }))).error).toContain("confidentialité");
    expect(await placeInterestDepositAction({}, form({ listingId, nda: "on" }))).toEqual({ placed: true });
    versFiche = await destination(
      submitOfferAction(
        {},
        form({ listingId, amount: String(Number(listing.askingPrice)), upfrontPercent: "80", message: "Reprise complète envisagée." }),
      ),
    );
  }
  expect(versFiche).toBe(versPosition);
  expect((await loadPosition(positionId))?.state.key).toBe("OFFER");

  const offre = await prisma.offer.findUniqueOrThrow({
    where: { listingId_buyerId: { listingId, buyerId: acheteur.id } },
    select: { id: true },
  });

  connecterUtilisateur(cedant.id);
  const versDossier = await destination(acceptOfferAction({}, form({ offerId: offre.id })));
  expect(versDossier).toMatch(/^\/app\/dossiers\//);
  const dealId = versDossier.split("/").pop()!;

  // Chaque partie agit à l'étape qui lui revient, pièces et signatures comprises.
  await menerDossier(dealId, "CLOSED");

  // L'acquéreur a été prévenu de l'offre retenue, puis de chaque étape du dossier.
  const avisAcheteur = await prisma.notification.findMany({
    where: { userId: acheteur.id, createdAt: { gte: debut } },
    select: { title: true, href: true },
  });
  expect(avisAcheteur.some((n) => n.title.startsWith("Offre retenue") && n.href === versPosition)).toBe(true);
  expect(avisAcheteur.some((n) => n.title.endsWith("· Signature"))).toBe(true);
  expect(avisAcheteur.some((n) => n.title.startsWith("Cession close") && n.href === versDossier)).toBe(true);
  const suivi = await loadPosition(positionId);
  expect(suivi?.state.percent).toBe(100);

  const fin = await prisma.deal.findUniqueOrThrow({
    where: { id: dealId },
    select: { stage: true, escrowStage: true },
  });
  expect(fin.stage).toBe(DealStage.CLOSED);
  expect(fin.escrowStage).toBe("RELEASED");

  // Constaté en direct : le bouton de séquestre restait actif sur un dossier clos.
  connecterUtilisateur(acheteur.id);
  expect((await fundEscrowAction({}, form({ dealId, consent: "on" }))).error).toBeTruthy();
  const apres = await prisma.deal.findUniqueOrThrow({ where: { id: dealId }, select: { escrowStage: true } });
  expect(apres.escrowStage).toBe("RELEASED");

  const annonce = await prisma.listing.findUniqueOrThrow({ where: { id: listingId }, select: { status: true } });
  expect(annonce.status).toBe(ListingStatus.SOLD);

  const depot = await prisma.interestDeposit.findUniqueOrThrow({
    where: { listingId_buyerId: { listingId, buyerId: acheteur.id } },
    select: { outcome: true },
  });
  expect(depot.outcome).toBe("DEDUCTED");
}

beforeAll(async () => {
  cedant = await compte({ id: CEDANT });
  acheteurCatalogue = await compte({ email: "acquisition@expansion-idf.demo" });
  acheteurDemande = await compte({ email: "direction@alliance-paca.demo" });

  for (const id of [ANNONCE_CATALOGUE, ANNONCE_DEMANDE]) {
    const l = await prisma.listing.findUniqueOrThrow({ where: { id }, select: { status: true } });
    etatsAnnonces.set(id, l.status);
    // L'état qui bloquait : fenêtre close, personne n'a encore repris le portefeuille.
    await prisma.listing.update({ where: { id }, data: { status: ListingStatus.OFFERS_CLOSED } });
  }
  quotas = await prisma.subscription.findMany({
    where: { userId: { in: [cedant.id, acheteurCatalogue.id, acheteurDemande.id] } },
    select: { id: true, dealsUsed: true },
  });
});

afterAll(async () => {
  connecterUtilisateur(null);
  const acheteurs = [acheteurCatalogue.id, acheteurDemande.id];
  const annonces = [ANNONCE_CATALOGUE, ANNONCE_DEMANDE];
  const deals = await prisma.deal.findMany({
    where: { listingId: { in: annonces }, buyerId: { in: acheteurs } },
    select: { id: true },
  });
  await prisma.listingCompanyDocument.deleteMany({ where: { listingId: { in: annonces }, createdAt: { gte: debut } } });
  await prisma.accountDocument.deleteMany({ where: { createdAt: { gte: debut } } });
  for (const deal of deals) {
    await prisma.document.deleteMany({ where: { dealId: deal.id } });
    await prisma.dueDiligenceItem.deleteMany({ where: { dealId: deal.id } });
    await prisma.auditLog.deleteMany({ where: { entityId: deal.id } });
    await prisma.deal.delete({ where: { id: deal.id } });
  }
  await prisma.offer.deleteMany({ where: { listingId: { in: annonces }, buyerId: { in: acheteurs } } });
  await prisma.buyerPosition.deleteMany({ where: { listingId: { in: annonces }, buyerId: { in: acheteurs } } });
  await prisma.message.deleteMany({ where: { listingId: { in: annonces } , senderId: { in: acheteurs } } });
  await prisma.notification.deleteMany({
    where: { userId: { in: [...acheteurs, cedant.id] }, createdAt: { gte: debut } },
  });
  await prisma.outboundEmail.deleteMany({ where: { createdAt: { gte: debut } } });
  await prisma.interestDeposit.deleteMany({ where: { listingId: { in: annonces }, buyerId: { in: acheteurs } } });
  for (const id of mandatsCrees) {
    await prisma.auditLog.deleteMany({ where: { entityId: id } });
    await prisma.buyerMandate.delete({ where: { id } }).catch(() => undefined);
  }
  await prisma.auditLog.deleteMany({ where: { entityId: { in: annonces } } });
  for (const [id, status] of etatsAnnonces) {
    await prisma.listing.update({ where: { id }, data: { status } });
  }
  for (const q of quotas) {
    await prisma.subscription.update({ where: { id: q.id }, data: { dealsUsed: q.dealsUsed } });
  }
  for (const u of [cedant, acheteurCatalogue, acheteurDemande]) {
    await prisma.user.update({ where: { id: u.id }, data: { kycStatus: u.kycStatus as never, kycReviewNote: null, kycReviewedAt: null } });
  }
  await disposePlatformProxy();
});

describe("par le catalogue", () => {
  it("prend position sur une annonce close et va jusqu’à la vente", async () => {
    await acheterJusquALaVente(ANNONCE_CATALOGUE, acheteurCatalogue);
  });
});

describe("par une demande d’acquisition", () => {
  it("publie la demande, reçoit une proposition et va jusqu’à la vente", async () => {
    connecterUtilisateur(acheteurDemande.id);
    const versDemande = await destination(
      createMandateAction(
        {},
        form({
          publish: "true",
          maxBudget: "500000",
          minCommissions: "1000",
          maxCommissions: "200000",
          riskTypes: ["HEALTH_INDIVIDUAL", "PROVIDENT"],
          zones: "NATIONAL",
          clientSegments: ["INDIVIDUAL"],
          financingMode: "BOTH",
        }),
      ),
    );
    // La demande publiée mène à sa page, où l'auteur voit ce qu'elle produit.
    expect(versDemande).toMatch(/^\/annonces\/demandes\/\d+$/);
    const numero = Number(versDemande.split("/").pop());
    const mandat = await prisma.buyerMandate.findUniqueOrThrow({
      where: { publicNumber: numero },
      select: { id: true, isPublic: true },
    });
    mandatsCrees.push(mandat.id);
    expect(mandat.isPublic).toBe(true);
    // Les portefeuilles correspondants sont calculés dès la publication.
    expect(await prisma.match.count({ where: { mandateId: mandat.id } })).toBeGreaterThan(0);

    // Le cédant répond avec son annonce ; il ne peut pas proposer celle d'un autre.
    connecterUtilisateur(cedant.id);
    const autre = await prisma.listing.findFirstOrThrow({
      where: { portfolio: { firmId: { not: "firm_catalog" } } },
      select: { id: true },
    });
    expect((await proposeListingAction({}, form({ mandateId: mandat.id, listingId: autre.id }))).error).toBe(
      "Annonce introuvable.",
    );
    expect(
      await proposeListingAction(
        {},
        form({ mandateId: mandat.id, listingId: ANNONCE_DEMANDE, message: "Portefeuille santé, clientèle fidèle." }),
      ),
    ).toEqual({ sent: true });
    expect((await proposeListingAction({}, form({ mandateId: mandat.id, listingId: ANNONCE_DEMANDE }))).error).toContain(
      "déjà proposée",
    );

    // L'acquéreur est prévenu, par courriel et dans l'application.
    const proposition = await prisma.mandateProposal.findUniqueOrThrow({
      where: { mandateId_listingId: { mandateId: mandat.id, listingId: ANNONCE_DEMANDE } },
      select: { id: true },
    });
    const courriel = await prisma.outboundEmail.findUnique({
      where: { dedupeKey: `proposal:${proposition.id}` },
      select: { to: true },
    });
    expect(courriel?.to).toBe(acheteurDemande.email);
    await prisma.outboundEmail.delete({ where: { dedupeKey: `proposal:${proposition.id}` } });
    await prisma.notification.deleteMany({ where: { userId: acheteurDemande.id, type: "MATCH", title: { contains: "proposé" } } });

    await acheterJusquALaVente(ANNONCE_DEMANDE, acheteurDemande, true);
  });
});
