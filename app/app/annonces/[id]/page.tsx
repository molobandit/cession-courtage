import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { OpenOffersButton, PublishListingButton, WithdrawListingButton } from "@/components/listing/listing-forms";
import { MessageForm } from "@/components/deal/deal-forms";
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
import { formatDate, formatEuro } from "@/lib/format/fr";
import { LISTING_STATUS_LABELS } from "@/lib/labels";
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

  return (
    <main className="mx-auto max-w-4xl px-4 py-6">
      <p className="text-sm text-muted">
        <Link href="/app" className="underline-offset-2 hover:underline">
          Espace membre
        </Link>
        {" · "}
        <Link href={`/annonces/${listing.publicNumber}`} className="underline-offset-2 hover:underline">
          Fiche publique
        </Link>
      </p>
      <h1 className="mt-1 text-2xl font-bold tracking-tight text-ink">Dossier n° {listing.publicNumber}</h1>
      <p className="text-sm text-muted">
        {listing.portfolio.label} · {LISTING_STATUS_LABELS[listing.status]} · {formatEuro(listing.askingPrice)} ·{" "}
        {listing.displayedZone}
      </p>
      {listing.offerWindowClosesAt ? (
        <p className="mt-1 text-sm text-muted">
          Fenêtre {sealed ? "ouverte jusqu'au" : "close depuis le"} {formatDate(listing.offerWindowClosesAt)}
        </p>
      ) : null}

      <div className="mt-4 flex flex-wrap gap-2">
        {listing.status === "DRAFT" || listing.status === "WITHDRAWN" ? (
          <PublishListingButton listingId={listing.id} />
        ) : null}
        {listing.status === "PUBLISHED" || listing.status === "DRAFT" ? (
          <OpenOffersButton listingId={listing.id} />
        ) : null}
        {listing.status !== "SOLD" && listing.status !== "UNDER_NEGOTIATION" ? (
          <WithdrawListingButton listingId={listing.id} />
        ) : null}
        <Button asChild variant="outline" size="sm">
          <Link href={`/app/annonces/${listing.id}/certification`}>Espace documentaire</Link>
        </Button>
      </div>

      <div className="mt-6">
        <CompanyDocumentsPanel listingId={listing.id} docs={companyDocs} canUpload canDownload />
      </div>

      <section className="mt-6">
        <h2 className="text-lg font-semibold text-ink">Offres</h2>
        <p className="mt-2 text-sm text-muted">
          <Link href={`/app/annonces/${listing.id}/offres`} className="font-medium text-indigo-dark hover:underline">
            Comparer les offres
          </Link>
        </p>
      </section>

      <section className="mt-6">
        <h2 className="text-lg font-semibold text-ink">Messages</h2>
        <ul className="mt-2 space-y-2 text-sm">
          {messages.map((m) => (
            <li key={m.id} className="border border-line bg-paper p-2">
              <span className="text-xs text-muted">{m.sender.publicAlias}</span>
              <p>{m.body}</p>
            </li>
          ))}
        </ul>
        <div className="mt-3">
          <MessageForm listingId={listing.id} recipients={recipients} />
        </div>
      </section>
    </main>
  );
}
