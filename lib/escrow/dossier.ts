import "server-only";
import { prisma } from "@/lib/prisma";
import type { EtapeSequestre, EtapeTunnel, EtatDossier } from "@/lib/escrow/conditions";

/**
 * Construit l'état d'un dossier tel que le voit le séquestre.
 *
 * Chaque signal est lu dans la base, jamais déclaré : l'acte est signé parce
 * qu'un document porte une date de signature, les compagnies ont répondu parce
 * que leurs lignes portent un état décidé. Un séquestre qui se fie à une case
 * cochée à la main ne protège personne.
 */
export async function etatSequestre(dealId: string): Promise<EtatDossier | null> {
  const deal = await prisma.deal.findUnique({
    where: { id: dealId },
    select: {
      stage: true,
      escrowStage: true,
      seller: { select: { kycStatus: true } },
      buyer: { select: { kycStatus: true } },
      listing: { select: { portfolioId: true } },
      documents: { where: { type: "DEED" }, select: { signedAt: true } },
      retentionReports: { select: { monthIndex: true } },
    },
  });
  if (!deal) return null;

  // Les compagnies se comptent sur le portefeuille cédé : ce sont elles qui
  // détiennent les codes de courtage à transférer.
  const [compagniesTotal, compagniesRepondues] = await Promise.all([
    prisma.carrierCode.count({ where: { portfolioId: deal.listing.portfolioId } }),
    prisma.carrierCode.count({
      where: {
        portfolioId: deal.listing.portfolioId,
        status: { in: ["AGREED", "REFUSED"] },
      },
    }),
  ]);

  return {
    etape: deal.stage as EtapeTunnel,
    sequestre: deal.escrowStage as EtapeSequestre,
    kycCedant: deal.seller.kycStatus === "VERIFIED",
    kycAcquereur: deal.buyer.kycStatus === "VERIFIED",
    acteSigne: deal.documents.some((d) => d.signedAt !== null),
    compagniesTotal,
    compagniesRepondues,
    releveDouzeMois: deal.retentionReports.some((r) => r.monthIndex === 12),
  };
}
