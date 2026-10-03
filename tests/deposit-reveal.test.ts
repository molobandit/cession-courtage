/**
 * Le depot d'interet de 2,5 % leve l'anonymat, sur la vraie base D1 locale.
 *
 * Regle metier : l'acquereur qui depose obtient les coordonnees du cedant sans
 * attendre la LOI. Les tests unitaires ne couvrent que le predicat pur, celui-ci
 * verifie la chaine complete, requete comprise.
 *
 * Prerequis : `npm run db:migrate && npm run db:seed`.
 */
import { afterAll, afterEach, beforeAll, describe, expect, it } from "vitest";
import { prisma } from "@/lib/prisma";
// Importe directement : l'alias de vitest ne vaut pas pour tsc.
import { disposePlatformProxy } from "./setup/prisma-test";
import type { Actor } from "@/lib/authz/actor";
import { findMyDeal } from "@/lib/authz/deals";
import { INTEREST_DEPOSIT_RATE, interestDepositFor } from "@/lib/billing/rates";

async function actorById(id: string): Promise<Actor> {
  const user = await prisma.user.findUnique({
    where: { id },
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
  if (!user) throw new Error(`Compte absent : ${id}. Lancez npm run db:seed.`);
  return user as Actor;
}

let buyer: Actor;
let listingId: string;
let askingPrice: number;

beforeAll(async () => {
  const deal = await prisma.deal.findUnique({
    where: { id: "deal_nda" },
    select: { buyerId: true, listingId: true, listing: { select: { askingPrice: true } } },
  });
  if (!deal) throw new Error("Dossier deal_nda absent. Lancez npm run db:seed.");
  buyer = await actorById(deal.buyerId);
  listingId = deal.listingId;
  askingPrice = Number(deal.listing.askingPrice);
});

afterEach(async () => {
  // Le depot est un effet de bord : chaque test repart d'une base propre.
  await prisma.interestDeposit.deleteMany({ where: { listingId, buyerId: buyer.id } });
});

afterAll(async () => {
  await disposePlatformProxy();
});

async function placeDeposit() {
  const amount = interestDepositFor(askingPrice);
  await prisma.interestDeposit.create({
    data: {
      listingId,
      buyerId: buyer.id,
      amount: amount.toFixed(2),
      rate: INTEREST_DEPOSIT_RATE.toFixed(4),
    },
  });
  return amount;
}

describe("depot d'interet et levee d'anonymat", () => {
  it("revele les deux cabinets des l'ouverture du dossier", async () => {
    // Pas de depot : c'est le dossier lui-meme qui ouvre les identites.
    const deal = await findMyDeal("deal_nda", buyer);
    expect(deal).not.toBeNull();
    expect(deal!.stage).toBe("NDA");
    expect(deal!.identitiesRevealed).toBe(true);
    expect(deal!.seller.kind).toBe("identified");
    expect(JSON.stringify(deal!.seller)).toMatch(/@/);
  });

  it("calcule le depot a 2,5 % du montant de l'annonce", async () => {
    const amount = await placeDeposit();
    const row = await prisma.interestDeposit.findUnique({
      where: { listingId_buyerId: { listingId, buyerId: buyer.id } },
      select: { amount: true, rate: true },
    });
    expect(row).not.toBeNull();
    // Le montant est arrondi au centime : 2,5 % de 54 425 euros vaut 1 360,625,
    // stocke 1 360,63. C'est le contrat, un euro ne se divise pas plus fin.
    const attendu = Math.round(askingPrice * 0.025 * 100) / 100;
    expect(Number(row!.amount)).toBe(attendu);
    expect(Number(row!.amount)).toBe(amount);
    expect(Number(row!.rate)).toBeCloseTo(0.025, 4);
  });

  it("ne cree jamais de doublon si le depot est rejoue", async () => {
    await placeDeposit();
    // D1 n'a pas de transactions : l'unicite du couple est la seule protection.
    await expect(placeDeposit()).rejects.toThrow();
    const count = await prisma.interestDeposit.count({
      where: { listingId, buyerId: buyer.id },
    });
    expect(count).toBe(1);
  });

  it("n'ouvre un dossier qu'a ses deux parties", async () => {
    await placeDeposit();
    // Le depot d'un candidat ne donne aucun acces au dossier d'un autre acquereur.
    const autre = await findMyDeal("deal_dataroom", buyer);
    expect(autre).toBeNull();
  });
});
