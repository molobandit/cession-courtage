import { NextResponse } from "next/server";
import { getActor } from "@/lib/authz";
import { canViewListing } from "@/lib/authz/policies";
import { loadValuationStudy } from "@/lib/listing/valuation-study";
import { renderValuationStudyPdf } from "@/lib/listing/valuation-study-pdf";
import { prisma } from "@/lib/prisma";

/**
 * Dossier de présentation rattaché à un numéro de dossier.
 *
 * C'est la pièce qui permet à un acquéreur de juger un portefeuille avant de
 * se positionner, et les deux dossiers de référence disent qu'elle accompagne
 * l'annonce. Qui voit l'annonce obtient donc le PDF : le document est anonyme
 * par construction, ni raison sociale, ni SIREN, ni contact, seulement le
 * numéro de dossier. Le nom du cabinet ne se découvre qu'au dépôt de
 * positionnement, et il n'est pas là-dedans.
 */
export async function GET(_request: Request, { params }: { params: Promise<{ numero: string }> }) {
  const { numero } = await params;
  const introuvable = NextResponse.json({ error: "Document introuvable." }, { status: 404 });
  const publicNumber = Number(numero);
  if (!Number.isFinite(publicNumber)) return introuvable;
  const actor = await getActor();

  const listing = await prisma.listing.findFirst({
    where: { publicNumber },
    select: {
      id: true,
      publicNumber: true,
      portfolioId: true,
      status: true,
      portfolio: { select: { firmId: true } },
    },
  });
  if (!listing) return introuvable;
  if (!canViewListing(actor, listing)) return introuvable;

  const study = await loadValuationStudy({ portfolioId: listing.portfolioId, listingId: listing.id });
  if (!study) return introuvable;
  const pdf = await renderValuationStudyPdf(study);

  return new NextResponse(pdf.buffer as ArrayBuffer, {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `inline; filename="etude-portefeuille-${listing.publicNumber}.pdf"`,
      "Cache-Control": "private, max-age=0, must-revalidate",
      "X-Content-Type-Options": "nosniff",
    },
  });
}
