import { NextResponse } from "next/server";
import { getActor, getListingByPublicNumber, isAdmin } from "@/lib/authz";
import { ownsFirm } from "@/lib/authz/policies";
import { actorCanReadCompanyDocs } from "@/lib/listing/company-docs";
import { loadCompanyPresentation } from "@/lib/listing/company-presentation";
import { buildCompanyPresentationHtml, companyPresentationFileName } from "@/lib/listing/company-presentation-html";
import { renderCompanyPresentationPdf } from "@/lib/listing/company-presentation-pdf";
import { printableDossierHtml } from "@/lib/listing/presentation-dossier";
import { presentationDossierAssets } from "@/lib/listing/presentation-dossier-assets";
import { printPresentationDossier } from "@/lib/listing/presentation-dossier-pdf";
import { prisma } from "@/lib/prisma";

/**
 * Présentation détaillée du cabinet cédant, en PDF.
 *
 * Elle nomme le cabinet : mêmes droits que les pièces du cabinet, c'est-à-dire
 * le cédant lui-même, ou l'acquéreur abonné qui a déposé son engagement (et
 * accepté la confidentialité). Tout autre demandeur reçoit une 404.
 */
export async function GET(request: Request, { params }: { params: Promise<{ numero: string }> }) {
  const { numero } = await params;
  const introuvable = NextResponse.json({ error: "Document introuvable." }, { status: 404 });
  const publicNumber = Number(numero);
  if (!Number.isFinite(publicNumber)) return introuvable;
  const actor = await getActor();
  if (!actor) return introuvable;
  const listing = await getListingByPublicNumber(publicNumber, actor);
  if (!listing) return introuvable;

  const autorise = ownsFirm(actor, listing.portfolio.firmId) || isAdmin(actor) || (await actorCanReadCompanyDocs(listing.id));
  if (!autorise) return introuvable;

  const presentation = await loadCompanyPresentation(listing.id);
  if (!presentation) return introuvable;
  const proprietaire = ownsFirm(actor, listing.portfolio.firmId) || isAdmin(actor);
  const origin = new URL(request.url).origin;
  const download = new URL(request.url).searchParams.has("telecharger");
  const html = buildCompanyPresentationHtml(presentation, {
    recipient: proprietaire ? null : { label: `l'acquéreur ${actor.publicAlias}`, date: new Date() },
    ...(await presentationDossierAssets(origin)),
  });
  if (new URL(request.url).searchParams.has("impression")) {
    if (!proprietaire) {
      await prisma.auditLog
        .create({ data: { actorId: actor.id, action: "listing.presentation.printed", entityType: "Listing", entityId: listing.id } })
        .catch(() => undefined);
    }
    return new NextResponse(printableDossierHtml(html, `/annonces/${publicNumber}/cabinet`), {
      headers: { "Content-Type": "text/html; charset=utf-8", "Cache-Control": "private, no-store" },
    });
  }
  // Même impression que le dossier de présentation ; à défaut, l'ancien format.
  const pdf =
    (await printPresentationDossier(html, presentation.publicNumber, "cabinets")) ??
    (await renderCompanyPresentationPdf(presentation));

  if (!ownsFirm(actor, listing.portfolio.firmId)) {
    await prisma.auditLog
      .create({ data: { actorId: actor.id, action: "listing.presentation.viewed", entityType: "Listing", entityId: listing.id } })
      .catch(() => undefined);
  }

  return new NextResponse(pdf.buffer as ArrayBuffer, {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `${download ? "attachment" : "inline"}; filename="${companyPresentationFileName(publicNumber)}"`,
      "Cache-Control": "private, no-store",
      "X-Content-Type-Options": "nosniff",
    },
  });
}
