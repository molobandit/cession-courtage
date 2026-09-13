import "server-only";
import { prisma } from "@/lib/prisma";

/**
 * Dossiers de gré à gré d'une personne.
 *
 * Par l'identifiant ET par l'adresse : une contrepartie invitée avant d'avoir
 * un compte doit retrouver son dossier à sa première connexion, sans qu'on ait
 * eu à la rattacher au préalable.
 */
export async function listMyDirectDeals(userId: string, email: string) {
  return prisma.directDeal.findMany({
    where: {
      OR: [
        { openedById: userId },
        { counterpartyUserId: userId },
        { counterpartyEmail: email.toLowerCase() },
      ],
    },
    orderBy: { updatedAt: "desc" },
    select: {
      id: true,
      portfolioLabel: true,
      salePrice: true,
      stage: true,
      kit: true,
      escrow: true,
      attestations: true,
      feesPaidAt: true,
      openedById: true,
      openerRole: true,
      counterpartyEmail: true,
      carriers: true,
      createdAt: true,
      updatedAt: true,
      openedBy: { select: { publicAlias: true } },
      counterparty: { select: { publicAlias: true } },
    },
  });
}

/** Un dossier, si la personne en est partie. */
export async function findMyDirectDeal(id: string, userId: string, email: string) {
  const deal = await prisma.directDeal.findUnique({
    where: { id },
    include: {
      openedBy: { select: { publicAlias: true } },
    },
  });
  if (!deal) return null;
  const partie =
    deal.openedById === userId ||
    deal.counterpartyUserId === userId ||
    deal.counterpartyEmail === email.toLowerCase();
  return partie ? deal : null;
}

/**
 * Une page de la liste d'un service, triée et paginée en base.
 *
 * Le filtre reprend `matchesFilter` : un kit apparaît aussi parmi les
 * attestations, puisqu'il en produit.
 */
export async function listMyDirectDealsPage(input: {
  userId: string;
  email: string;
  filter: "kits" | "transactions" | "attestations";
  tri: "createdAt" | "updatedAt";
  ordre: "asc" | "desc";
  parPage: number;
  page: number;
}) {
  const service =
    input.filter === "kits"
      ? { kit: true }
      : input.filter === "transactions"
        ? { escrow: true }
        : { OR: [{ attestations: true }, { kit: true }] };
  const where = {
    AND: [
      {
        OR: [
          { openedById: input.userId },
          { counterpartyUserId: input.userId },
          { counterpartyEmail: input.email.toLowerCase() },
        ],
      },
      service,
    ],
  };
  const [total, dossiers] = await Promise.all([
    prisma.directDeal.count({ where }),
    prisma.directDeal.findMany({
      where,
      orderBy: { [input.tri]: input.ordre },
      skip: (input.page - 1) * input.parPage,
      take: input.parPage,
      select: {
        id: true,
        portfolioLabel: true,
        salePrice: true,
        stage: true,
        kit: true,
        escrow: true,
        attestations: true,
        openedById: true,
        openerRole: true,
        counterpartyEmail: true,
        carriers: true,
        feesPaidAt: true,
        createdAt: true,
        updatedAt: true,
        openedBy: { select: { publicAlias: true } },
        counterparty: { select: { publicAlias: true } },
      },
    }),
  ]);
  return { total, dossiers };
}
