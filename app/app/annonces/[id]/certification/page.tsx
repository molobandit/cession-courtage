import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { CertificationDocRowForm } from "@/components/listing/certification-doc-form";
import { canSell, findMyListing, getActor, isOriasVerified } from "@/lib/authz";
import { ensureCertificationSlots } from "@/lib/listing/certification-docs";

export const metadata = { title: "Certification" };

export default async function ListingCertificationPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const actor = await getActor();
  if (!actor) redirect("/connexion");
  if (!isOriasVerified(actor)) redirect("/en-attente-orias");
  if (!canSell(actor)) redirect("/app");
  const { id } = await params;
  const listing = await findMyListing(id, actor);
  if (!listing) notFound();

  const docs = await ensureCertificationSlots(listing.id);

  return (
    <main className="mx-auto max-w-3xl px-4 py-6">
      <p className="text-sm text-muted">
        <Link href={`/app/annonces/${listing.id}`} className="underline-offset-2 hover:underline">
          Annonce #{listing.publicNumber}
        </Link>
      </p>
      <h1 className="mt-2 text-2xl font-bold tracking-tight text-ink">
        Espace documentaire
      </h1>
      <p className="mt-2 text-[15px] leading-relaxed text-muted">
        Pièces destinées à la due diligence. Elles ne sont jamais publiées.
        Statuts : à déposer, reçu, à compléter, validé.
      </p>
      {docs.length === 0 ? (
        <p className="mt-6 text-[15px] text-muted">
          L’espace documentaire n’est pas encore disponible sur cette base.
          Appliquez la migration 0007, puis rechargez cette page.
        </p>
      ) : (
        <ul className="mt-6 grid gap-4">
          {docs.map((doc) => (
            <CertificationDocRowForm key={doc.id} listingId={listing.id} doc={doc} />
          ))}
        </ul>
      )}
    </main>
  );
}
