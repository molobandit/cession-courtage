import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { MemberPageHeader } from "@/components/app/member-page-header";
import { CreateListingForm } from "@/components/listing/listing-forms";
import { canSell, findMyListing, findMyPortfolio, getActor, isOriasVerified } from "@/lib/authz";
import { loadListingBriefFields } from "@/lib/listing/brief-fields";
import { defaultsFromBrief } from "@/lib/listing/form-defaults";

export const metadata = { title: "Modifier l’annonce" };

export default async function EditListingPage({ params }: { params: Promise<{ id: string }> }) {
  const actor = await getActor();
  if (!actor) redirect("/connexion");
  if (!isOriasVerified(actor)) redirect("/en-attente-orias");
  if (!canSell(actor)) redirect("/app");
  const { id } = await params;
  const listing = await findMyListing(id, actor);
  if (!listing) notFound();
  if (listing.status !== "DRAFT" && listing.status !== "WITHDRAWN") redirect(`/app/annonces/${listing.id}`);

  const [portfolio, brief] = await Promise.all([findMyPortfolio(listing.portfolioId, actor), loadListingBriefFields(listing.id)]);
  if (!portfolio) notFound();
  const montant = (v: unknown) => (v != null ? String(Number(v)) : "");

  return (
    <main className="mx-auto max-w-3xl px-4 py-6 sm:px-6 sm:py-8">
      <Link href={`/app/annonces/${listing.id}`} className="text-sm text-muted underline-offset-2 hover:underline">
        Retour à l’annonce
      </Link>
      <MemberPageHeader title={`Modifier le dossier N° ${listing.publicNumber}`}>
        {portfolio.label}. Corrigez ce qui doit l’être, enregistrez, puis soumettez de nouveau l’annonce à la relecture.
      </MemberPageHeader>
      {listing.reviewNote ? (
        <p className="mt-4 rounded-2xl border border-warn/30 bg-warn/5 px-4 py-3 text-[15px] text-ink">
          <span className="font-semibold">Motif de l’équipe :</span> {listing.reviewNote.replace(/[.\s]+$/, "")}.
        </p>
      ) : null}
      <div className="mt-4">
        <CreateListingForm
          portfolioId={portfolio.id}
          listingId={listing.id}
          defaultAsking={String(Math.round(Number(listing.askingPrice)))}
          defaultCertify={brief.certificationRequested}
          defaults={defaultsFromBrief(brief, listing.sellerSupportMonths)}
          qualityDefaults={{
            commissionsYear1: montant(portfolio.commissionsYear1),
            commissionsYear2: montant(portfolio.commissionsYear2),
            commissionsYear3: montant(portfolio.commissionsYear3),
            recurrentSharePercent:
              portfolio.recurrentCommissionShare != null ? String(Math.round(Number(portfolio.recurrentCommissionShare) * 100)) : "",
            managedAnnualPremium: montant(portfolio.managedAnnualPremium),
          }}
        />
      </div>
    </main>
  );
}
