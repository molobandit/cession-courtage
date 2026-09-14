import "server-only";
import { prisma } from "@/lib/prisma";

/**
 * Chiffres d'une cession partielle, mesurés sur le lot mis en vente.
 *
 * Une annonce partielle ne cède qu'une partie des contrats : afficher les
 * commissions du portefeuille entier gonflerait l'offre et ferait paraître le
 * multiple dérisoire. Les annonces totales gardent les chiffres du portefeuille.
 */
export type LotTotals = { annualCommissions: number; contractCount: number; clientCount: number };

const PAQUET = 80;

export async function listingLotTotals(listingIds: string[]): Promise<Map<string, LotTotals>> {
  const out = new Map<string, LotTotals>();
  const clients = new Map<string, Set<string>>();
  for (let i = 0; i < listingIds.length; i += PAQUET) {
    const rows = await prisma.listingLine.findMany({
      where: { listingId: { in: listingIds.slice(i, i + PAQUET) } },
      select: { listingId: true, contractLine: { select: { annualCommission: true, clientKey: true } } },
    });
    for (const r of rows) {
      const t = out.get(r.listingId) ?? { annualCommissions: 0, contractCount: 0, clientCount: 0 };
      t.annualCommissions += Number(r.contractLine.annualCommission);
      t.contractCount += 1;
      out.set(r.listingId, t);
      const set = clients.get(r.listingId) ?? new Set<string>();
      set.add(r.contractLine.clientKey);
      clients.set(r.listingId, set);
    }
  }
  for (const [id, t] of out) {
    t.annualCommissions = Math.round(t.annualCommissions * 100) / 100;
    t.clientCount = clients.get(id)?.size ?? 0;
  }
  return out;
}

/** Commissions annuelles cédées : celles du lot pour une annonce partielle, sinon celles du portefeuille. */
export function commissionsCedees(
  listing: { id: string; isPartial: boolean; portfolio: { annualCommissions: unknown } },
  lots: Map<string, LotTotals>,
): number {
  const lot = listing.isPartial ? lots.get(listing.id) : undefined;
  return lot ? lot.annualCommissions : Number(listing.portfolio.annualCommissions);
}

/**
 * Part précomptée des commissions cédées, annonce par annonce : sur le lot pour
 * une cession partielle, sur tout le portefeuille sinon.
 */
export async function listingCommissionShares(
  listings: { id: string; portfolioId: string; isPartial: boolean }[],
): Promise<Map<string, { advanced: number; total: number }>> {
  const out = new Map<string, { advanced: number; total: number }>();
  const ajoute = (id: string, type: string, montant: number) => {
    const t = out.get(id) ?? { advanced: 0, total: 0 };
    t.total += montant;
    if (type === "ADVANCED") t.advanced += montant;
    out.set(id, t);
  };

  const partielles = listings.filter((l) => l.isPartial).map((l) => l.id);
  for (let i = 0; i < partielles.length; i += PAQUET) {
    const rows = await prisma.listingLine.findMany({
      where: { listingId: { in: partielles.slice(i, i + PAQUET) } },
      select: { listingId: true, contractLine: { select: { annualCommission: true, commissionType: true } } },
    });
    for (const r of rows) ajoute(r.listingId, r.contractLine.commissionType, Number(r.contractLine.annualCommission));
  }

  const totales = listings.filter((l) => !l.isPartial || !out.has(l.id));
  const portefeuilles = [...new Set(totales.map((l) => l.portfolioId))];
  const parPortefeuille = new Map<string, { type: string; montant: number }[]>();
  for (let i = 0; i < portefeuilles.length; i += PAQUET) {
    const groupes = await prisma.contractLine.groupBy({
      by: ["portfolioId", "commissionType"],
      where: { portfolioId: { in: portefeuilles.slice(i, i + PAQUET) } },
      _sum: { annualCommission: true },
    });
    for (const g of groupes) {
      const liste = parPortefeuille.get(g.portfolioId) ?? [];
      liste.push({ type: g.commissionType, montant: Number(g._sum.annualCommission ?? 0) });
      parPortefeuille.set(g.portfolioId, liste);
    }
  }
  for (const l of totales) {
    for (const g of parPortefeuille.get(l.portfolioId) ?? []) ajoute(l.id, g.type, g.montant);
  }
  return out;
}
