import { NextResponse } from "next/server";
import { getActor, isAdmin } from "@/lib/authz";
import { ownsFirm } from "@/lib/authz/policies";
import { loadValuationStudy } from "@/lib/listing/valuation-study";
import { buildPresentationDossierHtml, presentationDossierFileName } from "@/lib/listing/presentation-dossier";
import { presentationDossierAssets } from "@/lib/listing/presentation-dossier-assets";
import { printPresentationDossier } from "@/lib/listing/presentation-dossier-pdf";
import { renderValuationStudyPdf } from "@/lib/listing/valuation-study-pdf";
import { prisma } from "@/lib/prisma";

/**
 * Étude / estimation anonymisée d’un portefeuille, en PDF.
 *
 * Réservée au cédant propriétaire et à l’admin. Un acquéreur ne la télécharge
 * pas depuis cette route : ce n’est pas la présentation nominative du cabinet.
 */
export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
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
  const listing = await prisma.listing.findFirst({
    where: { portfolioId: portfolio.id },
    orderBy: { publishedAt: "desc" },
    select: { publicNumber: true, askingPrice: true, certificationStatus: true },
  });
  const origin = new URL(request.url).origin;
  const html = buildPresentationDossierHtml(study, {
    certified: listing?.certificationStatus === "CERTIFIED",
    askingPrice: listing ? Number(listing.askingPrice) : undefined,
    recipient: null,
    listingUrl: listing ? `${origin}/annonces/${listing.publicNumber}` : null,
    ...(await presentationDossierAssets(origin)),
  });
  const pdf = (await printPresentationDossier(html, study.publicNumber)) ?? (await renderValuationStudyPdf(study));

  return new NextResponse(pdf.buffer as ArrayBuffer, {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `inline; filename="${presentationDossierFileName(study.publicNumber)}"`,
      /*
       * Cinq minutes dans le cache du navigateur, pour lui seul.
       *
       * Le lecteur PDF réclame le même fichier deux ou trois fois de suite ;
       * sans cela chaque demande repartait au serveur, et rouvrir le dossier
       * retéléchargeait 250 ko. La copie est privée : elle ne sort pas du
       * navigateur du destinataire.
       */
      "Cache-Control": "private, max-age=300",
      /*
       * Pas de requête partielle : le fichier part entier.
       *
       * Le lecteur PDF demande volontiers des tranches (en-tête Range). Nous
       * ne savons pas y répondre en 206, et une réponse 200 à une demande de
       * tranche le laissait rejouer sa requête. Autant le dire.
       */
      "Accept-Ranges": "none",
      "X-Content-Type-Options": "nosniff",
    },
  });
}
