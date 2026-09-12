import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Button } from "@/components/ui/button";
import { OfferChat } from "@/components/chat/offer-chat";
import { PublicListingDetail } from "@/components/listing/public-listing-detail";
import { SubmitOfferForm } from "@/components/offer/offer-forms";
import {
  canBuy,
  getActor,
  getListingByPublicNumber,
  isListingMailboxParty,
  isOriasVerified,
  isInvestor,
  listListingMailboxRecipients,
  listListingMessages,
  listOffersForListing,
} from "@/lib/authz";
import { isOfferWindowSealed, ownsFirm } from "@/lib/authz/policies";
import { hasContactSubscription } from "@/lib/billing/contact-access";
import { GROWTH_PLAN_ANNUAL_EUR, INTEREST_DEPOSIT_LABEL, interestDepositFor } from "@/lib/billing/rates";
import { EMPTY_CELL, formatDateTime } from "@/lib/format/fr";
import { formatEuroWhole } from "@/lib/format/number";
import { LISTING_STATUS_LABELS, RISK_TYPE_LABELS, SEGMENT_LABELS } from "@/lib/labels";
import { OFFER_WINDOW_DAYS } from "@/lib/listing/constants";
import { commissionPerceptionCopy } from "@/lib/listing/perception";
import { loadListingBriefFields } from "@/lib/listing/brief-fields";
import { cessionMotiveLabel, regulatoryFacts } from "@/lib/listing/brief-labels";
import { actorCanReadCompanyDocs, listCompanyDocs } from "@/lib/listing/company-docs";
import { loadCedantIdentity } from "@/lib/listing/cedant-identity";
import { CompanyDocumentsPanel } from "@/components/listing/company-documents-panel";
import { CedantIdentityCard } from "@/components/listing/cedant-identity-card";
import { findMyDeposit } from "@/lib/listing/deposit";
import { findMyInvestorPosition } from "@/lib/investor/positions";
import { InvestorDepositForm } from "@/components/investor/placement-forms";
import { listCertificationStatuses } from "@/lib/listing/certification";
import { DepositForm } from "@/components/listing/deposit-form";
import {
  breakdownBy,
  herfindahl,
  maturitySchedule,
  topClientShare,
  type AnalyticsLine,
} from "@/lib/portfolio/analytics";
import { qualityFromPortfolio } from "@/lib/portfolio/quality";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ numero: string }>;
}): Promise<Metadata> {
  const { numero } = await params;
  return { title: `Dossier n° ${numero}` };
}

const DAY_MS = 24 * 60 * 60 * 1000;

export default async function PublicListingPage({
  params,
  searchParams,
}: {
  params: Promise<{ numero: string }>;
  searchParams: Promise<{ voie?: string }>;
}) {
  const { numero } = await params;
  const { voie } = await searchParams;
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
  const investorMode = Boolean(voie === "investir" || (actor && isInvestor(actor)));
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
  const myDeposit = actor && !isSeller && !isInvestor(actor) ? await findMyDeposit(listing.id, actor.id) : null;
  const investorPos =
    actor && isInvestor(actor) && !isSeller ? await findMyInvestorPosition(listing.id, actor.id) : null;
  const certification =
    (await listCertificationStatuses([listing.id])).get(listing.id) ?? "NONE";
  const certified = certification === "CERTIFIED";
  const sold = listing.status === "SOLD";
  const perception = commissionPerceptionCopy({
    annualCommissions,
    precompte: listing.precompte,
    precompteAmount: listing.precompteAmount,
  });
  const brief = await loadListingBriefFields(listing.id);
  const canReadCompanyDocs = await actorCanReadCompanyDocs(listing.id);
  const companyDocs = canReadCompanyDocs ? await listCompanyDocs(listing.id) : [];
  const cedantIdentity =
    canReadCompanyDocs && !isSeller ? await loadCedantIdentity(listing.id) : null;

  const zone = listing.isNationwide ? "France entière" : listing.displayedZone;
  const mainBranch = byRisk[0]?.label ?? "Portefeuille de courtage";
  const title = listing.isNationwide
    ? `Portefeuille ${mainBranch}, France entière`
    : `Portefeuille ${mainBranch}, ${zone}`;
  const segments = bySegment.map((s) => s.label).join(", ") || EMPTY_CELL;
  const presentation =
    brief.presentation?.trim() ||
    `Portefeuille de courtage en ${mainBranch.toLowerCase()}, zone ${zone}. ${contractCount.toLocaleString("fr-FR")} contrats pour ${clientCount.toLocaleString("fr-FR")} clients, commissions annuelles de ${formatEuroWhole(annualCommissions)}. ${listing.isPartial ? "Cession partielle." : "Cession totale."}${listing.sellerSupportMonths > 0 ? ` Accompagnement prévu : ${listing.sellerSupportMonths} mois.` : ""} Référence : dossier n° ${listing.publicNumber}.`;

  const facts = [
    { label: "Localisation", value: zone },
    { label: "Type", value: brief.portfolioKind?.trim() || "Courtage" },
    { label: "Type de clientèle", value: segments },
    { label: "Branche principale", value: mainBranch },
    { label: "Raison de la vente", value: cessionMotiveLabel(brief.cessionMotive) || brief.cessionMotive?.trim() || EMPTY_CELL },
    { label: "Prix", value: brief.negotiable ? "Négociable" : "Fermé" },
    ...(listing.sellerSupportMonths > 0
      ? [{ label: "Accompagnement", value: `${listing.sellerSupportMonths} mois` }]
      : []),
    ...(brief.desiredCessionDate
      ? [{ label: "Cession souhaitée", value: brief.desiredCessionDate }]
      : []),
    ...regulatoryFacts(brief.regulatory),
  ];

  const listingPath = `/annonces/${listing.publicNumber}`;
  const interestHref = !actor
    ? `/connexion?next=${encodeURIComponent(listingPath)}`
    : subscribed
      ? "#depot"
      : `/tarifs?next=${encodeURIComponent(listingPath)}#abonnements`;
  const followHref = !actor
    ? `/connexion?next=${encodeURIComponent(`/annonces/${listing.publicNumber}?voie=investir`)}`
    : isInvestor(actor)
      ? "#suivi"
      : `/inscription?voie=investir`;

  return (
    <PublicListingDetail
      model={{
        publicNumber: listing.publicNumber,
        title,
        zone,
        statusLabel: LISTING_STATUS_LABELS[listing.status],
        certified,
        sold,
        isPartial: listing.isPartial,
        isNationwide: listing.isNationwide,
        askingPrice,
        annualCommissions,
        perceptionModeLine: perception.modeLine,
        perceptionAmountLine: perception.amountLine,
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
        quality: qualityFromPortfolio(listing.portfolio),
        interestHref,
        followHref,
        manageHref: isSeller ? `/app/annonces/${listing.id}` : null,
      }}
    >
      {cedantIdentity ? <CedantIdentityCard identity={cedantIdentity} /> : null}

      {investorMode && !isSeller ? (
        <section id="suivi" className="rounded-3xl border border-indigo-line bg-surface p-7">
          <h2 className="text-2xl font-semibold text-ink">Suivi de ce dossier</h2>
          {!actor ? (
            <>
              <p className="mt-2 max-w-2xl text-[15px] leading-relaxed text-muted">
                Un compte investisseur, sans ORIAS, permet de déposer {INTEREST_DEPOSIT_LABEL} du
                prix demandé ({formatEuroWhole(deposit)}) pour ouvrir les coordonnées du cabinet
                cédant. Les assurés restent anonymes. Aucun encaissement en démo.
              </p>
              <div className="mt-5 flex flex-wrap gap-3">
                <Button asChild variant="primary">
                  <Link href={`/inscription?voie=investir`}>Créer un compte investisseur</Link>
                </Button>
                <Button asChild variant="outline">
                  <Link href={`/connexion?next=${encodeURIComponent(`/annonces/${listing.publicNumber}?voie=investir`)}`}>
                    Connexion
                  </Link>
                </Button>
              </div>
            </>
          ) : !isInvestor(actor) ? (
            <p className="mt-2 max-w-2xl text-[15px] leading-relaxed text-muted">
              Ce suivi est réservé au compte investisseur. Les courtiers utilisent l’offre
              d’acquisition ci-dessous.
            </p>
          ) : investorPos ? (
            <p className="mt-2 max-w-2xl text-[15px] leading-relaxed text-muted">
              Votre engagement de {formatEuroWhole(Number(investorPos.depositAmount))} est
              enregistré. Les coordonnées du cabinet sont ouvertes. Consultez{" "}
              <Link href="/app/mes-dossiers" className="font-medium text-indigo underline-offset-2 hover:underline">
                Mes dossiers
              </Link>{" "}
              pour l’avancement de l’opération.
            </p>
          ) : (
            <>
              <p className="mt-2 max-w-2xl text-[15px] leading-relaxed text-muted">
                Le cabinet reste sous alias tant que rien ne vous engage. Un dépôt de{" "}
                {INTEREST_DEPOSIT_LABEL} du prix demandé, soit {formatEuroWhole(deposit)}, ouvre
                ses coordonnées. Les assurés du portefeuille ne sont jamais nominatifs. Aucun
                encaissement sur cette démonstration.
              </p>
              <InvestorDepositForm listingId={listing.id} amountLabel={formatEuroWhole(deposit)} />
            </>
          )}
        </section>
      ) : null}

      {canReadCompanyDocs && !isSeller ? (
        <CompanyDocumentsPanel
          listingId={listing.id}
          docs={companyDocs}
          canUpload={false}
          canDownload
        />
      ) : !isSeller ? (
        <section className="rounded-[1.75rem] border border-line bg-paper p-5 sm:p-7">
          <h2 className="text-lg font-bold tracking-tight text-ink">Pièces et identité du cédant</h2>
          <p className="mt-2 max-w-2xl text-[15px] leading-relaxed text-muted">
            Nom du cabinet, ORIAS, Kbis et autres PDF s’ouvrent au dépôt de{" "}
            {INTEREST_DEPOSIT_LABEL} du prix demandé (
            {formatEuroWhole(deposit)}). Avant cela, le cédant reste sous alias.
            Les assurés du portefeuille ne sont jamais nominatifs sur cette fiche.
          </p>
          <Button asChild variant="outline" className="mt-4">
            <Link
                href={
                !actor
                  ? `/connexion?next=${encodeURIComponent(`/annonces/${listing.publicNumber}`)}`
                  : subscribed
                    ? "#depot"
                    : `/tarifs?next=${encodeURIComponent(`/annonces/${listing.publicNumber}`)}#abonnements`
              }
            >
              {!actor
                ? "Se connecter"
                : subscribed
                  ? "Déposer 2,5 % pour ouvrir l’identité"
                  : "S’abonner, puis déposer 2,5 %"}
            </Link>
          </Button>
        </section>
      ) : null}

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
                <Link href={`/tarifs?next=${encodeURIComponent(`/annonces/${listing.publicNumber}`)}#abonnements`}>S’abonner pour le détail de l’offre</Link>
              </Button>
            )}
            <Button asChild variant="outline">
              <Link href="/certification">Voir la certification</Link>
            </Button>
          </div>
        </section>
      ) : null}

      {actor && !isSeller && canBuy(actor) && subscribed ? (
        <section id="depot" className="rounded-3xl border border-indigo-line bg-surface p-7">
          <h2 className="text-2xl font-semibold text-ink">Lever l’anonymat</h2>
          {myDeposit ? (
            <p className="mt-2 max-w-2xl text-[15px] leading-relaxed text-muted">
              Votre engagement de{" "}
              <span className="tabular font-medium text-ink">
                {formatEuroWhole(Number(myDeposit.amount))}
              </span>{" "}
              est enregistré. Les coordonnées du cédant et les PDF du cabinet sont
              ouverts ci-dessus. Les assurés du portefeuille restent anonymes.
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
                est enregistrée. Posez vos questions au cédant dans l’échange ci-dessous.
                Vous pouvez la retirer tant qu’elle n’a pas été retenue.
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
              <Link href={`/tarifs?next=${encodeURIComponent(`/annonces/${listing.publicNumber}`)}#abonnements`}>S’abonner pour le détail de l’offre</Link>
            </Button>
          ) : null}
        </section>
      ) : null}

      {mailboxOk && actor ? (
        <section id="echanges" className="mt-8">
          <h2 className="text-xl font-semibold text-ink">Échanges avec le cédant</h2>
          <p className="mt-1.5 text-[15px] text-muted">
            Chat ouvert dès le dépôt d’offre. Un acquéreur ne voit jamais les messages
            d’un autre. Les numéros de portable sont bloqués.
          </p>
          <div className="mt-4">
            <OfferChat
              listingId={listing.id}
              actorId={actor.id}
              recipients={isSeller ? recipients : undefined}
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
      ) : null}
    </PublicListingDetail>
  );
}
