/**
 * Le tunnel de cession de bout en bout, sur la vraie base D1 locale.
 *
 * Les tests unitaires couvrent des morceaux isolés ; celui-ci appelle les
 * actions serveur telles qu'elles sont appelées par les écrans, dans l'ordre,
 * avec la session du cédant ou de l'acquéreur selon l'étape. Ce qui est vérifié
 * n'est donc pas une reconstitution du parcours mais le parcours lui-même :
 * gardes d'ordre, droits de chaque partie, état final de l'annonce.
 *
 * L'enjeu est précis. Chaque étape déplace de l'argent ou ouvre de
 * l'information — la salle de données, les identités, le séquestre. Une garde
 * qui laisse sauter une étape ne casse pas un écran : elle ouvre des pièces à
 * quelqu'un qui n'a rien signé, ou libère un solde avant vérification.
 *
 * Prérequis : `npm run db:migrate && npm run db:seed`.
 */
import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import { DealStage, ListingStatus, OfferStatus } from "@prisma/client";
import { prisma } from "@/lib/prisma";
// Importés directement : l'alias de vitest ne vaut pas pour tsc.
import { disposePlatformProxy } from "./setup/prisma-test";
import { connecterUtilisateur } from "./setup/auth-stub";
import {
  acceptNdaAction,
  closeDealAction,
  confirmSignatureAction,
  confirmTransferAction,
  mockEscrowAction,
  mockKycAction,
  signLoiAction,
  validateDeedAction,
} from "@/app/actions/deals";
import { acceptOfferAction } from "@/app/actions/offers";

const DEAL = "deal_nda";

let sellerId: string;
let buyerId: string;
let listingId: string;
let etatInitial: { stage: DealStage; ndaAcceptedAt: Date | null; listingStatus: ListingStatus };

function form(champs: Record<string, string>): FormData {
  const data = new FormData();
  for (const [cle, valeur] of Object.entries(champs)) data.set(cle, valeur);
  return data;
}

async function etape(): Promise<DealStage> {
  const deal = await prisma.deal.findUnique({ where: { id: DEAL }, select: { stage: true } });
  if (!deal) throw new Error(`Dossier ${DEAL} absent. Lancez npm run db:seed.`);
  return deal.stage;
}

async function poser(stage: DealStage): Promise<void> {
  await prisma.deal.update({ where: { id: DEAL }, data: { stage } });
}

beforeAll(async () => {
  const deal = await prisma.deal.findUnique({
    where: { id: DEAL },
    select: {
      sellerId: true,
      buyerId: true,
      listingId: true,
      stage: true,
      ndaAcceptedAt: true,
      listing: { select: { status: true } },
    },
  });
  if (!deal) throw new Error(`Dossier ${DEAL} absent. Lancez npm run db:seed.`);
  sellerId = deal.sellerId;
  buyerId = deal.buyerId;
  listingId = deal.listingId;
  etatInitial = {
    stage: deal.stage,
    ndaAcceptedAt: deal.ndaAcceptedAt,
    listingStatus: deal.listing.status,
  };
});

beforeEach(() => {
  connecterUtilisateur(sellerId);
});

afterAll(async () => {
  // Le dossier de démonstration retrouve son état d'origine.
  connecterUtilisateur(null);
  await prisma.deal.update({
    where: { id: DEAL },
    data: { stage: etatInitial.stage, ndaAcceptedAt: etatInitial.ndaAcceptedAt },
  });
  await prisma.listing.update({
    where: { id: listingId },
    data: { status: etatInitial.listingStatus },
  });
  await disposePlatformProxy();
});

describe("le tunnel se déroule dans l’ordre, du NDA à la clôture", () => {
  it("va de bout en bout et marque l’annonce cédée", async () => {
    await poser(DealStage.NDA);

    // L'acquéreur signe la confidentialité : la salle de données s'ouvre.
    connecterUtilisateur(buyerId);
    expect(await acceptNdaAction({}, form({ dealId: DEAL }))).toEqual({});
    expect(await etape()).toBe(DealStage.DATA_ROOM);

    // Le cédant mène le reste.
    connecterUtilisateur(sellerId);
    expect(await signLoiAction({}, form({ dealId: DEAL }))).toEqual({});
    expect(await etape()).toBe(DealStage.LOI);

    expect(await mockKycAction({}, form({ dealId: DEAL }))).toEqual({});
    expect(await etape()).toBe(DealStage.KYC);

    expect(await mockKycAction({}, form({ dealId: DEAL }))).toEqual({});
    expect(await etape()).toBe(DealStage.DEED);

    expect(await validateDeedAction({}, form({ dealId: DEAL }))).toEqual({});
    expect(await etape()).toBe(DealStage.SIGNATURE);

    expect(await confirmSignatureAction({}, form({ dealId: DEAL }))).toEqual({});
    expect(await etape()).toBe(DealStage.ESCROW);

    expect(await mockEscrowAction({}, form({ dealId: DEAL, intent: "hold" }))).toEqual({});
    expect(await etape()).toBe(DealStage.TRANSFER);

    expect(await confirmTransferAction({}, form({ dealId: DEAL }))).toEqual({});
    expect(await etape()).toBe(DealStage.RETENTION);

    expect(await closeDealAction({}, form({ dealId: DEAL }))).toEqual({});
    expect(await etape()).toBe(DealStage.CLOSED);

    // La clôture doit retirer l'annonce du marché, pas seulement clore le dossier.
    const listing = await prisma.listing.findUnique({
      where: { id: listingId },
      select: { status: true },
    });
    expect(listing?.status).toBe(ListingStatus.SOLD);
  });
});

describe("aucune étape ne se saute", () => {
  it("refuse de clôturer avant la période de vérification", async () => {
    await poser(DealStage.NDA);
    const resultat = await closeDealAction({}, form({ dealId: DEAL }));
    expect(resultat.error).toBeTruthy();
    expect(await etape()).toBe(DealStage.NDA);
  });

  it("refuse de signer l’acte avant le protocole", async () => {
    await poser(DealStage.DATA_ROOM);
    const resultat = await confirmSignatureAction({}, form({ dealId: DEAL }));
    expect(resultat.error).toBeTruthy();
    expect(await etape()).toBe(DealStage.DATA_ROOM);
  });

  it("refuse la lettre d’intention avant la salle de données", async () => {
    await poser(DealStage.NDA);
    const resultat = await signLoiAction({}, form({ dealId: DEAL }));
    expect(resultat.error).toBeTruthy();
    expect(await etape()).toBe(DealStage.NDA);
  });

  it("refuse le séquestre avant la signature", async () => {
    await poser(DealStage.LOI);
    const resultat = await mockEscrowAction({}, form({ dealId: DEAL, intent: "hold" }));
    expect(await etape()).toBe(DealStage.LOI);
    expect(resultat).toBeDefined();
  });

  it("refuse de rejouer une étape déjà franchie", async () => {
    await poser(DealStage.DATA_ROOM);
    const resultat = await acceptNdaAction({}, form({ dealId: DEAL }));
    expect(resultat.error).toBeTruthy();
    expect(await etape()).toBe(DealStage.DATA_ROOM);
  });
});

describe("le dossier n’est ouvert qu’à ses deux parties", () => {
  it("refuse un tiers, même connecté et vérifié", async () => {
    await poser(DealStage.NDA);
    const tiers = await prisma.user.findFirst({
      where: {
        id: { notIn: [sellerId, buyerId] },
        oriasVerifiedAt: { not: null },
        erasedAt: null,
      },
      select: { id: true },
    });
    if (!tiers) throw new Error("Aucun tiers vérifié en base. Lancez npm run db:seed.");

    connecterUtilisateur(tiers.id);
    const resultat = await acceptNdaAction({}, form({ dealId: DEAL }));
    expect(resultat.error).toBeTruthy();
    expect(await etape()).toBe(DealStage.NDA);
  });

  it("refuse un visiteur anonyme", async () => {
    await poser(DealStage.NDA);
    connecterUtilisateur(null);
    const resultat = await acceptNdaAction({}, form({ dealId: DEAL }));
    expect(resultat.error).toBeTruthy();
    expect(await etape()).toBe(DealStage.NDA);
  });
});

/**
 * L'entrée du tunnel : une offre retenue devient un dossier.
 *
 * C'est le moment où la salle de marché anonyme se transforme en relation
 * nommée. Il porte deux règles qui ne peuvent pas céder : une offre reste
 * scellée tant que la fenêtre court, et seul le cédant retient.
 */
describe("de l’offre retenue au dossier ouvert", () => {
  const LISTING = "lst_05";
  let offresInitiales: { id: string; status: OfferStatus }[] = [];
  let statutListingInitial: ListingStatus;
  let dealCree: string | null = null;
  let quota: { id: string; dealQuota: number | null; dealsUsed: number } | null = null;

  beforeAll(async () => {
    const listing = await prisma.listing.findUnique({
      where: { id: LISTING },
      select: { status: true },
    });
    if (!listing) throw new Error("Annonce lst_05 absente. Lancez npm run db:seed.");
    statutListingInitial = listing.status;
    offresInitiales = await prisma.offer.findMany({
      where: { listingId: LISTING },
      select: { id: true, status: true },
    });

    /*
     * Le forfait du cédant plafonne le nombre de dossiers. Ce plafond est réel
     * et couvert ailleurs ; ici il empêcherait d'observer ce qu'on teste.
     */
    const cedantId = (
      await prisma.listing.findUnique({
        where: { id: LISTING },
        select: { portfolio: { select: { firm: { select: { users: { select: { id: true } } } } } } },
      })
    )?.portfolio.firm.users[0]?.id;
    if (cedantId) {
      const abonnement = await prisma.subscription.findFirst({
        where: { userId: cedantId, status: "ACTIVE" },
        select: { id: true, dealQuota: true, dealsUsed: true },
      });
      if (abonnement) {
        quota = abonnement;
        await prisma.subscription.update({
          where: { id: abonnement.id },
          data: { dealQuota: null },
        });
      }
    }
  });

  afterAll(async () => {
    // Le catalogue de démonstration retrouve son état.
    if (dealCree) {
      await prisma.dueDiligenceItem.deleteMany({ where: { dealId: dealCree } });
      await prisma.document.deleteMany({ where: { dealId: dealCree } });
      await prisma.deal.delete({ where: { id: dealCree } });
    }
    for (const offre of offresInitiales) {
      await prisma.offer.update({ where: { id: offre.id }, data: { status: offre.status } });
    }
    await prisma.listing.update({
      where: { id: LISTING },
      data: { status: statutListingInitial },
    });
    if (quota) {
      await prisma.subscription.update({
        where: { id: quota.id },
        data: { dealQuota: quota.dealQuota, dealsUsed: quota.dealsUsed },
      });
    }
  });

  it("refuse un tiers : seul le cédant retient une offre", async () => {
    const offre = await prisma.offer.findFirst({
      where: { listingId: LISTING, status: "SUBMITTED" },
      select: { id: true, buyerId: true },
    });
    if (!offre) throw new Error("Aucune offre soumise sur lst_05.");

    connecterUtilisateur(offre.buyerId);
    const resultat = await acceptOfferAction({}, form({ offerId: offre.id }));
    expect(resultat.error).toBe("Seul le cédant peut retenir une offre.");
  });

  it("refuse tant que la fenêtre de vingt et un jours court encore", async () => {
    // lst_03 : fenêtre ouverte. Les offres y sont scellées, y compris pour le
    // cédant — c'est la règle qui empêche de choisir en connaissant les autres.
    const offre = await prisma.offer.findFirst({
      where: { listingId: "lst_03", status: "SUBMITTED" },
      select: { id: true, listing: { select: { portfolio: { select: { firm: { select: { users: { select: { id: true } } } } } } } } },
    });
    if (!offre) throw new Error("Aucune offre soumise sur lst_03.");
    const cedant = offre.listing.portfolio.firm.users[0]?.id;
    if (!cedant) throw new Error("Cédant de lst_03 introuvable.");

    connecterUtilisateur(cedant);
    const resultat = await acceptOfferAction({}, form({ offerId: offre.id }));
    expect(resultat.error).toContain("scellées");
  });

  it("ouvre le dossier, écarte les autres offres et met l’annonce en négociation", async () => {
    const offre = await prisma.offer.findFirst({
      where: { listingId: LISTING, status: "SUBMITTED" },
      select: {
        id: true,
        buyerId: true,
        listing: { select: { portfolio: { select: { firm: { select: { users: { select: { id: true } } } } } } } },
      },
    });
    if (!offre) throw new Error("Aucune offre soumise sur lst_05.");
    const cedant = offre.listing.portfolio.firm.users[0]?.id;
    if (!cedant) throw new Error("Cédant de lst_05 introuvable.");

    connecterUtilisateur(cedant);
    // L'action se termine par une redirection vers le dossier : c'est son succès.
    await expect(acceptOfferAction({}, form({ offerId: offre.id }))).rejects.toThrow(/dossiers/);

    const deal = await prisma.deal.findUnique({
      where: { listingId_buyerId: { listingId: LISTING, buyerId: offre.buyerId } },
      select: { id: true, stage: true, sellerId: true },
    });
    expect(deal).not.toBeNull();
    dealCree = deal!.id;
    expect(deal!.stage).toBe(DealStage.NDA);
    expect(deal!.sellerId).toBe(cedant);

    // Le bordereau de vérification est prêt dès l'ouverture.
    const bordereau = await prisma.dueDiligenceItem.count({ where: { dealId: deal!.id } });
    expect(bordereau).toBeGreaterThan(0);

    // Les offres concurrentes sont écartées, l'annonce sort du marché.
    const encoreSoumises = await prisma.offer.count({
      where: { listingId: LISTING, status: "SUBMITTED" },
    });
    expect(encoreSoumises).toBe(0);
    const listing = await prisma.listing.findUnique({
      where: { id: LISTING },
      select: { status: true },
    });
    expect(listing?.status).toBe(ListingStatus.UNDER_NEGOTIATION);
  });
});
