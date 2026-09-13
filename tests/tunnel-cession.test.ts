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
import { effacerParcours, etapeDe, formulaire as form, jouerEtape, menerDossier, pdf } from "./setup/dossier";
import {
  answerLoiAction,
  fundEscrowAction,
  proposeLoiAction,
  reviewDataRoomAction,
  signDeedAction,
  signNdaAction,
  uploadDealPieceAction,
} from "@/app/actions/deal-process";
import { acceptOfferAction } from "@/app/actions/offers";

const DEAL = "deal_nda";

let sellerId: string;
let buyerId: string;
let listingId: string;
let etatInitial: {
  stage: DealStage;
  ndaAcceptedAt: Date | null;
  listingStatus: ListingStatus;
  agreedPrice: string;
  upfrontAmount: string;
  deferredAmount: string;
  escrowStage: string;
  escrowProviderRef: string | null;
  kyc: { seller: string; buyer: string };
};

async function poser(stage: DealStage): Promise<void> {
  await effacerParcours(DEAL);
  await prisma.deal.update({ where: { id: DEAL }, data: { stage, escrowStage: "NONE" } });
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
      agreedPrice: true,
      upfrontAmount: true,
      deferredAmount: true,
      escrowStage: true,
      escrowProviderRef: true,
      listing: { select: { status: true } },
      seller: { select: { kycStatus: true } },
      buyer: { select: { kycStatus: true } },
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
    agreedPrice: String(deal.agreedPrice),
    upfrontAmount: String(deal.upfrontAmount),
    deferredAmount: String(deal.deferredAmount),
    escrowStage: deal.escrowStage,
    escrowProviderRef: deal.escrowProviderRef,
    kyc: { seller: deal.seller.kycStatus, buyer: deal.buyer.kycStatus },
  };
});

beforeEach(() => {
  connecterUtilisateur(sellerId);
});

afterAll(async () => {
  // Le dossier de démonstration retrouve son état d'origine.
  connecterUtilisateur(null);
  await effacerParcours(DEAL);
  await prisma.retentionReport.deleteMany({ where: { dealId: DEAL } });
  await prisma.deal.update({
    where: { id: DEAL },
    data: {
      stage: etatInitial.stage,
      ndaAcceptedAt: etatInitial.ndaAcceptedAt,
      agreedPrice: etatInitial.agreedPrice,
      upfrontAmount: etatInitial.upfrontAmount,
      deferredAmount: etatInitial.deferredAmount,
      adjustedDeferredAmount: null,
      escrowStage: etatInitial.escrowStage as never,
      escrowProviderRef: etatInitial.escrowProviderRef,
    },
  });
  await prisma.user.update({ where: { id: sellerId }, data: { kycStatus: etatInitial.kyc.seller as never } });
  await prisma.user.update({ where: { id: buyerId }, data: { kycStatus: etatInitial.kyc.buyer as never } });
  await prisma.listing.update({
    where: { id: listingId },
    data: { status: etatInitial.listingStatus },
  });
  await disposePlatformProxy();
});

describe("le parcours se déroule dans l’ordre, du NDA à la clôture", () => {
  it("va de bout en bout, chaque partie faisant sa part, et marque l’annonce cédée", async () => {
    await poser(DealStage.NDA);
    await menerDossier(DEAL, "CLOSED");
    expect(await etapeDe(DEAL)).toBe(DealStage.CLOSED);

    const deal = await prisma.deal.findUniqueOrThrow({
      where: { id: DEAL },
      select: { escrowStage: true, adjustedDeferredAmount: true, ndaAcceptedAt: true },
    });
    expect(deal.escrowStage).toBe("RELEASED");
    expect(deal.ndaAcceptedAt).not.toBeNull();
    // 92 % conservés pour une cible de 90 % : le solde est versé en entier.
    expect(deal.adjustedDeferredAmount).not.toBeNull();

    // Les pièces signées sont archivées avec leur empreinte.
    const archives = await prisma.document.findMany({
      where: { dealId: DEAL, slot: { startsWith: "generated:" } },
      select: { slot: true, sha256: true, signedAt: true },
    });
    expect(archives.map((a) => a.slot).sort()).toEqual(["generated:confidentialite", "generated:lettre-intention", "generated:protocole"]);
    expect(archives.every((a) => a.sha256.length === 64 && a.signedAt)).toBe(true);

    const signatures = await prisma.dealSignoff.findMany({ where: { dealId: DEAL, kind: "DEED_SIGNED" } });
    expect(signatures).toHaveLength(2);
    expect(new Set(signatures.map((x) => x.contentHash)).size).toBe(1);

    const listing = await prisma.listing.findUnique({ where: { id: listingId }, select: { status: true } });
    expect(listing?.status).toBe(ListingStatus.SOLD);
  });
});

describe("aucune étape ne se franchit d’un clic", () => {
  it("une seule signature de confidentialité n’ouvre pas la salle de données", async () => {
    await poser(DealStage.NDA);
    connecterUtilisateur(buyerId);
    expect(await signNdaAction({}, form({ dealId: DEAL, consent: "on" }))).toEqual({ ok: "Accord signé." });
    expect(await etapeDe(DEAL)).toBe(DealStage.NDA);
  });

  it("refuse de signer sans cocher l’engagement", async () => {
    await poser(DealStage.NDA);
    connecterUtilisateur(buyerId);
    expect((await signNdaAction({}, form({ dealId: DEAL }))).error).toBeTruthy();
  });

  it("refuse l’examen de la salle de données tant que des pièces obligatoires manquent", async () => {
    await poser(DealStage.DATA_ROOM);
    connecterUtilisateur(buyerId);
    const r = await reviewDataRoomAction({}, form({ dealId: DEAL, consent: "on" }));
    expect(r.error).toContain("pièces obligatoires");
    expect(await etapeDe(DEAL)).toBe(DealStage.DATA_ROOM);
  });

  it("l’acquéreur ne dépose pas les pièces du cédant, et un emplacement fabriqué est refusé", async () => {
    await poser(DealStage.DATA_ROOM);
    const item = await prisma.dueDiligenceItem.findFirstOrThrow({ where: { dealId: DEAL } });
    connecterUtilisateur(buyerId);
    expect((await uploadDealPieceAction({}, form({ dealId: DEAL, slot: `dd:${item.id}`, file: pdf() }))).error).toContain("autre partie");
    connecterUtilisateur(sellerId);
    expect((await uploadDealPieceAction({}, form({ dealId: DEAL, slot: "dd:invente", file: pdf() }))).error).toContain("inconnu");
    // Une pièce d'identification ne se dépose qu'à l'étape de conformité.
    expect((await uploadDealPieceAction({}, form({ dealId: DEAL, slot: "kyc:seller:kbis", file: pdf() }))).error).toContain("pas ouvert");
  });

  it("refuse un fichier qui n’est ni PDF ni image", async () => {
    await poser(DealStage.DATA_ROOM);
    const item = await prisma.dueDiligenceItem.findFirstOrThrow({ where: { dealId: DEAL } });
    const exe = new File([new Uint8Array([77, 90])], "outil.exe", { type: "application/octet-stream" });
    const r = await uploadDealPieceAction({}, form({ dealId: DEAL, slot: `dd:${item.id}`, file: exe }));
    expect(r.error).toContain("PDF");
  });

  it("la lettre d’intention se propose par l’acquéreur et s’accepte par le cédant", async () => {
    await poser(DealStage.LOI);
    connecterUtilisateur(sellerId);
    expect((await proposeLoiAction({}, form({ dealId: DEAL, price: "30000", effectiveDate: "2099-01-01" }))).error).toBeTruthy();
    connecterUtilisateur(buyerId);
    expect((await answerLoiAction({}, form({ dealId: DEAL, decision: "accept", consent: "on" }))).error).toBeTruthy();
    expect(await proposeLoiAction({}, form({ dealId: DEAL, price: "30 000", effectiveDate: "2099-01-01" }))).toEqual({
      ok: "Lettre d’intention envoyée au cédant.",
    });

    // Un refus renvoie la main à l'acquéreur, avec le motif.
    connecterUtilisateur(sellerId);
    expect((await answerLoiAction({}, form({ dealId: DEAL, decision: "decline", reason: "" }))).error).toContain("motif");
    await answerLoiAction({}, form({ dealId: DEAL, decision: "decline", reason: "Prix trop bas au regard des liasses." }));
    const refusee = await prisma.deal.findUniqueOrThrow({ where: { id: DEAL }, select: { loiProposedAt: true, loiDeclineReason: true } });
    expect(refusee.loiProposedAt).toBeNull();
    expect(refusee.loiDeclineReason).toBe("Prix trop bas au regard des liasses.");
    expect(await etapeDe(DEAL)).toBe(DealStage.LOI);
  });

  it("le protocole se signe au nom du représentant, et pas avant d’être approuvé", async () => {
    await poser(DealStage.DEED);
    connecterUtilisateur(sellerId);
    expect((await signDeedAction({}, form({ dealId: DEAL, consent: "on", signatureName: "Antoine Perrin" }))).error).toContain("ordre du jour");

    await poser(DealStage.SIGNATURE);
    const r = await signDeedAction({}, form({ dealId: DEAL, consent: "on", signatureName: "Quelqu’un d’autre" }));
    expect(r.error).toContain("représentant");
  });

  it("refuse le séquestre avant la signature, et au cédant", async () => {
    await poser(DealStage.SIGNATURE);
    connecterUtilisateur(buyerId);
    expect((await fundEscrowAction({}, form({ dealId: DEAL, consent: "on" }))).error).toBeTruthy();
    await poser(DealStage.ESCROW);
    connecterUtilisateur(sellerId);
    expect((await fundEscrowAction({}, form({ dealId: DEAL, consent: "on" }))).error).toContain("autre partie");
    expect(await etapeDe(DEAL)).toBe(DealStage.ESCROW);
  });

  it("refuse de rejouer une étape déjà franchie", async () => {
    await poser(DealStage.NDA);
    await jouerEtape(DEAL);
    expect(await etapeDe(DEAL)).toBe(DealStage.DATA_ROOM);
    connecterUtilisateur(buyerId);
    expect((await signNdaAction({}, form({ dealId: DEAL, consent: "on" }))).error).toBeTruthy();
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
    const resultat = await signNdaAction({}, form({ dealId: DEAL, consent: "on" }));
    expect(resultat.error).toBeTruthy();
    expect(await etapeDe(DEAL)).toBe(DealStage.NDA);
  });

  it("refuse un visiteur anonyme", async () => {
    await poser(DealStage.NDA);
    connecterUtilisateur(null);
    const resultat = await signNdaAction({}, form({ dealId: DEAL, consent: "on" }));
    expect(resultat.error).toBeTruthy();
    expect(await etapeDe(DEAL)).toBe(DealStage.NDA);
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
