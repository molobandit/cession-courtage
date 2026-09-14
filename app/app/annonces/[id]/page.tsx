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

export default async function SellerListingPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ modifiee?: string }>;
}) {
  const actor = await getActor();
  if (!actor) redirect("/connexion");
  if (!isOriasVerified(actor)) redirect("/en-attente-orias");
  if (!canSell(actor)) redirect("/app");
  const { id } = await params;
  const { modifiee } = await searchParams;
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
        back={{ href: "/app/cessions", label: "Mes ventes" }}
        kicker="Mon annonce"
        badge={<MarketBadge label={cotation.label} tone={cotation.tone} detail={cotation.detail} />}
        title={`Dossier N° ${listing.publicNumber}`}
        subtitle={<>{listing.portfolio.label} · {listing.displayedZone}{listing.offerWindowClosesAt ? ` · séance ${sealed ? "ouverte jusqu’au" : "close depuis le"} ${formatDate(listing.offerWindowClosesAt)}` : ""}</>}
        figures={[
          { label: "Prix demandé", value: formatEuro(listing.askingPrice) },
          { label: "Candidats", value: String(candidats.length), note: "Acquéreurs ayant pris position" },
          { label: "Offres", value: String(offres), note: sealed ? "À retenir à la clôture de la séance" : "À comparer et retenir", accent: offres > 0 },
        ]}
        actions={
          <>
            {listing.status === "DRAFT" || listing.status === "WITHDRAWN" ? (
              <>
                <PublishListingButton listingId={listing.id} />
                <Link
                  href={`/app/annonces/${listing.id}/modifier`}
                  className="inline-flex h-10 items-center rounded-full border border-indigo bg-paper px-4 text-[14px] font-semibold !text-indigo-dark hover:bg-indigo-soft"
                >
                  Modifier l’annonce
                </Link>
              </>
            ) : null}
            {listing.status === "PUBLISHED" ? <OpenOffersButton listingId={listing.id} /> : null}
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

      {modifiee && (listing.status === "DRAFT" || listing.status === "WITHDRAWN") ? (
        <p className="mt-4 rounded-2xl border border-ok/30 bg-ok/5 px-4 py-3 text-[15px] text-ink">
          <span className="font-semibold">Modifications enregistrées.</span> Soumettez l’annonce pour publication quand elle est
          prête : l’équipe la relit avant sa mise en ligne.
        </p>
      ) : null}
      {listing.status === "PENDING_REVIEW" ? (
        <p className="mt-4 rounded-2xl border border-indigo-line bg-indigo-soft px-4 py-3 text-[15px] text-ink">
          <span className="font-semibold">En cours de cotation.</span> L’équipe relit votre annonce avant publication ; vous êtes
          prévenu dès sa décision. La mise en vente est gratuite.
        </p>
      ) : listing.status === "DRAFT" && listing.reviewNote ? (
        <p className="mt-4 rounded-2xl border border-warn/30 bg-warn/5 px-4 py-3 text-[15px] text-ink">
          <span className="font-semibold">Annonce à corriger.</span> Motif : {listing.reviewNote.replace(/[.\s]+$/, "")}.{" "}
          <Link href={`/app/annonces/${listing.id}/modifier`} className="font-semibold underline underline-offset-2">
            Corrigez-la
          </Link>{" "}
          puis soumettez-la de nouveau.
        </p>
      ) : null}

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
