import "server-only";
import type { Actor } from "@/lib/authz/actor";
import { INTEREST_DEPOSIT_LABEL, INTEREST_DEPOSIT_RATE, interestDepositFor } from "@/lib/billing/rates";
import { ensurePosition } from "@/lib/position/load";
import { prisma } from "@/lib/prisma";

/**
 * Pose le dépôt d'engagement de 2,5 % et l'acceptation de confidentialité.
 *
 * Partagé par le bouton « Déposer mon engagement » et par le formulaire
 * d'offre, qui fait les deux en un geste : l'acquéreur pressé ne remplit
 * qu'un formulaire, sans rien sauter de ce qui l'engage.
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

  return { deposit, position };
}
