/**
 * Cession par lots, sur la vraie base D1 locale.
 *
 * Un portefeuille ne se vend pas toujours d'un bloc : l'acquéreur qui a déjà un
 * code chez un assureur veut souvent le livre d'un autre. Le découpage se fait
 * par fournisseur parce que c'est lui qui détient le code de courtage et signe
 * l'attestation de transfert — un lot par branche ne serait transférable par
 * personne.
 *
 * Ce que ce test protège tient en une phrase : un fournisseur ne se cède
 * qu'une fois, et tant qu'il en reste un de libre l'annonce reste au marché.
 *
 * Prérequis : `npm run db:migrate && npm run db:seed`.
 */
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { ListingStatus, OfferStatus } from "@prisma/client";
import { prisma } from "@/lib/prisma";
// Importés directement : l'alias de vitest ne vaut pas pour tsc.
import { disposePlatformProxy } from "./setup/prisma-test";
import { connecterUtilisateur } from "./setup/auth-stub";
import { acceptOfferAction } from "@/app/actions/offers";
import { listingLots, lotAvailability, readCarriers } from "@/lib/listing/lot-availability";

const LISTING = "lst_05";

let cedant: string;
let acheteurs: string[] = [];
let offresInitiales: { id: string; status: OfferStatus; carriers: unknown }[] = [];
let statutInitial: ListingStatus;
let quota: { id: string; dealQuota: number | null; dealsUsed: number } | null = null;
const dossiersCrees: string[] = [];
const offresCreees: string[] = [];

function form(champs: Record<string, string | string[]>): FormData {
  const data = new FormData();
  for (const [cle, valeur] of Object.entries(champs)) {
    if (Array.isArray(valeur)) valeur.forEach((v) => data.append(cle, v));
    else data.set(cle, valeur);
  }
  return data;
}

beforeAll(async () => {
  const listing = await prisma.listing.findUnique({
    where: { id: LISTING },
    select: {
      status: true,
      portfolio: { select: { firm: { select: { users: { select: { id: true } } } } } },
    },
  });
  if (!listing) throw new Error("Annonce lst_05 absente. Lancez npm run db:seed.");
  statutInitial = listing.status;
  cedant = listing.portfolio.firm.users[0]!.id;

  offresInitiales = await prisma.offer.findMany({
    where: { listingId: LISTING },
    select: { id: true, status: true, carriers: true },
  });

  // Deux acquéreurs distincts, étrangers au cabinet cédant.
  const candidats = await prisma.user.findMany({
    where: {
      role: { in: ["BUYER", "BOTH"] },
      oriasVerifiedAt: { not: null },
      erasedAt: null,
      id: { not: cedant },
    },
    select: { id: true },
    take: 4,
  });
  acheteurs = candidats.map((u) => u.id);
  if (acheteurs.length < 2) throw new Error("Deux acquéreurs vérifiés sont nécessaires.");

  /*
   * Le forfait du cédant plafonne le nombre de dossiers. Ce plafond est réel et
   * testé ailleurs ; ici il masquerait ce qu'on veut observer — deux cessions
   * sur une même annonce. On l'ouvre le temps du test, et on le remet après.
   */
  const abonnement = await prisma.subscription.findFirst({
    where: { userId: cedant, status: "ACTIVE" },
    select: { id: true, dealQuota: true, dealsUsed: true },
  });
  if (abonnement) {
    quota = abonnement;
    await prisma.subscription.update({
      where: { id: abonnement.id },
      data: { dealQuota: null },
    });
  }
});

afterAll(async () => {
  connecterUtilisateur(null);
  for (const id of dossiersCrees) {
    await prisma.dueDiligenceItem.deleteMany({ where: { dealId: id } });
    await prisma.document.deleteMany({ where: { dealId: id } });
    await prisma.deal.delete({ where: { id } }).catch(() => undefined);
  }
  for (const id of offresCreees) {
    await prisma.offer.delete({ where: { id } }).catch(() => undefined);
  }
  for (const offre of offresInitiales) {
    await prisma.offer.update({
      where: { id: offre.id },
      data: { status: offre.status, carriers: offre.carriers as never },
    });
  }
  await prisma.listing.update({ where: { id: LISTING }, data: { status: statutInitial } });
  if (quota) {
    // `dealsUsed` aussi : chaque acceptation l'incrémente, et le laisser gonflé
    // épuiserait le forfait du cédant pour les tests suivants.
    await prisma.subscription.update({
      where: { id: quota.id },
      data: { dealQuota: quota.dealQuota, dealsUsed: quota.dealsUsed },
    });
  }
  await disposePlatformProxy();
});

/** Dépose une offre directement : le dépôt par l'action est couvert ailleurs. */
async function deposerOffre(buyerId: string, carriers: string[], montant: number) {
  const offre = await prisma.offer.upsert({
    where: { listingId_buyerId: { listingId: LISTING, buyerId } },
    update: {
      amount: montant.toFixed(2),
      upfrontPercent: "70.00",
      message: "Offre de test sur lot.",
      carriers,
      status: OfferStatus.SUBMITTED,
    },
    create: {
      listingId: LISTING,
      buyerId,
      amount: montant.toFixed(2),
      upfrontPercent: "70.00",
      message: "Offre de test sur lot.",
      carriers,
    },
  });
  if (!offresInitiales.some((o) => o.id === offre.id) && !offresCreees.includes(offre.id)) {
    offresCreees.push(offre.id);
  }
  return offre;
}

describe("découpage d’un portefeuille réel", () => {
  it("décompose le portefeuille en lots par fournisseur", async () => {
    const lots = await listingLots(LISTING);
    expect(lots.length).toBeGreaterThan(1);
    // Le plus gros lot vient en tête : c'est ce que l'acquéreur doit voir d'abord.
    expect(lots[0].annualCommission).toBeGreaterThanOrEqual(lots[1].annualCommission);
    const somme = lots.reduce((t, l) => t + l.share, 0);
    expect(somme).toBeCloseTo(1, 6);
  });

  it("déclare tout libre tant qu’aucun dossier n’existe", async () => {
    const dispo = await lotAvailability(LISTING);
    expect(dispo.exhausted).toBe(false);
    expect(dispo.available.length).toBe(dispo.lots.length);
  });
});

describe("deux acquéreurs, deux lots disjoints", () => {
  it("ouvre deux cessions et laisse l’annonce au marché", async () => {
    const lots = await listingLots(LISTING);
    const premier = [lots[0].carrier];
    const second = [lots[1].carrier];

    // Toutes les offres du catalogue sont écartées : le test ne garde que les siennes.
    await prisma.offer.updateMany({
      where: { listingId: LISTING, status: OfferStatus.SUBMITTED },
      data: { status: OfferStatus.DECLINED },
    });

    const offreA = await deposerOffre(acheteurs[0], premier, 30_000);
    connecterUtilisateur(cedant);
    await expect(acceptOfferAction({}, form({ offerId: offreA.id }))).rejects.toThrow(/dossiers/);

    const dealA = await prisma.deal.findUnique({
      where: { listingId_buyerId: { listingId: LISTING, buyerId: acheteurs[0] } },
      select: { id: true, carriers: true },
    });
    expect(dealA).not.toBeNull();
    dossiersCrees.push(dealA!.id);
    expect(readCarriers(dealA!.carriers)).toEqual(premier);

    // Le reste du portefeuille est encore disponible.
    const apresA = await lotAvailability(LISTING);
    expect(apresA.available).not.toContain(premier[0]);
    expect(apresA.available).toContain(second[0]);
    expect(apresA.exhausted).toBe(false);

    // L'annonce n'a pas quitté le marché : il reste des fournisseurs à céder.
    const listingApresA = await prisma.listing.findUnique({
      where: { id: LISTING },
      select: { status: true },
    });
    expect(listingApresA?.status).not.toBe(ListingStatus.UNDER_NEGOTIATION);

    // Second acquéreur, sur un lot qui ne recoupe pas le premier.
    const offreB = await deposerOffre(acheteurs[1], second, 4_000);
    connecterUtilisateur(cedant);
    await expect(acceptOfferAction({}, form({ offerId: offreB.id }))).rejects.toThrow(/dossiers/);

    const dealB = await prisma.deal.findUnique({
      where: { listingId_buyerId: { listingId: LISTING, buyerId: acheteurs[1] } },
      select: { id: true, carriers: true },
    });
    expect(dealB).not.toBeNull();
    dossiersCrees.push(dealB!.id);
    expect(readCarriers(dealB!.carriers)).toEqual(second);

    // Les deux cessions coexistent sur la même annonce.
    const dossiers = await prisma.deal.count({ where: { listingId: LISTING } });
    expect(dossiers).toBe(2);
  });
});

describe("un fournisseur ne se cède qu’une fois", () => {
  it("refuse une offre qui recoupe un lot déjà engagé", async () => {
    const { available, lots } = await lotAvailability(LISTING);
    const dejaCede = lots.map((l) => l.carrier).find((c) => !available.includes(c));
    expect(dejaCede).toBeTruthy();

    const { checkOfferLot } = await import("@/lib/listing/lot-availability");
    const verdict = await checkOfferLot(LISTING, [dejaCede!]);
    expect(verdict.ok).toBe(false);
  });

  it("refuse le portefeuille entier dès qu’un lot est pris", async () => {
    // Une demande vide vaut « tout le portefeuille » : elle doit tomber aussi.
    const { checkOfferLot } = await import("@/lib/listing/lot-availability");
    const verdict = await checkOfferLot(LISTING, []);
    expect(verdict.ok).toBe(false);
  });

  it("accepte encore un fournisseur resté libre", async () => {
    const { available } = await lotAvailability(LISTING);
    expect(available.length).toBeGreaterThan(0);
    const { checkOfferLot } = await import("@/lib/listing/lot-availability");
    const verdict = await checkOfferLot(LISTING, [available[0]]);
    expect(verdict.ok).toBe(true);
  });
});
