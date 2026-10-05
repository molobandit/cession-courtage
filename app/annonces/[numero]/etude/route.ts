import { NextResponse } from "next/server";
import { getActor, isAdmin, isInvestor } from "@/lib/authz";
import { canViewListing, ownsFirm } from "@/lib/authz/policies";
import { positioningDate } from "@/lib/listing/company-docs";
import { loadValuationStudy } from "@/lib/listing/valuation-study";
import { buildPresentationDossierHtml, presentationDossierFileName, printableDossierHtml } from "@/lib/listing/presentation-dossier";
import { presentationDossierAssets } from "@/lib/listing/presentation-dossier-assets";
import { printPresentationDossier } from "@/lib/listing/presentation-dossier-pdf";
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
export async function GET(request: Request, { params }: { params: Promise<{ numero: string }> }) {
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
      askingPrice: true,
      certificationStatus: true,
      portfolio: { select: { firmId: true } },
    },
  });
  if (!listing) return introuvable;
  if (!canViewListing(actor, listing)) return introuvable;

  const study = await loadValuationStudy({ portfolioId: listing.portfolioId, listingId: listing.id });
  if (!study) return introuvable;

  /*
   * Chaque copie porte le pseudonyme de l'acquéreur qui l'ouvre.
   *
   * Et la date de son positionnement quand il en a un : la mention entre dans
   * l'empreinte du PDF, donc une date figée évite de réimprimer le dossier
   * chaque jour. Faute de positionnement, le jour de la lecture fait foi.
   */
  const owner = actor ? ownsFirm(actor, listing.portfolio.firmId) || isAdmin(actor) : false;
  const remisLe = actor && !owner ? ((await positioningDate(listing.id, actor.id, isInvestor(actor))) ?? new Date()) : null;
  const recipient = actor && remisLe ? { label: `l'acquéreur ${actor.publicAlias}`, date: remisLe } : null;
  const origin = new URL(request.url).origin;
  const download = new URL(request.url).searchParams.has("telecharger");
  const html = buildPresentationDossierHtml(study, {
    certified: listing.certificationStatus === "CERTIFIED",
    askingPrice: Number(listing.askingPrice),
    recipient,
    listingUrl: `${origin}/annonces/${listing.publicNumber}`,
    ...(await presentationDossierAssets(origin)),
  });
  // Impression : la page à imprimer, qui ne sort que les pages du dossier.
  if (new URL(request.url).searchParams.has("impression")) {
    return new NextResponse(printableDossierHtml(html, `/annonces/${listing.publicNumber}/dossier`), {
      headers: { "Content-Type": "text/html; charset=utf-8", "Cache-Control": "private, no-store" },
    });
  }
  // Le navigateur de Cloudflare imprime le dossier ; à défaut, l'ancien format.
  const pdf = (await printPresentationDossier(html, listing.publicNumber)) ?? (await renderValuationStudyPdf(study));

  return new NextResponse(pdf.buffer as ArrayBuffer, {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `${download ? "attachment" : "inline"}; filename="${presentationDossierFileName(listing.publicNumber)}"`,
      /*
       * Cinq minutes dans le cache du navigateur, pour lui seul.
       *
       * Le lecteur PDF réclame le même fichier deux ou trois fois de suite ;
       * sans cela chaque demande repartait au serveur, et rouvrir le dossier
       * retéléchargeait 250 ko. La copie est privée : elle ne sort pas du
       * navigateur du destinataire.
       */
      "Cache-Control": "private, max-age=300",
      "X-Content-Type-Options": "nosniff",
    },
  });
}
