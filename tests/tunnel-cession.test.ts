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
import { effacerParcours, etapeDe, formulaire as form, menerDossier, pdf } from "./setup/dossier";
import {
  answerRevisionAction,
  confirmPriceAction,
  fundEscrowAction,
  revisePriceAction,
  sendAttestationsAction,
  signDeedAction,
  uploadRoomDocumentAction,
} from "@/app/actions/deal-process";
import { uploadAccountDocumentAction } from "@/app/actions/account-verification";
import { acceptOfferAction } from "@/app/actions/offers";
import { DATA_ROOM_KINDS } from "@/lib/listing/company-doc-kinds";

const DEAL = "deal_nda";
const debut = new Date();

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

async function poser(stage: DealStage, preparer = true): Promise<void> {
  await effacerParcours(DEAL);
  await prisma.retentionReport.deleteMany({ where: { dealId: DEAL } });
  await prisma.deal.update({ where: { id: DEAL }, data: { stage, escrowStage: "NONE" } });
  if (!preparer) {
    // Cabinet pas prêt : aucune des pièces de salle de données sur l'annonce.
    await prisma.listingCompanyDocument.deleteMany({ where: { listingId, kind: { in: [...DATA_ROOM_KINDS] } } });
    return;
  }
  // Cabinet prêt à céder : les quatre pièces sont sur l'annonce.
  const presentes = (await prisma.listingCompanyDocument.findMany({ where: { listingId }, select: { kind: true } })).map((d) => d.kind);
  for (const kind of DATA_ROOM_KINDS.filter((k) => !presentes.includes(k))) {
    await prisma.listingCompanyDocument.create({
      data: { listingId, kind, fileName: `${kind}.pdf`, storageKey: `test/${kind}.pdf`, sha256: "0".repeat(64), uploadedById: sellerId, createdAt: new Date(Date.now() - 60_000) },
    });
  }
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
  await prisma.listingCompanyDocument.deleteMany({ where: { listingId, createdAt: { gte: debut } } });
  await prisma.accountDocument.deleteMany({ where: { userId: { in: [sellerId, buyerId] }, createdAt: { gte: debut } } });
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
  for (const [id, kyc] of [[sellerId, etatInitial.kyc.seller], [buyerId, etatInitial.kyc.buyer]] as const) {
    await prisma.user.update({ where: { id }, data: { kycStatus: kyc as never, kycReviewNote: null, kycReviewedAt: null } });
  }
  await prisma.listing.update({ where: { id: listingId }, data: { status: etatInitial.listingStatus } });
  await disposePlatformProxy();
});

describe("les cinq étapes, de l’offre acceptée à la clôture", () => {
  it("va de bout en bout, comptes vérifiés une fois, et marque l’annonce cédée", async () => {
    await poser(DealStage.DATA_ROOM, false);
    await prisma.user.updateMany({ where: { id: { in: [sellerId, buyerId] } }, data: { kycStatus: "NONE" } });
    await menerDossier(DEAL, "CLOSED", { verifierComptes: true });
    expect(await etapeDe(DEAL)).toBe(DealStage.CLOSED);

    const deal = await prisma.deal.findUniqueOrThrow({
      where: { id: DEAL },
      select: { escrowStage: true, adjustedDeferredAmount: true, fundsOrigin: true },
    });
    expect(deal.escrowStage).toBe("RELEASED");
    expect(deal.fundsOrigin).toBe("FONDS_PROPRES");
    expect(deal.adjustedDeferredAmount).not.toBeNull();

    const archives = await prisma.document.findMany({
      where: { dealId: DEAL, slot: { startsWith: "generated:" } },
      select: { slot: true, sha256: true },
    });
    expect(archives.map((a) => a.slot).sort()).toEqual(["generated:confidentialite", "generated:lettre-intention", "generated:protocole"]);

    const signatures = await prisma.dealSignoff.findMany({ where: { dealId: DEAL, kind: "DEED_SIGNED" } });
    expect(signatures).toHaveLength(2);
    expect(new Set(signatures.map((x) => x.contentHash)).size).toBe(1);

    const listing = await prisma.listing.findUnique({ where: { id: listingId }, select: { status: true } });
    expect(listing?.status).toBe(ListingStatus.SOLD);
  });

  it("un compte vérifié n’a plus rien à redonner au dossier suivant", async () => {
    // Les deux comptes l'ont été au test précédent : la vérification se coche seule.
    await poser(DealStage.DATA_ROOM);
    const avant = await prisma.accountDocument.count({ where: { userId: { in: [sellerId, buyerId] } } });
    await menerDossier(DEAL, "SIGNATURE");
    expect(await etapeDe(DEAL)).toBe(DealStage.SIGNATURE);
    expect(await prisma.accountDocument.count({ where: { userId: { in: [sellerId, buyerId] } } })).toBe(avant);
  });
});

describe("aucune étape ne se franchit sans ce qu’elle exige", () => {
  it("refuse la confirmation du prix tant que les pièces du cabinet manquent", async () => {
    await poser(DealStage.DATA_ROOM, false);
    connecterUtilisateur(buyerId);
    const r = await confirmPriceAction({}, form({ dealId: DEAL, consent: "on" }));
    expect(r.error).toContain("pièces du cabinet");
    expect(await etapeDe(DEAL)).toBe(DealStage.DATA_ROOM);
  });

  it("l’acquéreur ne dépose pas les pièces du cabinet, et un fichier exécutable est refusé", async () => {
    await poser(DealStage.DATA_ROOM, false);
    connecterUtilisateur(buyerId);
    expect((await uploadRoomDocumentAction({}, form({ dealId: DEAL, kind: "STATUTS", file: pdf() }))).error).toContain("cédant");
    connecterUtilisateur(sellerId);
    const exe = new File([new Uint8Array([77, 90])], "outil.exe", { type: "application/octet-stream" });
    expect((await uploadRoomDocumentAction({}, form({ dealId: DEAL, kind: "STATUTS", file: exe }))).error).toContain("PDF");
    expect((await uploadAccountDocumentAction({}, form({ kind: "PASSEPORT", file: pdf() }))).error).toContain("inconnu");
  });

  it("une révision du prix se motive, et le refus du cédant rend la main à l’acquéreur", async () => {
    await poser(DealStage.DATA_ROOM);
    connecterUtilisateur(buyerId);
    expect((await revisePriceAction({}, form({ dealId: DEAL, price: "25 000", reason: "" }))).error).toContain("Expliquez");
    expect((await revisePriceAction({}, form({ dealId: DEAL, price: "25 000", reason: "Commissions 2025 inférieures de 8 %." }))).ok).toBeTruthy();
    connecterUtilisateur(sellerId);
    expect((await answerRevisionAction({}, form({ dealId: DEAL, decision: "decline", reason: "" }))).error).toContain("motif");
    await answerRevisionAction({}, form({ dealId: DEAL, decision: "decline", reason: "Le prix de l’offre tient compte de 2025." }));
    const d = await prisma.deal.findUniqueOrThrow({ where: { id: DEAL }, select: { loiProposedAt: true, loiDeclineReason: true } });
    expect(d.loiProposedAt).toBeNull();
    expect(d.loiDeclineReason).toContain("2025");
    expect(await prisma.dealSignoff.count({ where: { dealId: DEAL, kind: "PRICE_CONFIRMED" } })).toBe(0);
    expect(await etapeDe(DEAL)).toBe(DealStage.DATA_ROOM);
  });

  it("le protocole se signe au nom du représentant, pas avant les vérifications", async () => {
    await poser(DealStage.DATA_ROOM);
    connecterUtilisateur(sellerId);
    expect((await signDeedAction({}, form({ dealId: DEAL, consent: "on", signatureName: "Antoine Perrin" }))).error).toContain("ordre du jour");
    await poser(DealStage.SIGNATURE);
    expect((await signDeedAction({}, form({ dealId: DEAL, consent: "on", signatureName: "Quelqu’un d’autre" }))).error).toContain("représentant");
  });

  it("le séquestre exige l’origine des fonds, et les attestations attendent les fonds", async () => {
    await poser(DealStage.TRANSFER);
    connecterUtilisateur(sellerId);
    expect((await sendAttestationsAction({}, form({ dealId: DEAL, consent: "on" }))).error).toContain("séquestre");
    expect((await fundEscrowAction({}, form({ dealId: DEAL, consent: "on", fundsOrigin: "FONDS_PROPRES" }))).error).toContain("autre partie");
    connecterUtilisateur(buyerId);
    expect((await fundEscrowAction({}, form({ dealId: DEAL, consent: "on" }))).error).toContain("origine des fonds");
    expect(await etapeDe(DEAL)).toBe(DealStage.TRANSFER);
  });
});

describe("le dossier n’est ouvert qu’à ses deux parties", () => {
  it("refuse un tiers, même connecté et vérifié", async () => {
    await poser(DealStage.DATA_ROOM);
    const tiers = await prisma.user.findFirst({
      where: { id: { notIn: [sellerId, buyerId] }, oriasVerifiedAt: { not: null }, erasedAt: null },
      select: { id: true },
    });
    if (!tiers) throw new Error("Aucun tiers vérifié en base. Lancez npm run db:seed.");
    connecterUtilisateur(tiers.id);
    expect((await confirmPriceAction({}, form({ dealId: DEAL, consent: "on" }))).error).toBeTruthy();
    expect(await etapeDe(DEAL)).toBe(DealStage.DATA_ROOM);
  });

  it("refuse un visiteur anonyme", async () => {
    await poser(DealStage.DATA_ROOM);
    connecterUtilisateur(null);
    expect((await confirmPriceAction({}, form({ dealId: DEAL, consent: "on" }))).error).toBeTruthy();
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
    // L'offre retenue vaut lettre d'intention : le dossier commence aux vérifications,
    // confidentialité acceptée des deux côtés.
    expect(deal!.stage).toBe(DealStage.DATA_ROOM);
    expect(deal!.sellerId).toBe(cedant);
    const nda = await prisma.dealSignoff.findMany({ where: { dealId: deal!.id, kind: "NDA_SIGNED" } });
    expect(nda.map((n) => n.userId).sort()).toEqual([cedant, offre.buyerId].sort());

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
