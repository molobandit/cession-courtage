import Link from "next/link";
import { notFound } from "next/navigation";
import { Button } from "@/components/ui/button";
import { ChipGroup } from "@/components/listing/chips";
import { RankedBars } from "@/components/charts/ranked-bars";
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
import { INTEREST_DEPOSIT_LABEL, interestDepositFor } from "@/lib/billing/rates";
import { formatCount, formatEuroWhole } from "@/lib/format/number";
import { LISTING_STATUS_LABELS, RISK_TYPE_LABELS, SEGMENT_LABELS } from "@/lib/labels";
import { OFFER_WINDOW_DAYS } from "@/lib/listing/constants";
import { listCertificationStatuses } from "@/lib/listing/certification";
import { profileFromLinesWithClients } from "@/lib/listing/profile";

export const metadata = { title: "Dossier" };

const DAY_MS = 24 * 60 * 60 * 1000;

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
    sourceLines.map((l) => ({ ...l, annualCommission: Number(l.annualCommission) })),
  );

  const verified = actor ? isOriasVerified(actor) : false;
  const isSeller = Boolean(actor && ownsFirm(actor, listing.portfolio.firmId));
  const sealed = isOfferWindowSealed(listing);
  const canOffer = Boolean(
    verified && actor && canBuy(actor) && listing.status === "OFFERS_OPEN" && sealed && !isSeller,
  );

  let ownOffer = null;
  if (actor && verified) {
    const result = await listOffersForListing(listing.id, actor).catch(() => null);
    if (result?.access === "own") ownOffer = result.offers[0] ?? null;
  }

  const mailboxOk = Boolean(actor && verified && (await isListingMailboxParty(actor, listing.id)));
  const messages = mailboxOk && actor ? await listListingMessages(listing.id, actor) : [];
  const recipients =
    mailboxOk && actor && isSeller ? await listListingMailboxRecipients(listing.id, actor) : [];

  const daysLeft = listing.offerWindowClosesAt
    ? Math.ceil((listing.offerWindowClosesAt.getTime() - Date.now()) / DAY_MS)
    : null;

  const riskShares = profile.riskMix.map((row) => ({
    label: RISK_TYPE_LABELS[row.riskType] ?? row.riskType,
    value: Math.round(row.commissions * 100) / 100,
    share: row.share,
    contracts: 0,
  }));

  const KPIS = [
    { label: "Prix demandé", value: formatEuroWhole(Number(listing.askingPrice)) },
    { label: "Commissions / an", value: formatEuroWhole(profile.annualCommissions) },
    { label: "Contrats", value: formatCount(profile.contractCount) },
    { label: "Clients", value: formatCount(profile.clientCount) },
  ];
  const deposit = interestDepositFor(Number(listing.askingPrice));
  const certification =
    (await listCertificationStatuses([listing.id])).get(listing.id) ?? "NONE";
  const certified = certification === "CERTIFIED";

  return (
    <main>
      <section className="border-b border-line bg-indigo-soft text-ink">
        <div className="mx-auto max-w-4xl px-4 py-12">
          <p className="text-[15px] text-muted">
            <Link href="/annonces" className="underline-offset-4 hover:text-indigo-dark hover:underline">
              Annonces
            </Link>
          </p>
          <h1 className="tabular mt-3 font-serif text-4xl font-semibold">
            Portefeuille #{listing.publicNumber}
          </h1>
          <div className="mt-4 flex flex-wrap gap-2">
            {certified ? (
              <span className="rounded-full bg-indigo px-3 py-1 text-sm font-medium text-white">
                Portefeuille certifié
              </span>
            ) : (
              <span className="rounded-full border border-line bg-surface px-3 py-1 text-sm text-muted">
                Annonce simple
              </span>
            )}
            <span className="rounded-full border border-line bg-surface px-3 py-1 text-sm text-muted">
              {listing.isNationwide ? "Couverture nationale" : listing.displayedZone}
            </span>
            <span className="rounded-full border border-line bg-surface px-3 py-1 text-sm text-muted">
              {LISTING_STATUS_LABELS[listing.status]}
            </span>
            {listing.isPartial ? (
              <span className="rounded-full border border-line bg-surface px-3 py-1 text-sm text-muted">
                Cession partielle
              </span>
            ) : null}
            {listing.sellerSupportMonths > 0 ? (
              <span className="rounded-full border border-line bg-surface px-3 py-1 text-sm text-muted">
                Accompagnement de {listing.sellerSupportMonths} mois
              </span>
            ) : null}
          </div>
          <p className="mt-5 max-w-2xl text-[15px] leading-relaxed text-muted">
            Fiche anonyme. Ni raison sociale, ni commune, et aucune donnée nominative de
            client final. Les coordonnées du cédant sont dévoilées après un dépôt de{" "}
            {INTEREST_DEPOSIT_LABEL} du prix demandé ({formatEuroWhole(deposit)} ici).
            En démo, aucun montant n’est débité.
          </p>
        </div>
      </section>

      <div className="mx-auto max-w-4xl px-4 py-10">
        <section className="grid grid-cols-2 gap-px overflow-hidden rounded-3xl border border-line bg-line lg:grid-cols-4">
          {KPIS.map((kpi) => (
            <div key={kpi.label} className="bg-paper p-5">
              <p className="text-sm text-muted">{kpi.label}</p>
              <p className="tabular mt-1.5 font-serif text-xl font-semibold text-ink">{kpi.value}</p>
            </div>
          ))}
        </section>

        <section className="mt-6 rounded-3xl border border-line bg-paper p-6">
          <div className="space-y-4">
            <ChipGroup label="Compagnies" items={profile.carriers} limit={5} />
            <ChipGroup
              label="Clientèles"
              items={profile.clientSegments.map(
                (s) => SEGMENT_LABELS[s as keyof typeof SEGMENT_LABELS] ?? s,
              )}
              limit={3}
            />
            <ChipGroup
              label="Départements"
              items={profile.departments.map((d) => `Département ${d}`)}
              limit={5}
            />
          </div>
        </section>

        <div className="mt-6">
          <RankedBars
            title="Répartition par branche"
            subtitle="Part des commissions annuelles portée par chaque branche."
            shares={riskShares.slice(0, 8)}
          />
        </div>

        {/* Interet */}
        {!isSeller && !canOffer ? (
          <section className="mt-8 rounded-3xl border border-indigo-line bg-indigo-soft p-7">
            <h2 className="font-serif text-2xl font-semibold text-ink">Je suis intéressé</h2>
            <p className="mt-2 max-w-2xl text-[15px] leading-relaxed text-muted">
              La messagerie reste anonyme. Pour obtenir les coordonnées du cédant, un
              dépôt de {INTEREST_DEPOSIT_LABEL} ({formatEuroWhole(deposit)}) est prévu.
              Ce dépôt n’est pas encaissé sur cette démo.
            </p>
            <div className="mt-5 flex flex-wrap gap-3">
              {!actor ? (
                <Button asChild variant="primary">
                  <Link href="/connexion">Se connecter pour manifester un intérêt</Link>
                </Button>
              ) : (
                <Button asChild variant="primary">
                  <Link href="#offre">Déposer une offre</Link>
                </Button>
              )}
              <Button asChild variant="outline">
                <Link href="/certification">Voir la certification</Link>
              </Button>
            </div>
          </section>
        ) : null}

        {/* Offre */}
        {canOffer ? (
          <section id="offre" className="mt-8 rounded-3xl border border-indigo-line bg-indigo-soft p-7">
            <h2 className="font-serif text-2xl font-semibold text-ink">Déposer une offre</h2>
            <p className="mt-2 max-w-2xl text-[15px] leading-relaxed text-muted">
              Le cédant ne verra ni votre montant ni le nombre de propositions avant la
              clôture. Aucun autre candidat ne verra votre offre.
              {daysLeft !== null && daysLeft >= 0
                ? ` Il reste ${daysLeft} jour${daysLeft > 1 ? "s" : ""}.`
                : ""}
            </p>
            <div className="mt-6">
              {ownOffer ? (
                <p className="text-[15px] text-ink">
                  Votre offre de{" "}
                  <span className="tabular font-medium">
                    {formatEuroWhole(Number(ownOffer.amount))}
                  </span>{" "}
                  est enregistrée. Vous pouvez la retirer tant qu’elle n’a pas été retenue.
                </p>
              ) : (
                <SubmitOfferForm
                  listingId={listing.id}
                  asking={String(Number(listing.askingPrice))}
                />
              )}
            </div>
          </section>
        ) : listing.status === "OFFERS_OPEN" && sealed ? (
          <section className="mt-8 rounded-3xl border border-line bg-paper p-7">
            <h2 className="font-serif text-xl font-semibold text-ink">
              Fenêtre d’offres en cours
            </h2>
            <p className="mt-2 max-w-2xl text-[15px] leading-relaxed text-muted">
              Les propositions restent masquées pendant {OFFER_WINDOW_DAYS} jours, y compris
              pour le cédant. Elles s’ouvrent toutes en même temps à la clôture.
            </p>
            {!actor ? (
              <Button asChild variant="primary" className="mt-5">
                <Link href="/connexion">Se connecter pour déposer une offre</Link>
              </Button>
            ) : null}
          </section>
        ) : null}

        {isSeller ? (
          <div className="mt-8">
            <Button asChild variant="outline">
              <Link href={`/app/annonces/${listing.id}`}>Gérer cette annonce</Link>
            </Button>
          </div>
        ) : null}

        {mailboxOk && actor ? (
          <section className="mt-10">
            <h2 className="font-serif text-xl font-semibold text-ink">Messages</h2>
            <p className="mt-1.5 text-[15px] text-muted">
              Fil réservé au cédant et aux acquéreurs ayant déposé une offre. Un acquéreur
              ne voit jamais les messages d’un autre.
            </p>
            <ul className="mt-4 space-y-3">
              {messages.map((m) => (
                <li key={m.id} className="rounded-3xl border border-line bg-paper p-5">
                  <p className="text-sm text-muted">{m.sender.publicAlias}</p>
                  <p className="mt-1.5 text-[15px] leading-relaxed text-ink">{m.body}</p>
                </li>
              ))}
              {messages.length === 0 ? (
                <li className="rounded-3xl border border-line bg-paper p-5 text-[15px] text-muted">
                  Aucun message pour le moment.
                </li>
              ) : null}
            </ul>
            <div className="mt-5">
              <MessageForm listingId={listing.id} recipients={isSeller ? recipients : undefined} />
            </div>
          </section>
        ) : null}
      </div>
    </main>
  );
}
