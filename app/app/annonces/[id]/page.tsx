import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { OpenOffersButton, PublishListingButton, WithdrawListingButton } from "@/components/listing/listing-forms";
import { OfferChat } from "@/components/chat/offer-chat";
import { Button } from "@/components/ui/button";
import {
  canSell,
  findMyListing,
  getActor,
  isOriasVerified,
  listListingMailboxRecipients,
  listListingMessages,
} from "@/lib/authz";
import { isOfferWindowSealed } from "@/lib/authz/policies";
import { formatDate, formatDateTime, formatEuro } from "@/lib/format/fr";
import { DeskPageHeader } from "@/components/app/desk";
import { MarketBadge } from "@/components/listing/market-badge";
import { marketStatus } from "@/lib/listing/market-status";
import { listListingPositions } from "@/lib/position/load";
import { listCompanyDocs } from "@/lib/listing/company-docs";
import { CompanyDocumentsPanel } from "@/components/listing/company-documents-panel";

export const metadata = { title: "Annonce" };

export default async function SellerListingPage({ params }: { params: Promise<{ id: string }> }) {
  const actor = await getActor();
  if (!actor) redirect("/connexion");
  if (!isOriasVerified(actor)) redirect("/en-attente-orias");
  if (!canSell(actor)) redirect("/app");
  const { id } = await params;
  const listing = await findMyListing(id, actor);
  if (!listing) notFound();

  const sealed = isOfferWindowSealed(listing);
  const messages = await listListingMessages(id, actor);
  const recipients = await listListingMailboxRecipients(id, actor);
  const companyDocs = await listCompanyDocs(id);
  const candidats = await listListingPositions(listing.id);
  const offres = candidats.filter((c) => c.offer && c.offer.status === "SUBMITTED").length;
  const cotation = marketStatus({ status: listing.status, offerWindowClosesAt: listing.offerWindowClosesAt });

  return (
    <main className="mx-auto w-full max-w-5xl px-4 py-6 sm:px-6 sm:py-8">
      <DeskPageHeader
        back={{ href: "/app/cessions", label: "Mes cessions" }}
        kicker="Mon annonce"
        badge={<MarketBadge label={cotation.label} tone={cotation.tone} detail={cotation.detail} />}
        title={`Dossier N° ${listing.publicNumber}`}
        subtitle={<>{listing.portfolio.label} · {listing.displayedZone}{listing.offerWindowClosesAt ? ` · offres scellées ${sealed ? "jusqu’au" : "closes depuis le"} ${formatDate(listing.offerWindowClosesAt)}` : ""}</>}
        figures={[
          { label: "Prix demandé", value: formatEuro(listing.askingPrice) },
          { label: "Candidats", value: String(candidats.length), note: "Acquéreurs ayant pris position" },
          { label: "Offres", value: String(offres), note: sealed ? "Montants visibles à la clôture" : "Visibles, à comparer", accent: offres > 0 && !sealed },
        ]}
        actions={
          <>
            {listing.status === "DRAFT" || listing.status === "WITHDRAWN" ? <PublishListingButton listingId={listing.id} /> : null}
            {listing.status === "PUBLISHED" || listing.status === "DRAFT" ? <OpenOffersButton listingId={listing.id} /> : null}
            <Link
              href={`/app/annonces/${listing.id}/offres`}
              className="inline-flex h-10 items-center rounded-full bg-indigo px-4 text-[14px] font-semibold !text-white hover:bg-indigo-dark"
            >
              Carnet d’offres
            </Link>
            <Link
              href={`/annonces/${listing.publicNumber}`}
              className="inline-flex h-10 items-center rounded-full border border-indigo bg-paper px-4 text-[14px] font-semibold !text-indigo-dark hover:bg-indigo-soft"
            >
              Fiche publique
            </Link>
          </>
        }
      />

      <div className="mt-4 flex flex-wrap gap-2">
        <Button asChild variant="outline" size="sm">
          <Link href={`/app/annonces/${listing.id}/certification`}>Espace documentaire</Link>
        </Button>
        {listing.status !== "SOLD" && listing.status !== "UNDER_NEGOTIATION" ? (
          <WithdrawListingButton listingId={listing.id} />
        ) : null}
      </div>

      <div className="mt-6">
        <CompanyDocumentsPanel listingId={listing.id} publicNumber={listing.publicNumber} docs={companyDocs} canUpload canDownload />
      </div>

      <section id="echanges" className="mt-6">
        <h2 className="text-lg font-semibold text-ink">Échanges avec les acquéreurs</h2>
        <p className="mt-1 text-[14px] text-muted">
          Un fil par offreur. Les numéros de portable sont bloqués.
        </p>
        <div className="mt-3">
          <OfferChat
            listingId={listing.id}
            actorId={actor.id}
            recipients={recipients}
            messages={messages.map((m) => ({
              id: m.id,
              body: m.body,
              createdLabel: formatDateTime(m.createdAt),
              senderId: m.senderId,
              senderAlias: m.sender.publicAlias,
            }))}
          />
        </div>
      </section>
    </main>
  );
}
