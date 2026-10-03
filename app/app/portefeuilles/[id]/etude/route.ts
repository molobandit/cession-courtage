import { NextResponse } from "next/server";
import { getActor, isAdmin } from "@/lib/authz";
import { ownsFirm } from "@/lib/authz/policies";
import { loadValuationStudy } from "@/lib/listing/valuation-study";
import { renderValuationStudyPdf } from "@/lib/listing/valuation-study-pdf";
import { prisma } from "@/lib/prisma";

/**
 * Étude / estimation anonymisée d’un portefeuille, en PDF.
 *
 * Réservée au cédant propriétaire et à l’admin. Un acquéreur ne la télécharge
 * pas depuis cette route : ce n’est pas la présentation nominative du cabinet.
 */
export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const introuvable = NextResponse.json({ error: "Document introuvable." }, { status: 404 });
  const actor = await getActor();
  if (!actor) return introuvable;

  const portfolio = await prisma.portfolio.findUnique({
    where: { id },
    select: { id: true, firmId: true },
  });
  if (!portfolio) return introuvable;
  if (!ownsFirm(actor, portfolio.firmId) && !isAdmin(actor)) return introuvable;

  const study = await loadValuationStudy({ portfolioId: portfolio.id });
  if (!study) return introuvable;
  const pdf = await renderValuationStudyPdf(study);
  const suffix = study.publicNumber ?? "estimation";

  return new NextResponse(pdf.buffer as ArrayBuffer, {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `inline; filename="etude-portefeuille-${suffix}.pdf"`,
      "Cache-Control": "private, no-store",
      "X-Content-Type-Options": "nosniff",
    },
  });
}
