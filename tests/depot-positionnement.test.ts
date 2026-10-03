/**
 * Le dépôt de positionnement, de son versement à son sort, sur la vraie base D1.
 *
 * C'est le cœur du modèle : l'acquéreur ne propose pas de prix, il verse
 * 2,5 % du montant de l'annonce dans un trust. Ce versement lance la
 * procédure de cession et lui ouvre le nom du cabinet cédant. Le test tient
 * les trois règles : les prérequis avant de verser, le montant exact, et
 * l'imputation du dépôt sur le prix à la clôture.
 *
 * Prérequis : `npm run db:migrate && npm run db:seed`.
 */
import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import { DealStage } from "@prisma/client";
import { prisma } from "@/lib/prisma";
// Importés directement : l'alias de vitest ne vaut pas pour tsc.
import { disposePlatformProxy } from "./setup/prisma-test";
import { connecterUtilisateur } from "./setup/auth-stub";
import { submitOfferAction } from "@/app/actions/offers";
import { placeInterestDepositAction } from "@/app/actions/deposits";
import { INTEREST_DEPOSIT_RATE, interestDepositFor } from "@/lib/billing/rates";
import { confirmCarrierTransferAction } from "@/app/actions/deal-process";
import { declarerFinancement, restaurer, sauvegarder, signerEngagements } from "./setup/engagements";

const LISTING = "lst_03"; // fenêtre d'offres encore ouverte
let acheteur: string;
let depotCree = false;
let statutInitial: string | null = null;
let sauvegarde: Awaited<ReturnType<typeof sauvegarder>>;

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
      // L'accès au marché est requis avant de verser : on prend un abonné.
      subscriptions: { some: { status: "ACTIVE", plan: "GROWTH" } },
      offers: { none: { listingId: LISTING } },
      deposits: { none: { listingId: LISTING } },
    },
    select: { id: true },
  });
  if (!candidat) throw new Error("Aucun acquéreur abonné disponible pour lst_03.");
  acheteur = candidat.id;
  statutInitial = (await prisma.listing.findUniqueOrThrow({ where: { id: LISTING }, select: { status: true } })).status;
  sauvegarde = await sauvegarder([acheteur]);
});

beforeEach(() => connecterUtilisateur(acheteur));

afterAll(async () => {
  connecterUtilisateur(null);
  if (depotCree) {
    await prisma.interestDeposit
      .delete({ where: { listingId_buyerId: { listingId: LISTING, buyerId: acheteur } } })
      .catch(() => undefined);
    await prisma.dealSignoff
      .deleteMany({ where: { deal: { listingId: LISTING, buyerId: acheteur } } })
      .catch(() => undefined);
    await prisma.deal
      .deleteMany({ where: { listingId: LISTING, buyerId: acheteur } })
      .catch(() => undefined);
    await prisma.buyerPosition
      .deleteMany({ where: { listingId: LISTING, buyerId: acheteur } })
      .catch(() => undefined);
  }
  if (statutInitial) {
    await prisma.listing
      .update({ where: { id: LISTING }, data: { status: statutInitial as never } })
      .catch(() => undefined);
  }
  await restaurer(sauvegarde);
  await disposePlatformProxy();
});

describe("le dépôt de positionnement", () => {
  it("refuse tant que les engagements ne sont pas signés", async () => {
    const resultat = await placeInterestDepositAction({}, form({ listingId: LISTING, paymentMethod: "CARD" }));
    expect(resultat.error).toContain("engagements");
    expect(await prisma.interestDeposit.count({ where: { listingId: LISTING, buyerId: acheteur } })).toBe(0);
  });

  it("refuse tant que la capacité financière n’est pas justifiée", async () => {
    await signerEngagements(acheteur);
    await prisma.user.update({
      where: { id: acheteur },
      data: { financialCapacityEur: null, financialCapacityStatus: "NONE", financialCapacityAt: null },
    });
    connecterUtilisateur(acheteur);
    const resultat = await placeInterestDepositAction({}, form({ listingId: LISTING, paymentMethod: "CARD" }));
    expect(resultat.error).toBeDefined();
    expect(await prisma.interestDeposit.count({ where: { listingId: LISTING, buyerId: acheteur } })).toBe(0);
  });

  it("enregistre le dépôt de 2,5 % et prend la position", async () => {
    await declarerFinancement(acheteur, 500_000);
    connecterUtilisateur(acheteur);
    const resultat = await placeInterestDepositAction({}, form({ listingId: LISTING, paymentMethod: "CARD" }));
    expect(resultat.error).toBeUndefined();
    expect(resultat.placed).toBe(true);
    depotCree = true;

    const annonce = await prisma.listing.findUniqueOrThrow({ where: { id: LISTING }, select: { askingPrice: true } });
    const depot = await prisma.interestDeposit.findUniqueOrThrow({
      where: { listingId_buyerId: { listingId: LISTING, buyerId: acheteur } },
      select: { amount: true, rate: true, outcome: true },
    });
    expect(Number(depot.rate)).toBe(INTEREST_DEPOSIT_RATE);
    expect(Number(depot.amount)).toBe(interestDepositFor(Number(annonce.askingPrice)));
    expect(depot.outcome).toBe("PENDING");
    expect(await prisma.buyerPosition.count({ where: { listingId: LISTING, buyerId: acheteur } })).toBe(1);

    // Le dépôt lance la procédure : le dossier de cession existe, l'annonce quitte le marché.
    const dossier = await prisma.deal.findUniqueOrThrow({
      where: { listingId_buyerId: { listingId: LISTING, buyerId: acheteur } },
      select: { stage: true, agreedPrice: true },
    });
    expect(dossier.stage).toBe(DealStage.DATA_ROOM);
    expect(Number(dossier.agreedPrice)).toBe(Number(annonce.askingPrice));
    expect((await prisma.listing.findUniqueOrThrow({ where: { id: LISTING }, select: { status: true } })).status).toBe(
      "UNDER_NEGOTIATION",
    );
  });

  it("refuse toute proposition de prix : le montant est celui de l’annonce", async () => {
    const resultat = await submitOfferAction({}, form({ listingId: LISTING, amount: "40000", paymentMethod: "CARD" }));
    expect(resultat.error).toContain("montant est celui de l’annonce");
    expect(await prisma.offer.count({ where: { listingId: LISTING, buyerId: acheteur } })).toBe(0);
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

    // La clôture suit l'accord des compagnies, confirmé par l'acquéreur : le séquestre est libéré.
    await prisma.deal.update({ where: { id: deal.id }, data: { stage: DealStage.TRANSFER, escrowStage: "FUNDS_HELD" } });
    await prisma.dealSignoff.create({ data: { dealId: deal.id, kind: "ATTESTATIONS_SENT", userId: deal.sellerId } });
    connecterUtilisateur(deal.buyerId);
    const resultat = await confirmCarrierTransferAction({}, form({ dealId: deal.id, consent: "on" }));
    expect(resultat.error).toBeUndefined();
    expect((await prisma.deal.findUniqueOrThrow({ where: { id: deal.id }, select: { stage: true } })).stage).toBe(DealStage.CLOSED);
    await prisma.dealSignoff.deleteMany({ where: { dealId: deal.id, kind: { in: ["ATTESTATIONS_SENT", "TRANSFER_CONFIRMED"] } } });

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
