import "server-only";
import { DealStage, ListingStatus } from "@prisma/client";
import type { Actor } from "@/lib/authz/actor";
import { INTEREST_DEPOSIT_LABEL, INTEREST_DEPOSIT_RATE, interestDepositFor } from "@/lib/billing/rates";
import { depositReleasesIdentity } from "@/lib/listing/identity-access";
import { stripeConfigured } from "@/lib/billing/stripe";
import { ensurePosition } from "@/lib/position/load";
import { prisma } from "@/lib/prisma";

/**
 * Pose le dépôt de positionnement de 2,5 % et ouvre la procédure de cession.
 *
 * C'est le seul geste d'engagement du modèle : l'acquéreur ne propose pas de
 * prix, il verse 2,5 % du montant de l'annonce dans un trust. Ce versement
 * lance la procédure, lui ouvre le nom du cabinet cédant et ses pièces, et
 * retire l'annonce du marché.
 */
export type DepositPayment = { method: "CARD" | "SEPA" | null; ref: string | null; status: "RECORDED" | "PROCESSING" | "PAID" };

export async function placeDeposit(
  actor: Pick<Actor, "id" | "email">,
  listing: { id: string; askingPrice: unknown; publicNumber: number | null; portfolio: { firmId: string } },
  ndaAcceptedAt: Date | null,
  payment: DepositPayment = { method: null, ref: null, status: "RECORDED" },
) {
    const amount = interestDepositFor(Number(listing.askingPrice));
    if (amount <= 0) throw new Error("Montant de dépôt invalide.");

    // D1 n'a pas de transactions : l'unicite du couple annonce/acquereur et cet
    // upsert rendent un rejeu inoffensif. Le montant du premier depot est
    // conserve, un changement de prix demande ne le revalorise pas.
    const deposit = await prisma.interestDeposit.upsert({
      where: { listingId_buyerId: { listingId: listing.id, buyerId: actor.id } },
      update: {
        ...(ndaAcceptedAt ? { ndaAcceptedAt } : {}),
        ...(payment.method ? { paymentMethod: payment.method, paymentRef: payment.ref, paymentStatus: payment.status } : {}),
      },
      create: {
        listingId: listing.id,
        buyerId: actor.id,
        amount: amount.toFixed(2),
        rate: INTEREST_DEPOSIT_RATE.toFixed(4),
        ndaAcceptedAt,
        paymentMethod: payment.method,
        paymentRef: payment.ref,
        paymentStatus: payment.status,
      },
    });

    // Le dépôt suppose une position : l'acquéreur qui verse sans l'avoir prise la prend.
    const position = await ensurePosition({ listingId: listing.id, buyerId: actor.id });

    const { findFirmSeller, notifyDepositPlaced } = await import("@/lib/notify/transactional");
    const seller = await findFirmSeller(listing.portfolio.firmId);

    const deal = seller ? await openDeal(actor.id, seller.id, listing) : null;

    if (seller) {
      await notifyDepositPlaced({
        depositKey: deposit.id,
        publicNumber: listing.publicNumber ?? 0,
        amountLabel: INTEREST_DEPOSIT_LABEL,
        seller: { userId: seller.id, email: seller.email },
        counterparty: { userId: actor.id, email: actor.email },
        href: `/app/positions/${position.id}`,
      }).catch(() => null);
    }

    await prisma.auditLog.create({
      data: {
        actorId: actor.id,
        action: "listing.deposit.placed",
        entityType: "Listing",
        entityId: listing.id,
        metadata: { amount, rate: INTEREST_DEPOSIT_RATE },
      },
    });

    /*
     * Ce que l'acquéreur ouvrira ensuite s'imprime maintenant.
     *
     * Son dépôt vient de lui ouvrir la présentation du cabinet et le dossier
     * de présentation ; les imprimer ici, en arrière plan, évite de le faire
     * attendre devant un écran noir à son premier clic.
     */
    if (depositReleasesIdentity(payment.status, stripeConfigured())) {
      void import("@/lib/listing/dossier-warmup")
        .then((m) => m.scheduleWarmAfterPositioning({ listingId: listing.id, userId: actor.id, investor: false }))
        .catch(() => undefined);
    }

  return { deposit, position, deal };
}

/**
 * Ouvre le dossier de cession au montant de l'annonce.
 *
 * Le prix n'est pas négocié : c'est celui que notre équipe a arrêté à l'issue
 * de l'étude. Le dossier démarre donc directement aux vérifications, avec la
 * confidentialité déjà signée des deux côtés, et l'annonce quitte le marché.
 *
 * Chaque étape est rejouable : la contrainte unique (annonce, acquéreur)
 * empêche tout doublon si l'appel est rejoué.
 */
async function openDeal(
  buyerId: string,
  sellerId: string,
  listing: { id: string; askingPrice: unknown },
) {
  const existant = await prisma.deal.findUnique({
    where: { listingId_buyerId: { listingId: listing.id, buyerId } },
    select: { id: true },
  });
  if (existant) return existant;

  const montant = Math.round(Number(listing.askingPrice) * 100) / 100;
  const [acquereur, cedant] = await Promise.all([
    prisma.user.findUnique({ where: { id: buyerId }, select: { publicAlias: true } }),
    prisma.user.findUnique({ where: { id: sellerId }, select: { publicAlias: true } }),
  ]);

  const deal = await prisma.deal.upsert({
    where: { listingId_buyerId: { listingId: listing.id, buyerId } },
    update: {},
    create: {
      listingId: listing.id,
      sellerId,
      buyerId,
      agreedPrice: montant.toFixed(2),
      upfrontAmount: montant.toFixed(2),
      deferredAmount: (0).toFixed(2),
      stage: DealStage.DATA_ROOM,
      sellerAlias: `Cédant ${cedant?.publicAlias ?? "C"}`,
      buyerAlias: `Acquéreur ${acquereur?.publicAlias ?? "A"}`,
    },
    select: { id: true },
  });

  const { loadAgreementsStatus } = await import("@/lib/account/agreements-load");
  for (const userId of [buyerId, sellerId]) {
    const utilisateur = await prisma.user.findUnique({ where: { id: userId }, select: { id: true, oriasNumber: true } });
    const engagements = utilisateur ? await loadAgreementsStatus(utilisateur) : null;
    await prisma.dealSignoff.upsert({
      where: { dealId_kind_userId: { dealId: deal.id, kind: "NDA_SIGNED", userId } },
      update: {},
      create: {
        dealId: deal.id,
        kind: "NDA_SIGNED",
        userId,
        createdAt: engagements?.signed.NDA?.signedAt ?? new Date(),
      },
    });
  }

  await prisma.listing.update({
    where: { id: listing.id },
    data: { status: ListingStatus.UNDER_NEGOTIATION },
  });

  return deal;
}
