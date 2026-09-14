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
