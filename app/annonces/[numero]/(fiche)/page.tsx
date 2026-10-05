import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Button } from "@/components/ui/button";
import { OfferChat } from "@/components/chat/offer-chat";
import { PublicListingDetail } from "@/components/listing/public-listing-detail";
import { lotAvailability } from "@/lib/listing/lot-availability";
import {
  canBuy,
  getActor,
  getListingByPublicNumber,
  isListingMailboxParty,
  isOriasVerified,
  isInvestor,
  listListingMailboxRecipients,
  listListingMessages,
} from "@/lib/authz";
import { listingAcceptsOffers } from "@/lib/offer/acceptance";
import { findPositionId } from "@/lib/position/load";
import { marketStatus } from "@/lib/listing/market-status";
import { ownsFirm } from "@/lib/authz/policies";
import { INTEREST_DEPOSIT_LABEL, interestDepositFor } from "@/lib/billing/rates";
import { CESSION_FUNDS_DISCLAIMER } from "@/lib/partners/catalog";
import { EMPTY_CELL, formatDateTime } from "@/lib/format/fr";
import { formatEuroWhole } from "@/lib/format/number";
import { RISK_TYPE_LABELS, SEGMENT_LABELS } from "@/lib/labels";
import { commissionPerceptionCopy, precompteFromContracts } from "@/lib/listing/perception";
import { loadListingBriefFields } from "@/lib/listing/brief-fields";
import { cessionMotiveLabel, regulatoryFacts } from "@/lib/listing/brief-labels";
import { actorCanReadCompanyDocs, listCompanyDocs } from "@/lib/listing/company-docs";
import { loadCedantIdentity } from "@/lib/listing/cedant-identity";
import { CompanyDocumentsPanel } from "@/components/listing/company-documents-panel";
import { CedantIdentityCard } from "@/components/listing/cedant-identity-card";
import { prisma } from "@/lib/prisma";
import { findMyDeposit } from "@/lib/listing/deposit";
import { depositReleasesIdentity } from "@/lib/listing/identity-access";
import { listingActions, listingState, listingViewer } from "@/lib/listing/listing-actions";
import { stripeConfigured } from "@/lib/billing/stripe";
import { findMyInvestorPosition } from "@/lib/investor/positions";
import { InvestorDepositForm } from "@/components/investor/placement-forms";
import { listCertificationStatuses } from "@/lib/listing/certification";
import { DepositForm } from "@/components/listing/deposit-form";
import { loadEngagementReadiness } from "@/lib/buyer/readiness";
import { breakdownBy, renewalYears, type AnalyticsLine } from "@/lib/portfolio/analytics";
import { qualityFromPortfolio } from "@/lib/portfolio/quality";
import { valuePortfolio } from "@/lib/valuation/run";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ numero: string }>;
}): Promise<Metadata> {
  const { numero } = await params;
  return { title: `Dossier n° ${numero}` };
}

const DAY_MS = 24 * 60 * 60 * 1000;

/**
 * La fourchette d'un dossier qui n'a pas encore d'étude enregistrée.
 *
 * Le calcul lit toutes les lignes de contrat et fait tourner la cascade : le
 * refaire à chaque consultation coûtait l'essentiel du temps d'ouverture de la
 * fiche. Il est donc fait une fois, puis rangé, et les visites suivantes
 * lisent une ligne. Un doublon créé par deux visites simultanées est sans
 * conséquence : la lecture prend la plus récente.
 */
async function estimerFourchette(portfolioId: string, listingId: string) {
  try {
    const { valuationId: _id, breakdown } = await valuePortfolio(portfolioId, listingId);
    if (!(breakdown.lowValue > 0) || !(breakdown.highValue > 0)) return null;
    return { low: Math.round(breakdown.lowValue), high: Math.round(breakdown.highValue) };
  } catch (error) {
    console.error("estimerFourchette", error);
    return null;
  }
}

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
  // Une cession partielle se mesure sur son lot, pas sur le portefeuille entier.
  const lot = listing.isPartial && listing.lines.length > 0;
  const annualCommissions = lot
    ? Math.round(lines.reduce((s, l) => s + l.annualCommission, 0) * 100) / 100
    : Number(listing.portfolio.annualCommissions);
  const contractCount = lot ? lines.length : listing.portfolio.contractCount;
  const clientCount = lot ? new Set(lines.map((l) => l.clientKey)).size : listing.portfolio.clientCount;
  const multiple = annualCommissions > 0 ? askingPrice / annualCommissions : null;

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
  const byCarrier = breakdownBy(lines, (l) => l.carrier);
  const renewals = renewalYears(lines, new Date());

  const verified = actor ? isOriasVerified(actor) : false;
  const investorMode = Boolean(voie === "investir" || (actor && isInvestor(actor)));
  const isSeller = Boolean(actor && ownsFirm(actor, listing.portfolio.firmId));
  // Lots du portefeuille : l'acquéreur peut ne reprendre qu'une partie des
  // fournisseurs, et ceux déjà engagés ailleurs doivent apparaître comme pris.
  const { lots } = await lotAvailability(listing.id);
  const mailboxOk = Boolean(actor && verified && (await isListingMailboxParty(actor, listing.id)));
  const messages = mailboxOk && actor ? await listListingMessages(listing.id, actor) : [];
  const recipients =
    mailboxOk && actor && isSeller ? await listListingMailboxRecipients(listing.id, actor) : [];

  const daysLeft = listing.offerWindowClosesAt
    ? Math.ceil((listing.offerWindowClosesAt.getTime() - Date.now()) / DAY_MS)
    : null;

  const deposit = interestDepositFor(askingPrice);
  /*
   * Fourchette de l'étude : elle justifie le montant de l'annonce.
   *
   * On lit celle qu'une étude a déjà enregistrée. Quand il n'y en a pas, on la
   * calcule avec le même algorithme, sans rien écrire en base : la fiche doit
   * pouvoir montrer la fourchette de tout dossier en ligne.
   */
  /*
   * Tout ce qui ne dépend de rien d'autre part en même temps.
   *
   * Ces lectures s'enchaînaient une par une : sur D1, chaque aller retour
   * coûte, et la fiche mettait plusieurs secondes à s'ouvrir. Elles ne se
   * nourrissent pas l'une l'autre, elles partent donc ensemble.
   */
  const [valorisation, myDeposit, readiness, investorPos, certifications, brief, companyDocs] = await Promise.all([
    prisma.valuation.findFirst({
      where: { portfolioId: listing.portfolioId },
      orderBy: { computedAt: "desc" },
      select: { lowValue: true, highValue: true },
    }),
    actor && !isSeller && !isInvestor(actor) ? findMyDeposit(listing.id, actor.id) : Promise.resolve(null),
    actor && !isSeller && canBuy(actor)
      ? loadEngagementReadiness(actor, 0, `/annonces/${listing.publicNumber}#position`)
      : Promise.resolve(null),
    actor && isInvestor(actor) && !isSeller
      ? findMyInvestorPosition(listing.id, actor.id)
      : Promise.resolve(null),
    listCertificationStatuses([listing.id]),
    loadListingBriefFields(listing.id),
    listCompanyDocs(listing.id),
  ]);

  const estimee = valorisation ? null : await estimerFourchette(listing.portfolioId, listing.id);
  const fourchette = valorisation
    ? { low: Math.round(Number(valorisation.lowValue)), high: Math.round(Number(valorisation.highValue)) }
    : estimee;
  const depositReceived = myDeposit ? depositReleasesIdentity(myDeposit.paymentStatus, stripeConfigured()) : false;
  const certification = certifications.get(listing.id) ?? "NONE";
  const certified = certification === "CERTIFIED";
  const sold = listing.status === "SOLD";
  const perception = commissionPerceptionCopy({
    annualCommissions,
    // Déclaré par le cédant, sinon lu dans les contrats cédés.
    precompte: precompteFromContracts(
      listing.precompte,
      sourceLines.filter((l) => l.commissionType === "ADVANCED").reduce((s, l) => s + Number(l.annualCommission), 0),
      sourceLines.reduce((s, l) => s + Number(l.annualCommission), 0),
    ),
    precompteAmount: listing.precompteAmount,
  });
  const canReadCompanyDocs = await actorCanReadCompanyDocs(listing.id);
  const cedantIdentity =
    canReadCompanyDocs && !isSeller ? await loadCedantIdentity(listing.id) : null;

  const ouvert = isSeller || canReadCompanyDocs;

  const myDeal = actor
    ? await prisma.deal.findFirst({
        where: isSeller
          ? { listingId: listing.id }
          : { listingId: listing.id, buyerId: actor.id },
        select: { id: true, stage: true },
        orderBy: { createdAt: "desc" },
      })
    : null;

  const zone = listing.isNationwide ? "France entière" : listing.displayedZone;
  const mainBranch = byRisk[0]?.label ?? "Portefeuille de courtage";
  const title = listing.isNationwide
    ? `Portefeuille ${mainBranch}, France entière`
    : `Portefeuille ${mainBranch}, ${zone}`;
  const segments = bySegment.map((s) => s.label).join(", ") || EMPTY_CELL;
  const presentation =
    brief.presentation?.trim() ||
    `Portefeuille de courtage en ${mainBranch.toLowerCase()}, zone ${zone}. ${contractCount.toLocaleString("fr-FR")} contrats pour ${clientCount.toLocaleString("fr-FR")} clients, commissions annuelles de ${formatEuroWhole(annualCommissions)}. Référence : dossier n° ${listing.publicNumber}.`;

  /*
   * Les informations principales, sans redite ni case vide.
   *
   * La clientèle et la branche se lisent déjà dans « Types de risques » et
   * « Clientèle cible » juste au dessus, et « Raison de la vente : Non
   * renseigné » n'apprend rien : une ligne sans valeur ne s'affiche pas.
   */
  const motif = cessionMotiveLabel(brief.cessionMotive) || brief.cessionMotive?.trim() || "";
  const facts = [
    { label: "Localisation", value: zone },
    { label: "Type", value: brief.portfolioKind?.trim() || "Courtage" },
    ...(motif ? [{ label: "Raison de la vente", value: motif }] : []),
    ...(brief.desiredCessionDate
      ? [{ label: "Cession souhaitée", value: brief.desiredCessionDate }]
      : []),
    ...regulatoryFacts(brief.regulatory),
  ].filter((f) => f.value && f.value !== EMPTY_CELL);

  const cotation = marketStatus({ status: listing.status, offerWindowClosesAt: listing.offerWindowClosesAt });
  const listingPath = `/annonces/${listing.publicNumber}`;
  const interestHref = actor ? "#position" : `/connexion?next=${encodeURIComponent(listingPath)}`;
  // Suivre en investisseur n'a de sens que pour un visiteur ou un investisseur :
  // pour un courtier, suivre un dossier, c'est prendre position.
  const followHref = !actor
    ? `/connexion?next=${encodeURIComponent(`/annonces/${listing.publicNumber}?voie=investir`)}`
    : isInvestor(actor)
      ? "#suivi"
      : null;
  const monDossier =
    actor && verified && !isSeller && !isInvestor(actor) ? await findPositionId(listing.id, actor.id) : null;
  /*
   * Ce que la fiche propose, décidé en un seul endroit : un bouton affiché
   * mène toujours quelque part, et ce qui n'est pas possible est expliqué.
   */
  const investorReceived = investorPos
    ? depositReleasesIdentity(investorPos.paymentStatus, stripeConfigured())
    : false;

  const actions = listingActions({
    state: listingState(listing.status),
    viewer: listingViewer({
      signedIn: Boolean(actor),
      isSeller,
      isInvestor: Boolean(actor && isInvestor(actor)),
      /*
       * L'investisseur a posé son dépôt comme l'acquéreur : sa position compte
       * donc pour décider de ce que la fiche propose, et il ne se voit plus
       * offrir de se positionner là où il l'est déjà.
       */
      depositReceived: depositReceived || investorReceived,
      depositPending: (Boolean(myDeposit) || Boolean(investorPos)) && !depositReceived && !investorReceived,
      canBuy: Boolean(actor && verified && canBuy(actor)),
    }),
  });

  const peutPrendrePosition = Boolean(
    actor && verified && canBuy(actor) && !isSeller && listingAcceptsOffers(listing.status),
  );

  return (
    <PublicListingDetail
      model={{
        publicNumber: listing.publicNumber,
        title,
        zone,
        statusLabel: cotation.label,
        marketTone: cotation.tone,
        marketDetail: cotation.detail,
        certified,
        sold,
        isPartial: listing.isPartial,
        isNationwide: listing.isNationwide,
        askingPrice,
        annualCommissions,
        dataCutoff: listing.portfolio.importedAt ?? null,
        updatedAt: listing.updatedAt ?? null,
        topCarrierShare: byCarrier[0]?.share ?? null,
        precompteLine: perception.amountLine ?? perception.modeLine,
        valuation: fourchette,
        studyHref: `/annonces/${listing.publicNumber}/dossier`,
        studyPdfHref: `/annonces/${listing.publicNumber}/etude`,
        perceptionModeLine: perception.modeLine,
        perceptionAmountLine: perception.amountLine,
        contractCount,
        clientCount,
        averageAgeMonths: listing.portfolio.averageAgeMonths,
        multiple,
        daysLeft,
        publishedAt: listing.publishedAt,
        presentation,
        facts,
        byRisk,
        bySegment,
        byDepartment,
        byCarrier,
        renewals,
        quality: qualityFromPortfolio(listing.portfolio),
        interestHref,
        positionHref: isSeller
          ? `/app/annonces/${listing.id}`
          : monDossier
            ? `/app/positions/${monDossier}`
            : null,
        positionLabel: isSeller ? "Gérer mon annonce" : undefined,
        positionListingId: peutPrendrePosition ? listing.id : null,
        followHref,
        manageHref: isSeller ? `/app/annonces/${listing.id}` : null,
        /*
         * Le nombre réel d'assureurs, pas le nombre de lignes du graphique :
         * `breakdownBy` plafonne à sept et regroupe le reste sous « Autres »,
         * si bien que tout portefeuille de plus de sept fournisseurs en
         * annonçait huit.
         */
        supplierCount: lots.length,
        riskChips: byRisk.map((share) => share.label),
        segmentChips: bySegment.map((share) => share.label),
        coverageTitle: listing.isNationwide ? "Couverture nationale" : zone,
        coverageDetail: listing.isNationwide
          ? "Ce portefeuille couvre tout le pays."
          : "Zones au grain départemental, sans commune ni raison sociale.",
        actions,
        /*
         * Même logique et mêmes mots que pour l'acquéreur : reçu dans un trust,
         * ou en cours de traitement.
         */
        depositNotice:
          investorPos || myDeposit
            ? {
                titre: "Votre positionnement",
                phrase:
                  depositReceived || investorReceived
                    ? `Votre dépôt de ${formatEuroWhole(
                        Number(investorPos?.depositAmount ?? myDeposit?.amount ?? deposit),
                      )} est reçu dans un trust.`
                    : "Votre dépôt est en cours de traitement.",
              }
            : null,
        exclusive: listing.status === "UNDER_NEGOTIATION" && !isSeller && !myDeal,
        dealHref: myDeal ? `/app/dossiers/${myDeal.id}` : null,
        defaultTab: myDeal || myDeposit ? "position" : "informations",
      }}
      /* Ce que l'acquéreur regarde en premier : où sont les commissions. */
      /*
       * Ce que le dépôt ouvre, rassemblé en un seul endroit.
       *
       * Avant le dépôt, ce volet n'existe pas : une liste de pièces verrouillées
       * n'apprend rien et allonge la page. Après, l'acquéreur y lit le repère, les
       * coordonnées du cédant, et prend « Mes documents » pour les pièces. Le
       * cédant, lui, garde ici la liste de ce qu'il reste à déposer.
       */
      documents={
        ouvert ? (
          <div className="grid gap-6">
            {!isSeller ? (
              <p className="inline-flex w-fit rounded-full bg-indigo-soft px-3 py-1 text-[12px] font-semibold text-indigo-dark">
                Débloqué par votre dépôt
              </p>
            ) : null}
            {cedantIdentity && !isSeller ? <CedantIdentityCard identity={cedantIdentity} /> : null}
            {isSeller ? (
              <CompanyDocumentsPanel
                listingId={listing.id}
                publicNumber={listing.publicNumber}
                docs={companyDocs}
                canUpload
                canDownload
              />
            ) : (
              <Link
                href="/app/documents"
                className="inline-flex h-11 w-fit items-center rounded-full border border-indigo-line bg-indigo-soft px-5 text-[15px] font-semibold text-indigo-dark hover:bg-indigo-soft/70"
              >
                Mes documents
              </Link>
            )}
          </div>
        ) : null
      }
      position={
        <div className="grid gap-6">
          {myDeal ? (
            <section className="rounded-3xl border border-indigo-line bg-indigo-soft p-6">
              <h2 className="text-xl font-semibold text-ink">Dossier de cession ouvert</h2>
              <p className="mt-2 text-[15px] leading-relaxed text-muted">
                Le parcours continue jusqu’à la clôture : vérifications, signature, transaction sécurisée,
                accord des compagnies et libération des fonds via le trust.
              </p>
            </section>
          ) : actions.notices.length > 0 ? (
            /*
             * Même explication que le panneau du montant, au même mot : elle
             * vient de `listingActions`, et non d'une phrase recopiée ici.
             */
            <section className="rounded-3xl border border-line bg-paper p-6">
              {actions.notices.map((phrase, i) => (
                <p
                  key={phrase}
                  className={`text-[15px] leading-relaxed ${i === 0 ? "font-semibold text-ink" : "mt-2 text-muted"}`}
                >
                  {phrase}
                </p>
              ))}
            </section>
          ) : null}

      {investorMode && !isSeller ? (
        <section id="suivi" className="rounded-3xl border border-indigo-line bg-surface p-7">
          <h2 className="text-2xl font-semibold text-ink">Suivi de ce dossier</h2>
          {!actor ? (
            <>
              <p className="mt-2 max-w-2xl text-[15px] leading-relaxed text-muted">
                Un compte investisseur, sans ORIAS, permet de déposer {INTEREST_DEPOSIT_LABEL} de
                l’annonce ({formatEuroWhole(deposit)}) pour ouvrir les coordonnées du cabinet
                cédant. Les assurés restent anonymes. {CESSION_FUNDS_DISCLAIMER}
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
              Ce suivi est réservé au compte investisseur. Les courtiers se positionnent
              depuis le bloc ci-dessus.
            </p>
          ) : investorPos && !depositReleasesIdentity(investorPos.paymentStatus, stripeConfigured()) ? (
            /*
             * Dépôt posé mais pas encore reçu : rien ne s'ouvre avant le trust,
             * exactement comme pour l'acquéreur.
             */
            <p className="mt-2 max-w-2xl text-[15px] leading-relaxed text-muted">
              Votre dépôt est en cours de traitement. La présentation du cabinet et ses
              coordonnées s’ouvriront dès sa réception par le trust.
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
                Dès que vous vous positionnez, un dépôt de{" "}
                {INTEREST_DEPOSIT_LABEL} de l’annonce, soit {formatEuroWhole(deposit)},
                est versé dans un trust pour lancer la procédure de cession. Les
                assurés du portefeuille ne sont jamais nominatifs.{" "}
                {CESSION_FUNDS_DISCLAIMER}
              </p>
              <InvestorDepositForm
                listingId={listing.id}
                publicNumber={listing.publicNumber}
                amountLabel={formatEuroWhole(deposit)}
                amountEur={deposit}
                listingAmountLabel={formatEuroWhole(askingPrice)}
              />
            </>
          )}
        </section>
      ) : null}

      {investorMode && !isSeller ? (
        <section className="rounded-3xl border border-indigo-line bg-indigo-soft p-7">
          <h2 className="text-2xl font-semibold text-ink">Je suis intéressé</h2>
          <p className="mt-2 max-w-2xl text-[15px] leading-relaxed text-muted">
            La messagerie reste anonyme. Dès que vous vous positionnez, un dépôt de{" "}
            {INTEREST_DEPOSIT_LABEL} ({formatEuroWhole(deposit)}) est versé dans un trust pour
            lancer la procédure de cession. {CESSION_FUNDS_DISCLAIMER}
          </p>
          <div className="mt-5 flex flex-wrap gap-3">
            {!actor ? (
              <Button asChild variant="primary">
                <Link href={`/connexion?next=/annonces/${listing.publicNumber}`}>
                  Je suis intéressé
                </Link>
              </Button>
            ) : (
              <Button asChild variant="primary">
                <Link href="#position">Continuer</Link>
              </Button>
            )}
            <Button asChild variant="outline">
              <Link href="/certification">Voir la certification</Link>
            </Button>
          </div>
        </section>
      ) : null}

      {actor && !isSeller && canBuy(actor) ? (
        <section id="depot" className="rounded-3xl border border-indigo-line bg-surface p-7">
          <h2 className="text-2xl font-semibold text-ink">
            {myDeposit ? "Votre positionnement" : "Se positionner"}
          </h2>
          {myDeposit ? (
            <p className="mt-2 max-w-2xl text-[15px] leading-relaxed text-muted">
              Votre dépôt de{" "}
              <span className="tabular font-medium text-ink">
                {formatEuroWhole(Number(myDeposit.amount))}
              </span>{" "}
              {depositReceived ? (
                <>
                  est reçu dans un trust. La procédure de cession est lancée.
                  Les coordonnées du cédant et les PDF du cabinet sont ouverts dans
                  l’onglet Documents.
                </>
              ) : (
                <>
                  est en cours de traitement. La présentation du cabinet et ses
                  coordonnées s’ouvriront dès sa réception par le trust.
                </>
              )}
            </p>
          ) : (
            <>
              <p className="mt-2 max-w-2xl text-[15px] leading-relaxed text-muted">
                Dès que vous vous positionnez, un dépôt de {INTEREST_DEPOSIT_LABEL}{" "}
                de l’annonce, soit{" "}
                <span className="tabular font-medium text-ink">
                  {formatEuroWhole(deposit)}
                </span>
                , est versé dans un trust pour lancer la procédure de cession.{" "}
                {CESSION_FUNDS_DISCLAIMER}
              </p>
              <DepositForm
                listingId={listing.id}
                publicNumber={listing.publicNumber}
                amountLabel={formatEuroWhole(deposit)}
                amountEur={deposit}
                listingAmountLabel={formatEuroWhole(askingPrice)}
                readiness={readiness!}
              />
            </>
          )}
        </section>
      ) : null}

      {mailboxOk && actor ? (
        <section id="echanges" className="mt-8">
          <h2 className="text-xl font-semibold text-ink">Échanges avec le cédant</h2>
          <p className="mt-1.5 text-[15px] text-muted">
            Vos questions ne sont visibles que du cédant.</p>
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
        </div>
      }
    />
  );
}
