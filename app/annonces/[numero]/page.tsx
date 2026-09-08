import Link from "next/link";
import { notFound } from "next/navigation";
import { MessageForm } from "@/components/deal/deal-forms";
import { SubmitOfferForm } from "@/components/offer/offer-forms";
import {
  canBuy,
  getActor,
  getListingByPublicNumber,
  isListingMailboxParty,
  isOriasVerified,
  listListingMailboxRecipients,
  listListingMessages,
  listOffersForListing,
} from "@/lib/authz";
import { isOfferWindowSealed, ownsFirm } from "@/lib/authz/policies";
import { formatEuro, formatPercent } from "@/lib/format/fr";
import { LISTING_STATUS_LABELS, RISK_TYPE_LABELS } from "@/lib/labels";
import { profileFromLinesWithClients } from "@/lib/listing/profile";

export const metadata = { title: "Dossier" };

export default async function PublicListingPage({
  params,
}: {
  params: Promise<{ numero: string }>;
}) {
  const { numero } = await params;
  const publicNumber = Number(numero);
  if (!Number.isFinite(publicNumber)) notFound();
  const actor = await getActor();
  const listing = await getListingByPublicNumber(publicNumber, actor);
  if (!listing) notFound();

  let sourceLines = listing.portfolio.contractLines;
  if (listing.isPartial && listing.lines.length > 0) {
    const allowed = new Set(listing.lines.map((l) => l.contractLineId));
    sourceLines = sourceLines.filter((l) => allowed.has(l.id));
  }
  const profile = profileFromLinesWithClients(
    sourceLines.map((l) => ({
      ...l,
      annualCommission: Number(l.annualCommission),
    })),
  );

  const verified = actor ? isOriasVerified(actor) : false;
  const isSeller = Boolean(actor && ownsFirm(actor, listing.portfolio.firmId));
  const sealed = isOfferWindowSealed(listing);
  const canOffer = Boolean(verified && actor && canBuy(actor) && listing.status === "OFFERS_OPEN" && sealed && !isSeller);

  let ownOffer = null;
  if (actor && verified) {
    const result = await listOffersForListing(listing.id, actor).catch(() => null);
    if (result?.access === "own") ownOffer = result.offers[0] ?? null;
  }

  const mailboxOk = Boolean(actor && verified && (await isListingMailboxParty(actor, listing.id)));
  const messages = mailboxOk && actor ? await listListingMessages(listing.id, actor) : [];
  const recipients = mailboxOk && actor && isSeller ? await listListingMailboxRecipients(listing.id, actor) : [];

  return (
    <main className="mx-auto max-w-4xl px-4 py-6">
      <p className="text-sm text-muted">
        <Link href="/annonces" className="underline-offset-2 hover:underline">
          Annonces
        </Link>
      </p>
      <h1 className="mt-1 font-serif text-2xl text-navy">Dossier #{listing.publicNumber}</h1>
      <p className="text-sm text-muted">
        {listing.displayedZone} · {LISTING_STATUS_LABELS[listing.status]}
        {listing.isPartial ? " · cession partielle" : ""}
        {listing.sellerSupportMonths ? ` · accompagnement ${listing.sellerSupportMonths} mois` : ""}
      </p>

      <section className="mt-4 grid gap-3 sm:grid-cols-3">
        <div className="border border-line bg-paper p-3">
          <p className="text-xs uppercase text-muted">Prix demandé</p>
          <p className="font-serif text-xl text-navy">{formatEuro(listing.askingPrice)}</p>
        </div>
        <div className="border border-line bg-paper p-3">
          <p className="text-xs uppercase text-muted">Commissions / an</p>
          <p className="font-serif text-xl text-navy">{formatEuro(profile.annualCommissions)}</p>
        </div>
        <div className="border border-line bg-paper p-3">
          <p className="text-xs uppercase text-muted">Contrats</p>
          <p className="font-serif text-xl text-navy">{profile.contractCount.toLocaleString("fr-FR")}</p>
        </div>
      </section>

      <section className="mt-6">
        <h2 className="font-serif text-lg text-navy">Mix de risques</h2>
        <ul className="mt-2 text-sm">
          {profile.riskMix.slice(0, 8).map((row) => (
            <li key={row.riskType}>
              {RISK_TYPE_LABELS[row.riskType]} · {formatPercent(row.share * 100)} · {formatEuro(row.commissions)}
            </li>
          ))}
        </ul>
        <p className="mt-2 text-xs text-muted">
          Compagnies : {profile.carriers.slice(0, 8).join(", ")}
          {profile.carriers.length > 8 ? "…" : ""}. Aucune donnée nominative de client final.
        </p>
      </section>

      {canOffer ? (
        <section className="mt-6 border border-line bg-paper p-4">
          <h2 className="font-serif text-lg text-navy">Offre scellée</h2>
          <p className="mb-3 text-sm text-muted">
            Le cédant ne verra ni le montant ni le nombre d&apos;offres avant la clôture de la fenêtre.
          </p>
          {ownOffer ? (
            <p className="text-sm">Votre offre de {formatEuro(ownOffer.amount)} est enregistrée.</p>
          ) : (
            <SubmitOfferForm listingId={listing.id} asking={String(Number(listing.askingPrice))} />
          )}
        </section>
      ) : listing.status === "OFFERS_OPEN" && sealed ? (
        <p className="mt-6 text-sm text-muted">
          Fenêtre d&apos;offres en cours.
          {!actor ? (
            <>
              {" "}
              <Link href="/connexion" className="underline-offset-2 hover:underline">
                Connectez-vous
              </Link>{" "}
              en tant qu&apos;acquéreur ORIAS pour déposer une offre.
            </>
          ) : null}
        </p>
      ) : null}

      {isSeller ? (
        <p className="mt-4 text-sm">
          <Link href={`/app/annonces/${listing.id}`} className="underline-offset-2 hover:underline">
            Gérer cette annonce
          </Link>
        </p>
      ) : null}

      {mailboxOk && actor ? (
        <section className="mt-8">
          <h2 className="font-serif text-lg text-navy">Messages</h2>
          <p className="text-xs text-muted">Fil réservé au cédant et aux acquéreurs ayant déposé une offre.</p>
          <ul className="mt-2 space-y-2 text-sm">
            {messages.map((m) => (
              <li key={m.id} className="border border-line bg-paper p-2">
                <span className="text-xs text-muted">#{m.sender.publicAlias}</span>
                <p>{m.body}</p>
              </li>
            ))}
          </ul>
          <div className="mt-3">
            <MessageForm listingId={listing.id} recipients={isSeller ? recipients : undefined} />
          </div>
        </section>
      ) : null}
    </main>
  );
}
