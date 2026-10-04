import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { DossierViewer } from "@/components/listing/dossier-viewer";
import { getActor } from "@/lib/authz";
import { canViewListing } from "@/lib/authz/policies";
import { prisma } from "@/lib/prisma";

export async function generateMetadata({ params }: { params: Promise<{ numero: string }> }): Promise<Metadata> {
  const { numero } = await params;
  return { title: `Dossier de présentation n° ${numero}` };
}

/** Le dossier de présentation, lu dans l'application. Mêmes droits que le PDF. */
export default async function DossierPage({ params }: { params: Promise<{ numero: string }> }) {
  const { numero } = await params;
  const publicNumber = Number(numero);
  if (!Number.isFinite(publicNumber)) notFound();
  const actor = await getActor();
  const listing = await prisma.listing.findFirst({
    where: { publicNumber },
    select: { id: true, publicNumber: true, portfolioId: true, status: true, portfolio: { select: { firmId: true } } },
  });
  if (!listing || !canViewListing(actor, listing)) notFound();

  return (
    <DossierViewer
      publicNumber={listing.publicNumber}
      pdfHref={`/annonces/${listing.publicNumber}/etude`}
      listingHref={`/annonces/${listing.publicNumber}`}
    />
  );
}
