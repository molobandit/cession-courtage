import { NextResponse } from "next/server";
import { getActor, isAdmin } from "@/lib/authz";
import { ownsFirm } from "@/lib/authz/policies";
import { loadValuationStudy } from "@/lib/listing/valuation-study";
import { renderValuationStudyPdf } from "@/lib/listing/valuation-study-pdf";
import { prisma } from "@/lib/prisma";

/**
 * Étude anonymisée rattachée à un numéro de dossier.
 *
 * Cédant propriétaire ou admin uniquement. Pas `canViewListing` : un acquéreur
 * qui voit l’annonce n’obtient pas ce PDF.
 */
export async function GET(_request: Request, { params }: { params: Promise<{ numero: string }> }) {
  const { numero } = await params;
  const introuvable = NextResponse.json({ error: "Document introuvable." }, { status: 404 });
  const publicNumber = Number(numero);
  if (!Number.isFinite(publicNumber)) return introuvable;
  const actor = await getActor();
  if (!actor) return introuvable;

  const listing = await prisma.listing.findFirst({
    where: { publicNumber },
    select: { id: true, publicNumber: true, portfolioId: true, portfolio: { select: { firmId: true } } },
  });
  if (!listing) return introuvable;
  if (!ownsFirm(actor, listing.portfolio.firmId) && !isAdmin(actor)) return introuvable;

  const study = await loadValuationStudy({ portfolioId: listing.portfolioId, listingId: listing.id });
  if (!study) return introuvable;
  const pdf = await renderValuationStudyPdf(study);

  return new NextResponse(pdf.buffer as ArrayBuffer, {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `inline; filename="etude-portefeuille-${listing.publicNumber}.pdf"`,
      "Cache-Control": "private, no-store",
      "X-Content-Type-Options": "nosniff",
    },
  });
}
