import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { DossierViewer } from "@/components/listing/dossier-viewer";
import { getActor, getListingByPublicNumber, isAdmin } from "@/lib/authz";
import { ownsFirm } from "@/lib/authz/policies";
import { actorCanReadCompanyDocs } from "@/lib/listing/company-docs";

export async function generateMetadata({ params }: { params: Promise<{ numero: string }> }): Promise<Metadata> {
  const { numero } = await params;
  return { title: `Présentation du cabinet · dossier n° ${numero}` };
}

/** La présentation nominative du cabinet, lue dans l'application. Mêmes droits que le PDF. */
export default async function CabinetPage({ params }: { params: Promise<{ numero: string }> }) {
  const { numero } = await params;
  const publicNumber = Number(numero);
  if (!Number.isFinite(publicNumber)) notFound();
  const actor = await getActor();
  if (!actor) notFound();
  const listing = await getListingByPublicNumber(publicNumber, actor);
  if (!listing) notFound();
  const autorise = ownsFirm(actor, listing.portfolio.firmId) || isAdmin(actor) || (await actorCanReadCompanyDocs(listing.id));
  if (!autorise) notFound();

  return (
    <DossierViewer
      publicNumber={listing.publicNumber}
      title={`Présentation du cabinet · dossier n° ${listing.publicNumber}`}
      pdfHref={`/annonces/${listing.publicNumber}/presentation-cabinet`}
      listingHref={`/annonces/${listing.publicNumber}`}
    />
  );
}
