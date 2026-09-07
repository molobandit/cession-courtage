import "server-only";
import { prisma } from "@/lib/prisma";
import { canBuy, type Actor } from "@/lib/authz/actor";
import { isListingMessageParty, ownsFirm } from "@/lib/authz/policies";

export async function listingSellerUserId(firmId: string): Promise<string | null> {
  const seller = await prisma.user.findFirst({
    where: { firmId, role: { in: ["SELLER", "BOTH"] } },
    select: { id: true },
    orderBy: { createdAt: "asc" },
  });
  return seller?.id ?? null;
}

export async function isListingMailboxParty(actor: Actor, listingId: string): Promise<boolean> {
  const listing = await prisma.listing.findUnique({
    where: { id: listingId },
    select: { portfolio: { select: { firmId: true } } },
  });
  if (!listing) return false;
  if (!canBuy(actor) && !ownsFirm(actor, listing.portfolio.firmId)) return false;

  const [offer, deal] = await Promise.all([
    prisma.offer.findUnique({
      where: { listingId_buyerId: { listingId, buyerId: actor.id } },
      select: { id: true },
    }),
    prisma.deal.findFirst({
      where: { listingId, OR: [{ buyerId: actor.id }, { sellerId: actor.id }] },
      select: { id: true },
    }),
  ]);
  return isListingMessageParty({
    actorFirmId: actor.firmId,
    listingFirmId: listing.portfolio.firmId,
    hasOffer: Boolean(offer),
    hasDeal: Boolean(deal),
  });
}

export async function listListingMailboxRecipients(listingId: string, actor: Actor) {
  const listing = await prisma.listing.findUnique({
    where: { id: listingId },
    select: { portfolio: { select: { firmId: true } } },
  });
  if (!listing || !ownsFirm(actor, listing.portfolio.firmId)) return [];
  const offers = await prisma.offer.findMany({
    where: { listingId },
    select: { buyer: { select: { id: true, publicAlias: true } } },
    distinct: ["buyerId"],
  });
  return offers.map((o) => o.buyer);
}

export async function listListingMessages(listingId: string, actor: Actor) {
  const listing = await prisma.listing.findUnique({
    where: { id: listingId },
    select: { portfolio: { select: { firmId: true } } },
  });
  if (!listing) return [];
  const seller = ownsFirm(actor, listing.portfolio.firmId);
  if (!seller && !(await isListingMailboxParty(actor, listingId))) return [];

  const where = seller
    ? { listingId }
    : {
        listingId,
        OR: [
          { senderId: actor.id },
          { recipientId: actor.id },
          { recipientId: null, senderId: { not: actor.id } },
        ],
      };

  return prisma.message.findMany({
    where,
    orderBy: { createdAt: "asc" },
    include: { sender: { select: { publicAlias: true } } },
    take: 50,
  });
}
