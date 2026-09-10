import "server-only";
import { prisma } from "@/lib/prisma";
import type { Actor } from "@/lib/authz/actor";

/**
 * Export des donnees personnelles, articles 15 et 20 du RGPD.
 *
 * Deux regles gouvernent ce qui sort d'ici.
 *
 * D'abord, le droit porte sur les donnees concernant le demandeur, pas sur
 * celles de ses interlocuteurs : la contrepartie d'un dossier n'apparait que
 * sous son alias, jamais nominativement. Exporter l'identite d'un tiers sous
 * couvert de portabilite serait une fuite, pas une conformite.
 *
 * Ensuite, aucune donnee de client final n'existe en base au-dela du code
 * postal : il n'y a donc rien de tel a exporter, et c'est voulu.
 */
export async function exportPersonalData(actor: Actor): Promise<Record<string, unknown>> {
  const [user, mandates, offers, dealsSeller, dealsBuyer, messages, subscriptions, deposits, imports] =
    await Promise.all([
      prisma.user.findUnique({
        where: { id: actor.id },
        select: {
          id: true,
          email: true,
          phone: true,
          fullName: true,
          role: true,
          oriasNumber: true,
          oriasVerifiedAt: true,
          kycStatus: true,
          publicAlias: true,
          emailVerified: true,
          createdAt: true,
          firm: {
            select: {
              legalName: true,
              siren: true,
              legalForm: true,
              address: true,
              postalCode: true,
              city: true,
              department: true,
              region: true,
            },
          },
        },
      }),
      prisma.buyerMandate.findMany({
        where: { buyerId: actor.id },
        select: {
          maxBudget: true,
          minCommissions: true,
          maxCommissions: true,
          riskTypes: true,
          zones: true,
          clientSegments: true,
          isPublic: true,
          publicNumber: true,
          createdAt: true,
        },
      }),
      prisma.offer.findMany({
        where: { buyerId: actor.id },
        select: {
          amount: true,
          upfrontPercent: true,
          message: true,
          status: true,
          submittedAt: true,
          listing: { select: { publicNumber: true } },
        },
      }),
      // Contrepartie sous alias uniquement : son identite ne nous appartient pas.
      prisma.deal.findMany({
        where: { sellerId: actor.id },
        select: {
          stage: true,
          agreedPrice: true,
          createdAt: true,
          buyerAlias: true,
          listing: { select: { publicNumber: true } },
        },
      }),
      prisma.deal.findMany({
        where: { buyerId: actor.id },
        select: {
          stage: true,
          agreedPrice: true,
          createdAt: true,
          sellerAlias: true,
          listing: { select: { publicNumber: true } },
        },
      }),
      prisma.message.findMany({
        where: { senderId: actor.id },
        select: { body: true, createdAt: true, listingId: true, dealId: true },
      }),
      prisma.subscription.findMany({
        where: { userId: actor.id },
        select: { plan: true, status: true, feeRate: true, dealQuota: true, dealsUsed: true, renewsAt: true },
      }),
      prisma.interestDeposit.findMany({
        where: { buyerId: actor.id },
        select: { amount: true, rate: true, placedAt: true, listing: { select: { publicNumber: true } } },
      }),
      prisma.portfolioImport.findMany({
        where: { userId: actor.id },
        select: {
          originalFileName: true,
          totalRows: true,
          processedRows: true,
          status: true,
          createdAt: true,
          completedAt: true,
        },
      }),
    ]);

  return {
    _lisezMoi: {
      objet: "Export de vos données personnelles, articles 15 et 20 du RGPD.",
      genereLe: new Date().toISOString(),
      portee:
        "Les données vous concernant. Vos interlocuteurs n’apparaissent que sous leur alias public : leur identité ne fait pas partie de vos données.",
      clientsFinaux:
        "Aucune donnée nominative de client final n’est collectée par la plateforme. Le grain le plus fin est le code postal.",
    },
    compte: user,
    mandatsDeRecherche: mandates,
    offresDeposees: offers,
    dossiersCommeCedant: dealsSeller,
    dossiersCommeAcquereur: dealsBuyer,
    messagesEnvoyes: messages,
    abonnements: subscriptions,
    depotsDInteret: deposits,
    importsDePortefeuille: imports,
  };
}
