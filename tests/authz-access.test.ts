/**
 * Tests d'acces sur la vraie base D1 locale.
 *
 * Ils repondent a la regle metier 3 de CLAUDE.md : les droits s'appliquent au
 * niveau des requetes, et un utilisateur qui devine un identifiant n'obtient
 * rien. Les tests unitaires ne couvraient que les predicats purs.
 *
 * Prerequis : `npm run db:migrate && npm run db:seed`.
 */
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { prisma } from "@/lib/prisma";
// Importe directement : l'alias de vitest ne vaut pas pour tsc.
import { disposePlatformProxy } from "./setup/prisma-test";
import type { Actor } from "@/lib/authz/actor";
import { getListingByPublicNumber, findMyListing } from "@/lib/authz/listings";
import { listOffersForListing } from "@/lib/authz/offers";
import { findMyDeal } from "@/lib/authz/deals";
import { getMyPortfolio } from "@/lib/authz/portfolios";
import { listListingMessages } from "@/lib/authz/messages";
import { listAllInvestorPositions, listMyInvestorPositions } from "@/lib/investor/positions";
import {
  listCertificationRequests,
  listInvestorInquiries,
} from "@/lib/authz/admin";
import { ForbiddenError } from "@/lib/authz/errors";

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

let marie: Actor;
let julien: Actor;
let nadia: Actor;
let claire: Actor;
let buyer: Actor;

beforeAll(async () => {
  marie = await actorByEmail("marie.lefort@parisienne-courtage.demo");
  julien = await actorByEmail("julien.bernard@rhone-assurances.demo");
  nadia = await actorByEmail("nadia.khelifi@mediterranee-courtage.demo");
  claire = await actorByEmail("claire.dubois@nord-assur-pro.demo");
  buyer = await actorByEmail("acquisition@expansion-idf.demo");
});

afterAll(async () => {
  await disposePlatformProxy();
});

describe("annonces : identifiant devine", () => {
  // 10001 est le brouillon de Marie, 10010 une annonce retiree de Paul Riviere.
  it("Julien n'atteint pas le brouillon de Marie en devinant son numero public", async () => {
    const listing = await getListingByPublicNumber(10001, julien);
    expect(listing).toBeNull();
  });

  it("un visiteur sans session n'atteint pas ce brouillon", async () => {
    const listing = await getListingByPublicNumber(10001, null);
    expect(listing).toBeNull();
  });

  it("une annonce retiree n'est pas rattrapable par son numero", async () => {
    expect(await getListingByPublicNumber(10010, null)).toBeNull();
    expect(await getListingByPublicNumber(10010, marie)).toBeNull();
  });

  it("Marie atteint bien son propre brouillon", async () => {
    const listing = await getListingByPublicNumber(10001, marie);
    expect(listing).not.toBeNull();
    expect(listing?.publicNumber).toBe(10001);
  });

  it("une annonce publiee reste accessible sans session", async () => {
    const listing = await getListingByPublicNumber(10003, null);
    expect(listing).not.toBeNull();
  });

  it("findMyListing refuse l'annonce d'un autre cabinet", async () => {
    const foreign = await prisma.listing.findFirst({ where: { publicNumber: 10001 } });
    expect(foreign).not.toBeNull();
    const stolen = await findMyListing(foreign!.id, julien);
    expect(stolen).toBeNull();
  });
});

describe("portefeuilles : cloisonnement par cabinet", () => {
  it("Marie ne lit pas un portefeuille d'un autre cabinet", async () => {
    const foreign = await prisma.portfolio.findFirst({
      where: { firmId: { not: marie.firmId ?? "" } },
      select: { id: true },
    });
    expect(foreign).not.toBeNull();
    await expect(getMyPortfolio(foreign!.id, marie)).rejects.toThrow();
  });
});

describe("offres scellees : filtrage au niveau de la requete", () => {
  it("le cedant ne recoit aucune ligne tant que la fenetre est ouverte", async () => {
    const listing = await prisma.listing.findFirst({ where: { publicNumber: 10003 } });
    expect(listing).not.toBeNull();

    // Des offres existent bien en base pour ce dossier.
    const stored = await prisma.offer.count({ where: { listingId: listing!.id } });
    expect(stored).toBeGreaterThan(0);

    const result = await listOffersForListing(listing!.id, nadia);
    expect(result.access).toBe("sealed");
    expect(result.offers).toHaveLength(0);
  });

  it("le cedant voit les offres une fois la fenetre close", async () => {
    const listing = await prisma.listing.findFirst({ where: { publicNumber: 10005 } });
    expect(listing).not.toBeNull();
    const result = await listOffersForListing(listing!.id, claire);
    expect(result.access).toBe("full");
    expect(result.offers.length).toBeGreaterThan(0);
  });

  it("un acquereur ne recoit que sa propre offre", async () => {
    const listing = await prisma.listing.findFirst({ where: { publicNumber: 10005 } });
    const result = await listOffersForListing(listing!.id, buyer);
    expect(result.access).toBe("own");
    for (const offer of result.offers) {
      expect(offer.buyerId).toBe(buyer.id);
    }
  });
});

describe("dossiers : acces reserve aux participants", () => {
  it("Marie n'ouvre pas un dossier auquel elle ne participe pas", async () => {
    const deal = await prisma.deal.findFirst({
      where: { sellerId: { not: marie.id }, buyerId: { not: marie.id } },
      select: { id: true },
    });
    expect(deal).not.toBeNull();
    const result = await findMyDeal(deal!.id, marie);
    expect(result).toBeNull();
  });

  it("un participant ouvre bien son dossier", async () => {
    const deal = await prisma.deal.findFirst({ select: { id: true, sellerId: true } });
    const seller = await prisma.user.findUnique({
      where: { id: deal!.sellerId },
      select: {
        id: true, email: true, fullName: true, role: true, firmId: true,
        oriasNumber: true, oriasVerifiedAt: true, kycStatus: true, publicAlias: true,
      },
    });
    const result = await findMyDeal(deal!.id, seller as Actor);
    expect(result).not.toBeNull();
  });
});

describe("messagerie d'annonce", () => {
  it("un tiers sans offre ni dossier ne lit rien", async () => {
    const listing = await prisma.listing.findFirst({ where: { publicNumber: 10005 } });
    const messages = await listListingMessages(listing!.id, marie);
    expect(messages).toHaveLength(0);
  });

  it("aucun message diffuse par un autre acquereur ne remonte", async () => {
    const listing = await prisma.listing.findFirst({ where: { publicNumber: 10005 } });
    const sellerUserId = (
      await prisma.user.findFirst({
        where: { firmId: (await prisma.portfolio.findFirst({
          where: { listings: { some: { id: listing!.id } } },
          select: { firmId: true },
        }))!.firmId, role: { in: ["SELLER", "BOTH"] } },
        select: { id: true },
        orderBy: { createdAt: "asc" },
      })
    )?.id;

    const messages = await listListingMessages(listing!.id, buyer);
    for (const message of messages) {
      const isOwn = message.senderId === buyer.id;
      const isAddressed = message.recipientId === buyer.id;
      const isSellerBroadcast = message.recipientId === null && message.senderId === sellerUserId;
      expect(isOwn || isAddressed || isSellerBroadcast).toBe(true);
    }
  });
});

describe("acceptation d'offre : reprise apres echec partiel (D1 sans transaction)", () => {
  it("la contrainte unique interdit deux dossiers pour le meme couple annonce/acquereur", async () => {
    const deal = await prisma.deal.findFirst({
      select: { listingId: true, buyerId: true, sellerId: true, agreedPrice: true },
    });
    expect(deal).not.toBeNull();

    // Rejouer la creation doit echouer sur la contrainte, jamais creer un doublon.
    await expect(
      prisma.deal.create({
        data: {
          listingId: deal!.listingId,
          buyerId: deal!.buyerId,
          sellerId: deal!.sellerId,
          agreedPrice: deal!.agreedPrice,
          upfrontAmount: "0",
          deferredAmount: "0",
          stage: "NDA",
          sellerAlias: "Cedant #T",
          buyerAlias: "Acquereur #T",
        },
      }),
    ).rejects.toThrow();

    const count = await prisma.deal.count({
      where: { listingId: deal!.listingId, buyerId: deal!.buyerId },
    });
    expect(count).toBe(1);
  });

  it("upsert sur la meme cle renvoie le dossier existant sans en creer un second", async () => {
    const deal = await prisma.deal.findFirst({ select: { id: true, listingId: true, buyerId: true } });
    const before = await prisma.deal.count();

    const again = await prisma.deal.upsert({
      where: { listingId_buyerId: { listingId: deal!.listingId, buyerId: deal!.buyerId } },
      update: {},
      create: {
        listingId: deal!.listingId,
        buyerId: deal!.buyerId,
        sellerId: deal!.buyerId,
        agreedPrice: "1",
        upfrontAmount: "0",
        deferredAmount: "0",
        stage: "NDA",
        sellerAlias: "x",
        buyerAlias: "y",
      },
    });

    expect(again.id).toBe(deal!.id);
    expect(await prisma.deal.count()).toBe(before);
  });
});

describe("administration : gardes au niveau requête", () => {
  it("Marie ne lit ni les demandes investisseurs ni les certifications", async () => {
    await expect(listInvestorInquiries(marie)).rejects.toBeInstanceOf(ForbiddenError);
    await expect(listCertificationRequests(marie)).rejects.toBeInstanceOf(ForbiddenError);
  });

  it("Marie ne lit pas les dossiers suivis par les investisseurs", async () => {
    await expect(listMyInvestorPositions(marie)).rejects.toBeInstanceOf(ForbiddenError);
    await expect(listAllInvestorPositions(marie)).rejects.toBeInstanceOf(ForbiddenError);
  });

  it("l'investisseur démo lit sa liste, vide ou non", async () => {
    const investor = await actorByEmail("investisseur@cession-courtage.demo");
    const rows = await listMyInvestorPositions(investor);
    expect(Array.isArray(rows)).toBe(true);
  });

  it("l'administrateur lit les listes", async () => {
    const admin = await actorByEmail("admin@cession-courtage.demo");
    const inquiries = await listInvestorInquiries(admin);
    const certifications = await listCertificationRequests(admin);
    expect(Array.isArray(inquiries)).toBe(true);
    expect(Array.isArray(certifications)).toBe(true);
  });
});
