/**
 * Le dépôt de garantie, de son versement à son sort, sur la vraie base D1.
 *
 * Le dépôt est ce qui rend l'engagement réciproque : le cédant ouvre ses
 * pièces et cesse de chercher d'autres repreneurs, l'acquéreur met une somme
 * en jeu. Les deux règles qui comptent sont donc celles des deux issues, et
 * c'est ce que ce test tient : déduit du prix si la cession aboutit, acquis au
 * cédant si l'acquéreur se retire.
 *
 * Prérequis : `npm run db:migrate && npm run db:seed`.
 */
import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import { DealStage, OfferStatus } from "@prisma/client";
import { prisma } from "@/lib/prisma";
// Importés directement : l'alias de vitest ne vaut pas pour tsc.
import { disposePlatformProxy } from "./setup/prisma-test";
import { connecterUtilisateur } from "./setup/auth-stub";
import { submitOfferAction, withdrawOfferAction } from "@/app/actions/offers";
import { closeDealAction } from "@/app/actions/deals";

const LISTING = "lst_03"; // fenêtre d'offres encore ouverte
let acheteur: string;
let depotCree = false;
let offreCreee: string | null = null;

function form(champs: Record<string, string>): FormData {
  const data = new FormData();
  for (const [c, v] of Object.entries(champs)) data.set(c, v);
  return data;
}

beforeAll(async () => {
  const listing = await prisma.listing.findUnique({
    where: { id: LISTING },
    select: { portfolio: { select: { firmId: true } } },
  });
  if (!listing) throw new Error("Annonce lst_03 absente. Lancez npm run db:seed.");

  const candidat = await prisma.user.findFirst({
    where: {
      role: { in: ["BUYER", "BOTH"] },
      oriasVerifiedAt: { not: null },
      erasedAt: null,
      firmId: { not: listing.portfolio.firmId },
      subscriptions: { some: { status: "ACTIVE", plan: "GROWTH" } },
      offers: { none: { listingId: LISTING } },
      deposits: { none: { listingId: LISTING } },
    },
    select: { id: true },
  });
  if (!candidat) throw new Error("Aucun acquéreur abonné disponible pour lst_03.");
  acheteur = candidat.id;
});

beforeEach(() => connecterUtilisateur(acheteur));

afterAll(async () => {
  connecterUtilisateur(null);
  if (offreCreee) await prisma.offer.delete({ where: { id: offreCreee } }).catch(() => undefined);
  if (depotCree) {
    await prisma.interestDeposit
      .delete({ where: { listingId_buyerId: { listingId: LISTING, buyerId: acheteur } } })
      .catch(() => undefined);
  }
  await disposePlatformProxy();
});

describe("aucune offre sans engagement", () => {
  it("refuse l’offre tant que le dépôt n’est pas versé", async () => {
    const resultat = await submitOfferAction(
      {},
      form({
        listingId: LISTING,
        amount: "40000",
        upfrontPercent: "70",
        message: "Je souhaite me positionner sur ce dossier.",
      }),
    );
    expect(resultat.error).toContain("dépôt de garantie");
    const offres = await prisma.offer.count({ where: { listingId: LISTING, buyerId: acheteur } });
    expect(offres).toBe(0);
  });

  it("accepte l’offre une fois le dépôt en place", async () => {
    await prisma.interestDeposit.create({
      data: { listingId: LISTING, buyerId: acheteur, amount: "1000.00", rate: "0.0250" },
    });
    depotCree = true;

    // L'action se termine par une redirection vers l'annonce : c'est son succès.
    await expect(
      submitOfferAction(
        {},
        form({
          listingId: LISTING,
          amount: "40000",
          upfrontPercent: "70",
          message: "Je souhaite me positionner sur ce dossier.",
        }),
      ),
    ).rejects.toThrow(/NEXT_REDIRECT/);

    const offre = await prisma.offer.findUnique({
      where: { listingId_buyerId: { listingId: LISTING, buyerId: acheteur } },
      select: { id: true, status: true },
    });
    expect(offre?.status).toBe(OfferStatus.SUBMITTED);
    offreCreee = offre!.id;
  });
});

describe("le sort du dépôt", () => {
  it("reste en attente tant que rien n’est tranché", async () => {
    const depot = await prisma.interestDeposit.findUnique({
      where: { listingId_buyerId: { listingId: LISTING, buyerId: acheteur } },
      select: { outcome: true, settledAt: true },
    });
    expect(depot?.outcome).toBe("PENDING");
    expect(depot?.settledAt).toBeNull();
  });

  it("reste acquis au cédant quand l’acquéreur retire son offre", async () => {
    const resultat = await withdrawOfferAction({}, form({ offerId: offreCreee! }));
    expect(resultat.error).toBeUndefined();

    const depot = await prisma.interestDeposit.findUnique({
      where: { listingId_buyerId: { listingId: LISTING, buyerId: acheteur } },
      select: { outcome: true, settledAt: true },
    });
    expect(depot?.outcome).toBe("RETAINED");
    expect(depot?.settledAt).not.toBeNull();
  });
});

describe("la clôture impute le dépôt sur le prix", () => {
  it("passe le dépôt en déduction quand la cession aboutit", async () => {
    // Dossier de démonstration déjà clos : on rejoue la clôture depuis
    // l'étape de vérification, avec un dépôt en attente.
    const deal = await prisma.deal.findUnique({
      where: { id: "deal_closed" },
      select: { id: true, listingId: true, buyerId: true, sellerId: true, stage: true },
    });
    if (!deal) throw new Error("Dossier deal_closed absent. Lancez npm run db:seed.");

    const existant = await prisma.interestDeposit.findUnique({
      where: { listingId_buyerId: { listingId: deal.listingId, buyerId: deal.buyerId } },
    });
    if (!existant) {
      await prisma.interestDeposit.create({
        data: {
          listingId: deal.listingId,
          buyerId: deal.buyerId,
          amount: "900.00",
          rate: "0.0250",
        },
      });
    } else {
      await prisma.interestDeposit.update({
        where: { id: existant.id },
        data: { outcome: "PENDING", settledAt: null },
      });
    }

    await prisma.deal.update({ where: { id: deal.id }, data: { stage: DealStage.RETENTION } });
    connecterUtilisateur(deal.sellerId);
    const resultat = await closeDealAction({}, form({ dealId: deal.id }));
    expect(resultat.error).toBeUndefined();

    const depot = await prisma.interestDeposit.findUnique({
      where: { listingId_buyerId: { listingId: deal.listingId, buyerId: deal.buyerId } },
      select: { outcome: true },
    });
    expect(depot?.outcome).toBe("DEDUCTED");

    // Le dossier de démonstration retrouve son étape.
    await prisma.deal.update({ where: { id: deal.id }, data: { stage: deal.stage } });
    if (!existant) {
      await prisma.interestDeposit
        .delete({
          where: { listingId_buyerId: { listingId: deal.listingId, buyerId: deal.buyerId } },
        })
        .catch(() => undefined);
    } else {
      await prisma.interestDeposit.update({
        where: { id: existant.id },
        data: { outcome: existant.outcome, settledAt: existant.settledAt },
      });
    }
  });
});
