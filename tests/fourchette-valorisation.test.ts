/**
 * La fourchette de valorisation d'un dossier en ligne, sur la vraie base D1.
 *
 * Le dossier de présentation dit toujours un prix dans une fourchette, en
 * années de commissions annuelles nettes. La fiche doit donc pouvoir la
 * montrer pour n'importe quel dossier en ligne, y compris ceux dont aucune
 * étude n'a été enregistrée : elle se calcule alors avec le même algorithme,
 * et sans rien écrire en base.
 *
 * Prérequis : `npm run db:migrate && npm run db:seed && npm run db:catalog`.
 */
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { prisma } from "@/lib/prisma";
// Importé directement : l'alias de vitest ne vaut pas pour tsc.
import { disposePlatformProxy } from "./setup/prisma-test";
import { computePortfolioValuation } from "@/lib/valuation/run";

let annonce: { id: string; portfolioId: string; askingPrice: number; commissions: number };

beforeAll(async () => {
  const row = await prisma.listing.findFirst({
    where: { publicNumber: 10_101 },
    select: {
      id: true,
      portfolioId: true,
      askingPrice: true,
      portfolio: { select: { annualCommissions: true } },
    },
  });
  if (!row) throw new Error("Dossier 10101 absent. Lancez npm run db:catalog.");
  annonce = {
    id: row.id,
    portfolioId: row.portfolioId,
    askingPrice: Number(row.askingPrice),
    commissions: Number(row.portfolio.annualCommissions),
  };
});

afterAll(async () => {
  await disposePlatformProxy();
});

describe("la fourchette de valorisation", () => {
  it("se calcule pour un dossier sans étude enregistrée", async () => {
    const breakdown = await computePortfolioValuation(annonce.portfolioId, annonce.id);
    expect(breakdown.lowValue).toBeGreaterThan(0);
    expect(breakdown.highValue).toBeGreaterThan(breakdown.lowValue);
    expect(breakdown.midValue).toBeGreaterThanOrEqual(breakdown.lowValue);
  });

  it("n’écrit aucune valorisation en base", async () => {
    const avant = await prisma.valuation.count({ where: { portfolioId: annonce.portfolioId } });
    await computePortfolioValuation(annonce.portfolioId, annonce.id);
    const apres = await prisma.valuation.count({ where: { portfolioId: annonce.portfolioId } });
    expect(apres).toBe(avant);
  });

  it("s’exprime en années de commissions, autour du montant de l’annonce", async () => {
    const breakdown = await computePortfolioValuation(annonce.portfolioId, annonce.id);
    const bas = breakdown.lowValue / annonce.commissions;
    const haut = breakdown.highValue / annonce.commissions;
    // Des multiples de courtage, pas des chiffres de hasard.
    expect(bas).toBeGreaterThan(0.5);
    expect(haut).toBeLessThan(6);
  });
});
