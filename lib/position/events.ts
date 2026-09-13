import "server-only";
import { NotificationType } from "@prisma/client";
import { SALE_PIPELINE } from "@/lib/deal/pipeline";
import { findFirmSeller, notifyPositionEvent } from "@/lib/notify/transactional";
import { ensurePosition } from "@/lib/position/load";
import { prisma } from "@/lib/prisma";

/**
 * Qui prévenir, et vers quelle page, à chaque avancée d'une prise de position.
 *
 * L'acquéreur est renvoyé vers son dossier de position, qui porte toute la
 * frise ; le cédant vers le candidat ou vers le dossier de cession. Personne
 * n'est prévenu de sa propre action.
 */

async function contexte(listingId: string, buyerId: string) {
  const listing = await prisma.listing.findUnique({
    where: { id: listingId },
    select: { publicNumber: true, portfolio: { select: { firmId: true } } },
  });
  if (!listing) return null;
  const [seller, buyer, position] = await Promise.all([
    findFirmSeller(listing.portfolio.firmId),
    prisma.user.findUnique({ where: { id: buyerId }, select: { id: true, email: true, publicAlias: true } }),
    ensurePosition({ listingId, buyerId }),
  ]);
  if (!buyer) return null;
  return { numero: listing.publicNumber, seller, buyer, positionHref: `/app/positions/${position.id}` };
}

export async function notifyPositionTaken(listingId: string, buyerId: string): Promise<void> {
  const c = await contexte(listingId, buyerId);
  if (!c?.seller) return;
  await notifyPositionEvent({
    key: `taken:${listingId}:${buyerId}`,
    userId: c.seller.id,
    email: c.seller.email,
    title: `Nouvelle prise de position · dossier n° ${c.numero}`,
    body: `L’acquéreur ${c.buyer.publicAlias} a pris position sur votre portefeuille. Il peut vous écrire ; son dépôt et son offre suivront.`,
    href: c.positionHref,
    type: NotificationType.OFFER_RECEIVED,
  });
}

export async function notifyOfferDecision(input: {
  listingId: string;
  buyerId: string;
  accepted: boolean;
  dealId?: string;
}): Promise<void> {
  const c = await contexte(input.listingId, input.buyerId);
  if (!c) return;
  await notifyPositionEvent({
    key: `offer:${input.accepted ? "accepted" : "declined"}:${input.listingId}:${input.buyerId}`,
    userId: c.buyer.id,
    email: c.buyer.email,
    title: input.accepted
      ? `Offre retenue · dossier n° ${c.numero}`
      : `Dossier n° ${c.numero} en négociation avec un confrère`,
    body: input.accepted
      ? "Le cédant a retenu votre offre. Le dossier de cession est ouvert : signez l’accord de confidentialité pour continuer."
      : "Le cédant est entré en négociation avec un autre acquéreur. Bonne chance pour les prochaines opportunités.",
    href: c.positionHref,
  });
}

/**
 * Étape de dossier franchie.
 *
 * L'étape se franchit d'elle-même quand la dernière tâche est faite : celui
 * qui l'a faite n'a pas décidé du passage, il est donc prévenu lui aussi
 * (`notifyActor`).
 */
export async function notifyDealStage(
  dealId: string,
  actorId: string,
  options: { notifyActor?: boolean } = {},
): Promise<void> {
  const deal = await prisma.deal.findUnique({
    where: { id: dealId },
    select: { stage: true, listingId: true, buyerId: true, sellerId: true },
  });
  if (!deal) return;
  const c = await contexte(deal.listingId, deal.buyerId);
  if (!c) return;
  const etape = SALE_PIPELINE.find((s) => s.key === deal.stage);
  const titre =
    deal.stage === "CLOSED"
      ? `Cession close · dossier n° ${c.numero}`
      : `Dossier n° ${c.numero} · ${etape?.label ?? deal.stage}`;
  const corps =
    deal.stage === "CLOSED"
      ? "La cession est close. Les fonds séquestrés sont libérés."
      : `Le dossier passe à l’étape « ${etape?.label ?? deal.stage} ». ${etape?.summary ?? ""}`.trim();
  const tous = options.notifyActor === true;

  if (tous || actorId !== deal.buyerId) {
    await notifyPositionEvent({
      key: `deal:${dealId}:${deal.stage}`,
      userId: c.buyer.id,
      email: c.buyer.email,
      title: titre,
      body: corps,
      href: `/app/dossiers/${dealId}`,
    });
  }
  if (tous || actorId !== deal.sellerId) {
    const seller = await prisma.user.findUnique({ where: { id: deal.sellerId }, select: { id: true, email: true } });
    if (seller) {
      await notifyPositionEvent({
        key: `deal:${dealId}:${deal.stage}`,
        userId: seller.id,
        email: seller.email,
        title: titre,
        body: corps,
        href: `/app/dossiers/${dealId}`,
      });
    }
  }
}

/**
 * Fait nouveau dans un dossier — pièce déposée, lettre proposée, signature —
 * adressé à l'autre partie, qui a souvent quelque chose à faire ensuite.
 * `key` rend l'envoi unique : un dépôt de quinze pièces ne fait pas quinze courriels.
 */
export async function notifyDealEvent(input: {
  dealId: string;
  actorId: string;
  key: string;
  title: string;
  body: string;
}): Promise<void> {
  const deal = await prisma.deal.findUnique({
    where: { id: input.dealId },
    select: {
      sellerId: true,
      buyerId: true,
      listing: { select: { publicNumber: true } },
      seller: { select: { id: true, email: true } },
      buyer: { select: { id: true, email: true } },
    },
  });
  if (!deal) return;
  const destinataire = input.actorId === deal.sellerId ? deal.buyer : input.actorId === deal.buyerId ? deal.seller : null;
  if (!destinataire) return;
  await notifyPositionEvent({
    key: `dealevent:${input.dealId}:${input.key}`,
    userId: destinataire.id,
    email: destinataire.email,
    title: `Dossier n° ${deal.listing.publicNumber} · ${input.title}`,
    body: input.body,
    href: `/app/dossiers/${input.dealId}`,
  });
}

/** Nouveau message sur une annonce : le destinataire est prévenu, une fois par heure au plus. */
export async function notifyListingMessage(input: {
  listingId: string;
  buyerId: string;
  recipientId: string;
}): Promise<void> {
  const c = await contexte(input.listingId, input.buyerId);
  if (!c) return;
  const destinataire = await prisma.user.findUnique({
    where: { id: input.recipientId },
    select: { id: true, email: true },
  });
  if (!destinataire) return;
  const heure = new Date().toISOString().slice(0, 13);
  await notifyPositionEvent({
    key: `message:${input.listingId}:${input.buyerId}:${heure}`,
    userId: destinataire.id,
    email: destinataire.email,
    title: `Nouveau message · dossier n° ${c.numero}`,
    body: "Vous avez reçu un message sur ce dossier.",
    href: c.positionHref,
    type: NotificationType.MESSAGE,
  });
}
