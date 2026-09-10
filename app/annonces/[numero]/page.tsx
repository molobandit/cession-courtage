import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Button } from "@/components/ui/button";
import { PublicListingDetail } from "@/components/listing/public-listing-detail";
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
import { hasContactSubscription } from "@/lib/billing/contact-access";
import { GROWTH_PLAN_ANNUAL_EUR, INTEREST_DEPOSIT_LABEL, interestDepositFor } from "@/lib/billing/rates";
import { EMPTY_CELL } from "@/lib/format/fr";
import { formatEuroWhole } from "@/lib/format/number";
import { LISTING_STATUS_LABELS, RISK_TYPE_LABELS, SEGMENT_LABELS } from "@/lib/labels";
import { OFFER_WINDOW_DAYS } from "@/lib/listing/constants";
import { loadListingBriefFields } from "@/lib/listing/brief-fields";
import { findMyDeposit } from "@/lib/listing/deposit";
import { listCertificationStatuses } from "@/lib/listing/certification";
import { DepositForm } from "@/components/listing/deposit-form";
import {
  breakdownBy,
  herfindahl,
  maturitySchedule,
  topClientShare,
  type AnalyticsLine,
} from "@/lib/portfolio/analytics";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ numero: string }>;
}): Promise<Metadata> {
  const { numero } = await params;
  return { title: `Portefeuille #${numero}` };
}

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

  const lines: AnalyticsLine[] = sourceLines.map((row) => ({
    carrier: row.carrier,
    riskType: row.riskType,
    clientSegment: row.clientSegment,
    department: row.department,
    clientKey: row.clientKey,
    annualCommission: Number(row.annualCommission),
    renewalDate: row.renewalDate,
    effectiveDate: row.effectiveDate,
  }));

  const askingPrice = Number(listing.askingPrice);
  const annualCommissions = Number(listing.portfolio.annualCommissions);
  const contractCount = listing.portfolio.contractCount;
  const clientCount = listing.portfolio.clientCount;
  const multiple = annualCommissions > 0 ? askingPrice / annualCommissions : null;

  const byCarrier = breakdownBy(lines, (l) => l.carrier);
  const byRisk = breakdownBy(
    lines,
    (l) => RISK_TYPE_LABELS[l.riskType as keyof typeof RISK_TYPE_LABELS] ?? l.riskType,
  );
  const bySegment = breakdownBy(
    lines,
    (l) => SEGMENT_LABELS[l.clientSegment as keyof typeof SEGMENT_LABELS] ?? l.clientSegment,
    4,
  );
  const byDepartment = breakdownBy(
    lines,
    (l) => (listing.isNationwide ? "France entière" : `Département ${l.department}`),
    6,
  );
  const carrierHhi = herfindahl(byCarrier);
  const top10 = topClientShare(lines);
  const schedule = maturitySchedule(lines, new Date());

  const verified = actor ? isOriasVerified(actor) : false;
  const isSeller = Boolean(actor && ownsFirm(actor, listing.portfolio.firmId));
  const sealed = isOfferWindowSealed(listing);
  const subscribed = Boolean(actor && (await hasContactSubscription(actor)));
  const canOffer = Boolean(
    verified &&
      actor &&
      canBuy(actor) &&
      subscribed &&
      listing.status === "OFFERS_OPEN" &&
      sealed &&
      !isSeller,
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

  const deposit = interestDepositFor(askingPrice);
  // Depot du demandeur uniquement : les depots concurrents ne le regardent pas.
  const myDeposit = actor && !isSeller ? await findMyDeposit(listing.id, actor.id) : null;
  const certification =
    (await listCertificationStatuses([listing.id])).get(listing.id) ?? "NONE";
  const certified = certification === "CERTIFIED";
  const brief = await loadListingBriefFields(listing.id);

  const zone = listing.isNationwide ? "France entière" : listing.displayedZone;
  const mainBranch = byRisk[0]?.label ?? "Portefeuille de courtage";
  const title = listing.isNationwide
    ? `Portefeuille ${mainBranch}, France entière`
    : `Portefeuille ${mainBranch}, ${zone}`;
  const segments = bySegment.map((s) => s.label).join(", ") || EMPTY_CELL;
  const presentation =
    brief.presentation?.trim() ||
    `Portefeuille de courtage en ${mainBranch.toLowerCase()}, zone ${zone}. ${contractCount.toLocaleString("fr-FR")} contrats pour ${clientCount.toLocaleString("fr-FR")} clients, commissions annuelles de ${formatEuroWhole(annualCommissions)}. ${listing.isPartial ? "Cession partielle." : "Cession totale."}${listing.sellerSupportMonths > 0 ? ` Accompagnement prévu : ${listing.sellerSupportMonths} mois.` : ""} Alias Portefeuille #${listing.publicNumber}.`;

  const facts = [
    { label: "Localisation", value: zone },
    { label: "Type", value: brief.portfolioKind?.trim() || "Courtage" },
    { label: "Type de clientèle", value: segments },
    { label: "Branche principale", value: mainBranch },
    { label: "Raison de la vente", value: brief.cessionMotive?.trim() || EMPTY_CELL },
    { label: "Prix", value: brief.negotiable ? "Négociable" : "Fermé" },
    ...(listing.sellerSupportMonths > 0
      ? [{ label: "Accompagnement", value: `${listing.sellerSupportMonths} mois` }]
      : []),
    ...(brief.desiredCessionDate
      ? [{ label: "Cession souhaitée", value: brief.desiredCessionDate }]
      : []),
  ];

  const interestHref = !actor
    ? `/connexion?next=/annonces/${listing.publicNumber}`
    : subscribed
      ? "#interesse"
      : "/tarifs#abonnement";

  return (
    <PublicListingDetail
      model={{
        publicNumber: listing.publicNumber,
        title,
        zone,
        statusLabel: LISTING_STATUS_LABELS[listing.status],
        certified,
        isPartial: listing.isPartial,
        isNationwide: listing.isNationwide,
        askingPrice,
        annualCommissions,
        contractCount,
        clientCount,
        averageAgeMonths: listing.portfolio.averageAgeMonths,
        sellerSupportMonths: listing.sellerSupportMonths,
        multiple,
        deposit,
        daysLeft,
        publishedAt: listing.publishedAt,
        presentation,
        facts,
        byRisk,
        byCarrier,
        bySegment,
        byDepartment,
        schedule,
        top10,
        carrierHhi,
        interestHref,
        manageHref: isSeller ? `/app/annonces/${listing.id}` : null,
      }}
    >
      {!isSeller && !canOffer ? (
        <section className="rounded-3xl border border-indigo-line bg-indigo-soft p-7">
          <h2 className="text-2xl font-semibold text-ink">Je suis intéressé</h2>
          <p className="mt-2 max-w-2xl text-[15px] leading-relaxed text-muted">
            La messagerie reste anonyme. Un abonnement de{" "}
            {GROWTH_PLAN_ANNUAL_EUR.toLocaleString("fr-FR")} € HT par an ouvre le
            détail de l’offre (contact, messages). Le vendeur reste anonyme
            jusqu’au dépôt de {INTEREST_DEPOSIT_LABEL} (
            {formatEuroWhole(deposit)}). Aucun encaissement sur cette démo.
          </p>
          <div className="mt-5 flex flex-wrap gap-3">
            {!actor ? (
              <Button asChild variant="primary">
                <Link href={`/connexion?next=/annonces/${listing.publicNumber}`}>
                  Je suis intéressé
                </Link>
              </Button>
            ) : subscribed ? (
              <Button asChild variant="primary">
                <Link href="#offre">Continuer</Link>
              </Button>
            ) : (
              <Button asChild variant="primary">
                <Link href="/tarifs#abonnement">S’abonner pour le détail de l’offre</Link>
              </Button>
            )}
            <Button asChild variant="outline">
              <Link href="/certification">Voir la certification</Link>
            </Button>
          </div>
        </section>
      ) : null}

      {actor && !isSeller && canBuy(actor) && subscribed ? (
        <section className="rounded-3xl border border-indigo-line bg-surface p-7">
          <h2 className="text-2xl font-semibold text-ink">Lever l’anonymat</h2>
          {myDeposit ? (
            <p className="mt-2 max-w-2xl text-[15px] leading-relaxed text-muted">
              Votre engagement de{" "}
              <span className="tabular font-medium text-ink">
                {formatEuroWhole(Number(myDeposit.amount))}
              </span>{" "}
              est enregistré. Les coordonnées du cédant vous sont ouvertes dans le
              dossier, sans attendre la lettre d’intention.
            </p>
          ) : (
            <>
              <p className="mt-2 max-w-2xl text-[15px] leading-relaxed text-muted">
                Le cédant reste anonyme tant que rien ne vous engage. Un dépôt de{" "}
                {INTEREST_DEPOSIT_LABEL} du prix demandé, soit{" "}
                <span className="tabular font-medium text-ink">
                  {formatEuroWhole(deposit)}
                </span>
                , ouvre l’échange des coordonnées entre vous et lui. Aucun
                encaissement sur cette démonstration : l’enregistrement vaut
                engagement.
              </p>
              <DepositForm listingId={listing.id} amountLabel={formatEuroWhole(deposit)} />
            </>
          )}
        </section>
      ) : null}

      {canOffer ? (
        <section id="offre" className="rounded-3xl border border-indigo-line bg-indigo-soft p-7">
          <h2 className="text-2xl font-semibold text-ink">Déposer une offre</h2>
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
              <SubmitOfferForm listingId={listing.id} asking={String(askingPrice)} />
            )}
          </div>
        </section>
      ) : listing.status === "OFFERS_OPEN" && sealed ? (
        <section className="rounded-3xl border border-line bg-paper p-7">
          <h2 className="text-xl font-semibold text-ink">Fenêtre d’offres en cours</h2>
          <p className="mt-2 max-w-2xl text-[15px] leading-relaxed text-muted">
            Les propositions restent masquées pendant {OFFER_WINDOW_DAYS} jours, y compris
            pour le cédant. Elles s’ouvrent toutes en même temps à la clôture.
          </p>
          {!actor ? (
            <Button asChild variant="primary" className="mt-5">
              <Link href="/connexion">Se connecter pour déposer une offre</Link>
            </Button>
          ) : !subscribed && canBuy(actor) && !isSeller ? (
            <Button asChild variant="primary" className="mt-5">
              <Link href="/tarifs#abonnement">S’abonner pour le détail de l’offre</Link>
            </Button>
          ) : null}
        </section>
      ) : null}

      {mailboxOk && actor ? (
        <section className="mt-8">
          <h2 className="text-xl font-semibold text-ink">Messages</h2>
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
    </PublicListingDetail>
  );
}
