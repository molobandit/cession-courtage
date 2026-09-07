import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { OpenOffersButton, PublishListingButton, WithdrawListingButton } from "@/components/listing/listing-forms";
import { MessageForm } from "@/components/deal/deal-forms";
import {
  canSell,
  findMyListing,
  getActor,
  isOriasVerified,
  listListingMailboxRecipients,
  listListingMessages,
  listOffersForListing,
} from "@/lib/authz";
import { isOfferWindowSealed } from "@/lib/authz/policies";
import { formatDate, formatEuro } from "@/lib/format/fr";
import { LISTING_STATUS_LABELS, OFFER_STATUS_LABELS } from "@/lib/labels";
import { AcceptOfferButton } from "@/components/offer/offer-forms";

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
  const offers = await listOffersForListing(id, actor);
  const messages = await listListingMessages(id, actor);
  const recipients = await listListingMailboxRecipients(id, actor);

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
      <h1 className="mt-1 font-serif text-2xl text-navy">Annonce #{listing.publicNumber}</h1>
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
      </div>

      <section className="mt-6">
        <h2 className="font-serif text-lg text-navy">Offres</h2>
        {offers.access === "sealed" ? (
          <p className="mt-2 border border-line bg-paper px-3 py-2 text-sm">
            Fenêtre en cours : montants et nombre d&apos;offres masqués, y compris pour vous.
          </p>
        ) : offers.offers.length === 0 ? (
          <p className="mt-2 text-sm text-muted">Aucune offre visible.</p>
        ) : (
          <table className="mt-2 w-full text-sm">
            <thead className="bg-cream text-left text-xs uppercase text-muted">
              <tr>
                <th className="px-2 py-1.5">Alias</th>
                <th className="px-2 py-1.5 text-right">Montant</th>
                <th className="px-2 py-1.5 text-right">Comptant</th>
                <th className="px-2 py-1.5">Statut</th>
                <th className="px-2 py-1.5" />
              </tr>
            </thead>
            <tbody>
              {offers.offers.map((o) => (
                <tr key={o.id} className="border-t border-line">
                  <td className="px-2 py-1.5">#{o.buyer.publicAlias}</td>
                  <td className="px-2 py-1.5 text-right">{formatEuro(o.amount)}</td>
                  <td className="px-2 py-1.5 text-right">{Number(o.upfrontPercent).toLocaleString("fr-FR")} %</td>
                  <td className="px-2 py-1.5">{OFFER_STATUS_LABELS[o.status]}</td>
                  <td className="px-2 py-1.5">
                    {o.status === "SUBMITTED" && offers.access === "full" ? (
                      <AcceptOfferButton offerId={o.id} />
                    ) : null}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </section>

      <section className="mt-6">
        <h2 className="font-serif text-lg text-navy">Messages</h2>
        <ul className="mt-2 space-y-2 text-sm">
          {messages.map((m) => (
            <li key={m.id} className="border border-line bg-paper p-2">
              <span className="text-xs text-muted">#{m.sender.publicAlias}</span>
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
