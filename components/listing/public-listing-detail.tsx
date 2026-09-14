import type { ReactNode } from "react";
import Link from "next/link";
import { SectionTab, SectionTabLink, SectionTabs } from "@/components/ui/section-tabs";
import { MarketBadge } from "@/components/listing/market-badge";
import type { MarketTone } from "@/lib/listing/market-status";
import { TakePositionButton } from "@/components/listing/take-position-button";
import { MarketStamp } from "@/components/listing/market-stamp";
import { MixDonut } from "@/components/charts/mix-donut";
import { RankedBars } from "@/components/charts/ranked-bars";
import { UNCERTIFIED_LABEL } from "@/lib/copy/market";
import { formatCount, formatEuroWhole } from "@/lib/format/number";
import type { RenewalYear, Share } from "@/lib/portfolio/analytics";
import { hasQualityFigures, qualityFactRows, type PortfolioQuality } from "@/lib/portfolio/quality";

export type ListingFact = { label: string; value: string };

export type PublicListingDetailModel = {
  publicNumber: number;
  title: string;
  zone: string;
  statusLabel: string;
  marketTone: MarketTone;
  marketDetail: string | null;
  certified: boolean;
  sold: boolean;
  isPartial: boolean;
  isNationwide: boolean;
  askingPrice: number;
  /** Cote de la séance : meilleure offre et nombre d'offres déposées. */
  bestOffer: number | null;
  offerCount: number;
  annualCommissions: number;
  perceptionModeLine: string;
  perceptionAmountLine: string | null;
  contractCount: number;
  clientCount: number;
  averageAgeMonths: number;
  sellerSupportMonths: number;
  multiple: number | null;
  daysLeft: number | null;
  publishedAt: Date | null;
  presentation: string;
  facts: ListingFact[];
  byRisk: Share[];
  bySegment: Share[];
  byDepartment: Share[];
  byCarrier: Share[];
  renewals: RenewalYear[];
  quality: PortfolioQuality;
  interestHref: string;
  /** Dossier déjà ouvert par cet acquéreur : le bouton y mène au lieu d'en ouvrir un. */
  positionHref?: string | null;
  positionLabel?: string;
  /** Annonce sur laquelle « Prendre position » crée le dossier. Absente : simple lien. */
  positionListingId?: string | null;
  followHref?: string | null;
  manageHref: string | null;
  supplierCount: number;
  riskChips: string[];
  segmentChips: string[];
  coverageTitle: string;
  coverageDetail: string;
  exclusive: boolean;
  dealHref: string | null;
  defaultTab?: "informations" | "documents" | "position";
};

function formatDateLong(value: Date) {
  return new Intl.DateTimeFormat("fr-FR", {
    day: "numeric",
    month: "long",
    year: "numeric",
  }).format(value);
}

function PinIcon() {
  return (
    <svg className="h-4 w-4 shrink-0" viewBox="0 0 16 16" fill="none" aria-hidden="true">
      <path
        d="M8 1.5a4.5 4.5 0 0 0-4.5 4.5c0 3.2 4.5 8.5 4.5 8.5s4.5-5.3 4.5-8.5A4.5 4.5 0 0 0 8 1.5Zm0 6.1a1.6 1.6 0 1 1 0-3.2 1.6 1.6 0 0 1 0 3.2Z"
        stroke="currentColor"
        strokeWidth="1.3"
        strokeLinejoin="round"
      />
    </svg>
  );
}

export function PublicListingDetail({
  model,
  documents,
  position,
}: {
  model: PublicListingDetailModel;
  documents: ReactNode;
  position: ReactNode;
}) {
  const {
    publicNumber,
    title,
    zone,
    statusLabel,
    marketTone,
    marketDetail,
    certified,
    sold,
    isPartial,
    askingPrice,
    bestOffer,
    offerCount,
    annualCommissions,
    perceptionModeLine,
    perceptionAmountLine,
    contractCount,
    clientCount,
    multiple,
    daysLeft: _daysLeft,
    publishedAt,
    presentation,
    facts,
    byRisk,
    bySegment,
    byDepartment,
    byCarrier,
    renewals,
    quality,
    interestHref,
    positionHref,
    positionLabel,
    positionListingId,
    followHref,
    manageHref,
    supplierCount,
    riskChips,
    segmentChips,
    coverageTitle,
    coverageDetail,
    exclusive,
    dealHref,
    defaultTab,
  } = model;


  const information = (
        <div className="grid gap-6">
        <div className="grid gap-6 lg:grid-cols-2">
          <article className="rounded-3xl border border-line bg-paper p-7 shadow-sm">
            <h2 className="text-xl font-semibold text-ink">Détails de l’activité</h2>
            <p className="mt-4 whitespace-pre-wrap text-[15px] leading-relaxed text-ink">
              {presentation}
            </p>
          </article>
          <article className="rounded-3xl border border-line bg-paper p-7 shadow-sm">
            <h2 className="text-xl font-semibold text-ink">Informations principales</h2>
            <dl className="mt-5 grid grid-cols-1 gap-x-8 gap-y-5 sm:grid-cols-2">
              {facts.map((fact) => (
                <div key={fact.label}>
                  <dt className="text-[12px] font-medium uppercase tracking-wide text-muted">
                    {fact.label}
                  </dt>
                  <dd className="mt-1 text-[15px] font-medium text-ink">{fact.value}</dd>
                </div>
              ))}
            </dl>
          </article>
        </div>

        <div className="mt-6 grid gap-6 lg:grid-cols-2">
          <article className="rounded-3xl border border-line bg-paper p-7 shadow-sm">
            <h2 className="text-xl font-semibold text-ink">Données financières</h2>
            <p className="mt-1 text-[14px] text-muted">
              {hasQualityFigures(quality)
                ? "Commissions sur trois exercices, part du récurrent et prime gérée, distincte des commissions."
                : "Commissions annuelles, par profil de clientèle et par branche."}
              {isPartial
                ? " Cession partielle : commissions, contrats et clients sont ceux du lot cédé ; les exercices passés portent sur le portefeuille entier."
                : ""}
            </p>
            <dl className="mt-5 divide-y divide-line">
              {[
                { label: isPartial ? "Commissions annuelles du lot" : "Commissions annuelles", value: formatEuroWhole(annualCommissions) },
                { label: "Mode de perception", value: perceptionModeLine.replace("Mode de perception : ", "") },
                ...(perceptionAmountLine
                  ? [{ label: "Montant précompté", value: perceptionAmountLine.replace("Montant précompté : ", "") }]
                  : []),
                { label: "Prix demandé", value: formatEuroWhole(askingPrice) },
                {
                  label: "Multiple",
                  value:
                    multiple !== null
                      ? `${multiple.toLocaleString("fr-FR", { maximumFractionDigits: 2 })} ×`
                      : "Non renseigné",
                },
                { label: "Contrats", value: formatCount(contractCount) },
                { label: "Clients", value: formatCount(clientCount) },
                ...qualityFactRows(quality),
              ].map((row) => (
                <div key={row.label} className="flex items-baseline justify-between gap-4 py-3">
                  <dt className="text-[15px] text-muted">{row.label}</dt>
                  <dd className="tabular text-[15px] font-semibold text-ink">{row.value}</dd>
                </div>
              ))}
            </dl>
            <AnnualProfileTable title="Par clientèle, par an" shares={bySegment} />
            <AnnualProfileTable title="Par branche, par an" shares={byRisk} />
          </article>
          <MixDonut
            title="Mix par branche"
            subtitle="Part des commissions annuelles, sans donnée nominative."
            shares={byRisk}
          />
        </div>

        <div className="mt-6 grid gap-6 lg:grid-cols-2">
          <RankedBars
            title="Compagnies"
            unit={["compagnie", "compagnies"]}
            subtitle="Commissions annuelles par porteur."
            shares={byCarrier}
          />
          <RankedBars
            title="Clientèles"
            unit={["profil", "profils"]}
            subtitle="Commissions annuelles par profil : particuliers, professionnels, entreprises."
            shares={bySegment}
          />
        </div>

        <div className="mt-6 grid gap-6 lg:grid-cols-2">
          <RankedBars
            title="Zones"
            unit={["département", "départements"]}
            subtitle="Départements du portefeuille, grain maximal autorisé. Commissions annuelles."
            shares={byDepartment}
          />
          <YearlyRenewals years={renewals} />
        </div>

        </div>
  );

  return (
    <main className="bg-page pb-16">
      <div className="mx-auto max-w-6xl px-4 pt-6">
        <p className="text-[13px] text-muted">
          <Link href="/annonces" className="font-medium hover:text-ink">
            Salle de marché
          </Link>
          {" · "}
          Dossier n° {publicNumber}
        </p>

        <div className="mt-5 grid gap-6 lg:grid-cols-[minmax(0,1fr)_280px]">
          <div className="overflow-hidden rounded-3xl border border-line bg-paper p-6 shadow-sm sm:p-8">
            <div className="flex flex-wrap items-start justify-between gap-4">
              <div>
                <div className="flex flex-wrap items-center gap-2">
                  {sold ? <MarketStamp kind="sold" size="lg" /> : null}
                  {certified ? <MarketStamp kind="certified" size="lg" /> : null}
                  {!certified ? (
                    <span className="text-[12px] text-muted">{UNCERTIFIED_LABEL}</span>
                  ) : null}
                  <MarketBadge label={statusLabel} tone={marketTone} />
                  <span className="rounded-full border border-line bg-surface-alt px-3 py-1 text-[12px] text-ink">
                    {isPartial ? "Cession partielle" : "Cession totale"}
                  </span>
                </div>
                <h1 className="mt-4 text-3xl font-bold tracking-tight text-ink">
                  Dossier n° {publicNumber}
                </h1>
                <p className="mt-2 text-[16px] font-medium text-ink">{title}</p>
                <p className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1 text-[14px] text-muted">
                  <span className="inline-flex items-center gap-1.5">
                    <PinIcon />
                    {zone}
                  </span>
                  {publishedAt ? <span>Publié le {formatDateLong(publishedAt)}</span> : null}
                  {marketDetail ? <span>{marketDetail}</span> : null}
                </p>
              </div>
              <div className="text-right">
                <p className="text-[12px] text-muted">Prix demandé</p>
                <p className="tabular text-3xl font-bold text-ok">{formatEuroWhole(askingPrice)}</p>
                <p className="mt-2 text-[12px] text-muted">Commissions / an</p>
                <p className="tabular text-lg font-semibold text-ink">
                  {formatEuroWhole(annualCommissions)}
                </p>
                <p className="text-[13px] font-semibold text-ink">
                  {perceptionModeLine.endsWith("Non précisé")
                    ? "Linéaire ou précompte non précisé"
                    : perceptionModeLine.replace("Mode de perception : ", "")}
                </p>
              </div>
            </div>

            <dl className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-4">
              {[
                { value: String(supplierCount), label: "Fournisseurs" },
                { value: String(riskChips.length), label: "Types de risques" },
                { value: String(segmentChips.length), label: "Clientèle" },
                { value: "✓", label: "Couverture" },
              ].map((tile) => (
                <div
                  key={tile.label}
                  className="rounded-2xl bg-surface-alt px-4 py-4 text-center"
                >
                  <dd className="text-xl font-bold text-ink">{tile.value}</dd>
                  <dt className="mt-1 text-[12px] text-muted">{tile.label}</dt>
                </div>
              ))}
            </dl>
          </div>

          <aside className="h-fit rounded-3xl border border-line bg-paper p-5 shadow-sm">
            {!sold ? (
              <div className="mb-4 rounded-2xl border border-indigo-line bg-indigo-soft px-4 py-3">
                {offerCount >= 2 || (bestOffer !== null && bestOffer >= askingPrice) ? (
                  <p className="mb-1 inline-flex items-center gap-1.5 rounded-full bg-indigo px-2.5 py-0.5 text-[11px] font-bold uppercase tracking-wide text-white">
                    Opportunité chaude
                  </p>
                ) : null}
                {bestOffer !== null ? (
                  <>
                    <p className="tabular text-[26px] font-bold leading-tight text-ink">{formatEuroWhole(bestOffer)}</p>
                    <p className="text-[13px] text-muted">Meilleure offre actuelle</p>
                  </>
                ) : (
                  <p className="text-[15px] font-semibold text-ink">Aucune offre pour le moment</p>
                )}
                <p className="mt-1 text-[13px] font-semibold text-indigo-dark">
                  {offerCount === 0
                    ? "Soyez le premier à faire une offre"
                    : `${offerCount} offre${offerCount > 1 ? "s" : ""} déjà déposée${offerCount > 1 ? "s" : ""}`}
                </p>
              </div>
            ) : null}
            {sold ? (
              <p className="text-center text-[15px] font-semibold text-ink">
                Ce portefeuille est cédé.
              </p>
            ) : exclusive && !dealHref ? (
              <>
                <p className="text-[13px] font-semibold text-ink">Négociation exclusive</p>
                <p className="mt-2 text-[13px] leading-relaxed text-muted">
                  Un confrère est déjà en dossier. Vous pouvez consulter la fiche, pas
                  déposer une nouvelle offre.
                </p>
              </>
            ) : dealHref ? (
              <Link
                href={dealHref}
                className="flex h-12 items-center justify-center rounded-full bg-indigo text-[15px] font-semibold !text-white"
              >
                Continuer le dossier
              </Link>
            ) : (
              positionHref ? (
                <Link
                  href={positionHref}
                  className="flex h-12 items-center justify-center rounded-full bg-indigo text-[15px] font-semibold !text-white hover:bg-indigo-dark"
                >
                  {positionLabel ?? "Suivre mon dossier"}
                </Link>
              ) : positionListingId ? (
                <TakePositionButton
                  listingId={positionListingId}
                  className="flex h-12 w-full items-center justify-center rounded-full bg-indigo text-[15px] font-semibold !text-white hover:bg-indigo-dark disabled:opacity-60"
                />
              ) : (
                <SectionTabLink
                  href={interestHref}
                  className="flex h-12 items-center justify-center rounded-full bg-indigo text-[15px] font-semibold !text-white hover:bg-indigo-dark"
                >
                  Prendre position
                </SectionTabLink>
              )
            )}
            {followHref && !sold ? (
              <Link
                href={followHref}
                className="mt-2 flex h-11 items-center justify-center rounded-full border border-line text-[14px] font-medium text-ink hover:bg-surface-alt"
              >
                Suivre ce dossier
              </Link>
            ) : null}
            {/* Abonnement, dépôt et séquestre s'expliquent au moment de prendre position, pas sur la fiche. */}
          </aside>
        </div>

        {manageHref ? (
          <Link
            href={manageHref}
            className="mt-3 block rounded-2xl border border-line bg-paper px-4 py-3 text-center text-[14px] font-medium text-ink hover:bg-surface-alt"
          >
            Gérer cette annonce
          </Link>
        ) : null}

        <section className="mt-6 rounded-3xl border border-line bg-paper p-6 shadow-sm">
          <h2 className="flex items-center gap-2 text-lg font-semibold text-ink">
            <PinIcon /> Couverture géographique
          </h2>
          <div className="mt-3 rounded-2xl bg-indigo-soft px-5 py-4">
            <p className="font-semibold text-ink">{coverageTitle}</p>
            <p className="mt-1 text-[14px] text-muted">{coverageDetail}</p>
          </div>
        </section>

        <section className="mt-6 rounded-3xl border border-line bg-paper p-6 shadow-sm">
          <h2 className="text-lg font-semibold text-ink">Types de risques</h2>
          <div className="mt-3 flex flex-wrap gap-2">
            {riskChips.map((chip) => (
              <span
                key={chip}
                className="rounded-full border border-ok/30 bg-ok/10 px-3 py-1 text-[13px] font-medium text-ink"
              >
                {chip}
              </span>
            ))}
          </div>
        </section>

        <section className="mt-6 rounded-3xl border border-line bg-paper p-6 shadow-sm">
          <h2 className="text-lg font-semibold text-ink">Clientèle cible</h2>
          <div className="mt-3 flex flex-wrap gap-2">
            {segmentChips.map((chip) => (
              <span
                key={chip}
                className="rounded-full border border-line bg-surface-alt px-3 py-1 text-[13px] font-medium text-ink"
              >
                {chip}
              </span>
            ))}
          </div>
        </section>

        <div id="interesse" className="mt-8">
          {/*
           * La clé suit l'onglet par défaut : après un dépôt ou une offre, la
           * fiche revient sur « Position » au lieu de rester sur l'onglet d'avant.
           */}
          <SectionTabs key={defaultTab ?? "informations"} defaultId={defaultTab ?? "informations"}>
            <SectionTab id="informations" label="Informations">
              {information}

            </SectionTab>
            <SectionTab id="documents" label="Documents">
              {documents}
            </SectionTab>
            <SectionTab id="position" label="Position">
              {position}
            </SectionTab>
          </SectionTabs>
        </div>
      </div>
    </main>
  );
}

function AnnualProfileTable({ title, shares }: { title: string; shares: Share[] }) {
  if (shares.length === 0) return null;
  const total = shares.reduce((sum, share) => sum + share.value, 0);

  return (
    <div className="mt-7">
      <h3 className="text-[13px] font-semibold uppercase tracking-wide text-muted">{title}</h3>
      <table className="mt-3 w-full border-collapse text-left">
        <thead>
          <tr className="border-b border-line text-[12px] text-muted">
            <th scope="col" className="py-2 pr-3 font-medium">
              Profil
            </th>
            <th scope="col" className="py-2 pr-3 text-right font-medium">
              Commissions / an
            </th>
            <th scope="col" className="py-2 text-right font-medium">
              Part
            </th>
          </tr>
        </thead>
        <tbody>
          {shares.map((share) => (
            <tr key={share.label} className="border-b border-line">
              <th scope="row" className="py-2.5 pr-3 text-[14px] font-medium text-ink">
                {share.label}
              </th>
              <td className="tabular py-2.5 pr-3 text-right text-[14px] text-ink">
                {formatEuroWhole(share.value)}
              </td>
              <td className="tabular py-2.5 text-right text-[14px] text-ink">
                {(share.share * 100).toLocaleString("fr-FR", { maximumFractionDigits: 0 })} %
              </td>
            </tr>
          ))}
        </tbody>
        <tfoot>
          <tr>
            <th scope="row" className="pt-3 pr-3 text-[14px] font-semibold text-ink">
              Total
            </th>
            <td className="tabular pt-3 pr-3 text-right text-[14px] font-semibold text-ink">
              {formatEuroWhole(total)}
            </td>
            <td className="tabular pt-3 text-right text-[14px] font-semibold text-ink">
              100 %
            </td>
          </tr>
        </tfoot>
      </table>
    </div>
  );
}

function YearlyRenewals({ years }: { years: RenewalYear[] }) {
  const hasData = years.some((year) => year.commissions > 0);
  const passees = years.filter((y) => y.kind === "past");
  const aVenir = years.filter((y) => y.kind === "upcoming");

  const bloc = (titre: string, lignes: RenewalYear[]) => (
    <tbody>
      <tr>
        <th colSpan={3} scope="colgroup" className="pt-4 pb-1 text-[12px] font-semibold uppercase tracking-wide text-indigo-dark">
          {titre}
        </th>
      </tr>
      {lignes.map((year) => (
        <tr key={`${year.kind}-${year.year}`} className="border-b border-line">
          <th scope="row" className="py-2.5 pr-3 text-[15px] font-medium text-ink">
            {year.year}
          </th>
          <td className="tabular py-2.5 pr-3 text-right text-[15px] text-ink">{formatEuroWhole(year.commissions)}</td>
          <td className="tabular py-2.5 text-right text-[15px] text-ink">{formatCount(year.contracts)}</td>
        </tr>
      ))}
    </tbody>
  );

  const max = Math.max(...years.map((y) => y.commissions), 0);
  const aVenirTotal = aVenir.reduce((somme, y) => somme + y.commissions, 0);
  const aVenirContrats = aVenir.reduce((somme, y) => somme + y.contracts, 0);
  const premiere = passees.find((y) => y.commissions > 0);
  const derniere = passees[passees.length - 1];

  return (
    <article className="flex h-full flex-col rounded-3xl border border-line bg-paper p-6 shadow-sm">
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0">
          <h3 className="text-lg font-semibold text-ink">Renouvellements par année</h3>
          <p className="mt-1 text-sm text-muted">
            Les quatre dernières années, puis les échéances des douze prochains mois. L’historique est
            reconstitué sur les contrats encore en portefeuille, d’après leur date d’effet.
          </p>
        </div>
        {hasData ? (
          <div className="shrink-0 text-right">
            <p className="tabular text-[20px] font-bold leading-none text-ink">{formatEuroWhole(aVenirTotal)}</p>
            <p className="mt-1 text-[12px] text-muted">à renouveler · 12 mois</p>
          </div>
        ) : null}
      </div>
      {!hasData ? (
        <p className="mt-4 text-[15px] text-muted">Aucune date d’effet ni échéance renseignée.</p>
      ) : (
        <>
        <div className="mt-6">
          <div className="flex h-40 items-end gap-2 border-b border-line" role="img" aria-label={`Renouvellements : ${years.map((y) => `${y.year} ${formatEuroWhole(y.commissions)}`).join(", ")}`}>
            {years.map((y) => {
              const hauteur = max > 0 ? (y.commissions / max) * 100 : 0;
              return (
                <div
                  key={`${y.kind}-${y.year}`}
                  className="flex h-full flex-1 flex-col items-center justify-end gap-1"
                  title={`${y.year} · ${y.kind === "past" ? "renouvelé" : "à venir"} : ${formatEuroWhole(y.commissions)} · ${formatCount(y.contracts)} contrats`}
                >
                  <span className="tabular whitespace-nowrap text-[11px] font-medium text-ink">
                    {formatEuroWhole(y.commissions)}
                  </span>
                  <div
                    className={`w-full max-w-12 rounded-t ${y.kind === "past" ? "bg-indigo-line" : "bg-indigo"}`}
                    style={{ height: `${Math.max(hauteur * 0.82, y.commissions > 0 ? 2 : 0)}%` }}
                  />
                </div>
              );
            })}
          </div>
          <div className="mt-1.5 flex gap-2">
            {years.map((y) => (
              <span key={`${y.kind}-${y.year}-l`} className="tabular flex-1 text-center text-[12px] font-semibold text-muted">
                {y.year}
              </span>
            ))}
          </div>
          <div className="mt-3 flex flex-wrap gap-4 text-[12px] text-muted">
            <span className="flex items-center gap-1.5"><span className="h-2.5 w-2.5 rounded-[3px] bg-indigo-line" />Renouvelés</span>
            <span className="flex items-center gap-1.5"><span className="h-2.5 w-2.5 rounded-[3px] bg-indigo" />À venir</span>
          </div>
        </div>
        <div className="overflow-x-auto">
          <table className="mt-3 w-full min-w-[20rem] border-collapse text-left">
            <thead>
              <tr className="border-b border-line text-[12px] text-muted">
                <th scope="col" className="py-2 pr-3 font-medium">Année</th>
                <th scope="col" className="py-2 pr-3 text-right font-medium">Commissions / an</th>
                <th scope="col" className="py-2 text-right font-medium">Contrats</th>
              </tr>
            </thead>
            {passees.length ? bloc("Renouvelés", passees) : null}
            {aVenir.length ? bloc("À venir", aVenir) : null}
          </table>
        </div>
        </>
      )}
      <div className="flex-1" />
      {hasData ? (
        <p className="mt-4 border-t border-line pt-4 text-[13px] leading-relaxed text-muted">
          <span className="font-medium text-ink">{formatEuroWhole(aVenirTotal)}</span> de commissions
          arrivent à échéance sur les douze prochains mois ({formatCount(aVenirContrats)} contrats)
          {premiere && derniere && premiere.year !== derniere.year ? (
            <>
              . Sur la clientèle actuelle, les renouvellements sont passés de{" "}
              <span className="font-medium text-ink">{formatEuroWhole(premiere.commissions)}</span> en {premiere.year} à{" "}
              <span className="font-medium text-ink">{formatEuroWhole(derniere.commissions)}</span> en {derniere.year}
            </>
          ) : null}
          .
        </p>
      ) : null}
    </article>
  );
}
