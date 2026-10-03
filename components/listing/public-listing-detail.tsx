import type { ReactNode } from "react";
import Link from "next/link";
import { SectionTab, SectionTabLink, SectionTabs } from "@/components/ui/section-tabs";
import { MarketBadge } from "@/components/listing/market-badge";
import { SALE_PIPELINE } from "@/lib/deal/pipeline";
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
  annualCommissions: number;
  /** Date d'arrêté des données du portefeuille, et dernière mise à jour de la fiche. */
  dataCutoff: Date | null;
  updatedAt: Date | null;
  /** Poids de la première compagnie, de 0 à 1. */
  topCarrierShare: number | null;
  /** Une phrase sur le précompte, telle qu'elle est dite dans le dossier. */
  precompteLine: string;
  /** Fourchette de valorisation retenue à l'étude. */
  valuation: { low: number; high: number } | null;
  /** Dépôt de positionnement, 2,5 % du montant. */
  depositAmount: number;
  /** Dossier de présentation en PDF. */
  studyHref: string;
  perceptionModeLine: string;
  perceptionAmountLine: string | null;
  contractCount: number;
  clientCount: number;
  averageAgeMonths: number;
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
    marketDetail: _marketDetail,
    certified,
    sold,
    isPartial,
    askingPrice,
    annualCommissions,
    dataCutoff,
    updatedAt,
    topCarrierShare,
    precompteLine,
    valuation,
    depositAmount,
    studyHref,
    perceptionModeLine,
    perceptionAmountLine,
    contractCount,
    clientCount,
    averageAgeMonths,
    multiple,
    daysLeft: _daysLeft,
    publishedAt: _publishedAt,
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
                ? " Les commissions, contrats et clients sont ceux du lot cédé ; les exercices passés portent sur le portefeuille entier."
                : ""}
            </p>
            <dl className="mt-5 divide-y divide-line">
              {[
                { label: isPartial ? "Commissions annuelles du lot" : "Commissions annuelles", value: formatEuroWhole(annualCommissions) },
                { label: "Mode de perception", value: perceptionModeLine.replace("Mode de perception : ", "") },
                ...(perceptionAmountLine
                  ? [{ label: "Montant précompté", value: perceptionAmountLine.replace("Montant précompté : ", "") }]
                  : []),
                { label: "Montant", value: formatEuroWhole(askingPrice) },
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
            subtitle="Part des commissions annuelles."
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

        <div className="mt-5 grid items-start gap-6 lg:grid-cols-[minmax(0,1fr)_320px]">
          <div className="overflow-hidden rounded-3xl border border-line bg-paper p-6 shadow-sm sm:p-8">
            <div className="flex flex-wrap items-center gap-2">
              {sold ? <MarketStamp kind="sold" size="lg" /> : null}
              {certified ? <MarketStamp kind="certified" size="lg" /> : null}
              {!certified ? <span className="text-[12px] text-muted">{UNCERTIFIED_LABEL}</span> : null}
              <MarketBadge label={statusLabel} tone={marketTone} />
            </div>
            <h1 className="mt-4 text-3xl font-bold tracking-tight text-ink">Dossier n° {publicNumber}</h1>
            <p className="mt-2 text-[16px] font-medium text-ink">{title}</p>
            <p className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1 text-[14px] text-muted">
              <span className="inline-flex items-center gap-1.5">
                <PinIcon />
                {zone}
              </span>
              {dataCutoff ? <span>Données arrêtées au {formatDateLong(dataCutoff)}</span> : null}
              {updatedAt ? <span>Mis à jour le {formatDateLong(updatedAt)}</span> : null}
            </p>

            {/* Les quatre repères de « L'essentiel du dossier », dans le même ordre. */}
            <dl className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-4">
              {[
                { value: formatEuroWhole(annualCommissions), label: "commissions / an" },
                { value: formatCount(contractCount), label: "contrats" },
                {
                  value: averageAgeMonths > 0 ? `${Math.round(averageAgeMonths)} mois` : "n.c.",
                  label: "ancienneté",
                },
                { value: formatEuroWhole(annualCommissions / 12), label: "par mois" },
              ].map((tile) => (
                <div key={tile.label} className="rounded-2xl bg-surface-alt px-4 py-4">
                  <dd className="tabular text-[20px] font-bold text-ink">{tile.value}</dd>
                  <dt className="mt-1 text-[12px] text-muted">{tile.label}</dt>
                </div>
              ))}
            </dl>

            <p className="mt-5 text-[14px] leading-relaxed text-muted">
              {supplierCount} compagnie{supplierCount > 1 ? "s" : ""}
              {topCarrierShare !== null
                ? `, la première à ${Math.round(topCarrierShare * 100)} %`
                : ""}
              {" · "}
              {precompteLine}
            </p>
          </div>

          <aside className="h-fit rounded-3xl bg-deep-soft p-6 text-white shadow-sm lg:sticky lg:top-6">
            <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-white/70">
              Montant de l’annonce, net vendeur
            </p>
            <p className="tabular mt-2 text-[32px] font-bold leading-none">{formatEuroWhole(askingPrice)}</p>
            <p className="mt-3 text-[13px] leading-relaxed text-white/80">
              {multiple
                ? `${multiple.toLocaleString("fr-FR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })} fois les commissions`
                : "Montant arrêté après l’étude"}
              {valuation
                ? ` · fourchette de ${formatEuroWhole(valuation.low)} à ${formatEuroWhole(valuation.high)}`
                : ""}
            </p>

            <div className="mt-5">
              {sold ? (
                <p className="text-center text-[15px] font-semibold">Ce portefeuille est vendu.</p>
              ) : exclusive && !dealHref ? (
                <>
                  <p className="text-[13px] font-semibold">Acquéreur positionné</p>
                  <p className="mt-2 text-[13px] leading-relaxed text-white/80">
                    Un confrère a versé son dépôt de positionnement. Vous pouvez consulter la fiche.
                  </p>
                </>
              ) : dealHref ? (
                <Link
                  href={dealHref}
                  className="flex h-12 items-center justify-center rounded-full bg-white text-[15px] font-semibold text-deep-soft hover:bg-white/90"
                >
                  Continuer le dossier
                </Link>
              ) : positionHref ? (
                <Link
                  href={positionHref}
                  className="flex h-12 items-center justify-center rounded-full bg-white text-[15px] font-semibold text-deep-soft hover:bg-white/90"
                >
                  {positionLabel ?? "Suivre mon dossier"}
                </Link>
              ) : positionListingId ? (
                <TakePositionButton
                  listingId={positionListingId}
                  label="Se positionner · 2,5 %"
                  className="flex h-12 w-full items-center justify-center rounded-full bg-white text-[15px] font-semibold text-deep-soft hover:bg-white/90 disabled:opacity-60"
                />
              ) : (
                <SectionTabLink
                  href={interestHref}
                  className="flex h-12 items-center justify-center rounded-full bg-white text-[15px] font-semibold text-deep-soft hover:bg-white/90"
                >
                  Se positionner · 2,5 %
                </SectionTabLink>
              )}
            </div>

            {!sold ? (
              <p className="mt-3 text-[12.5px] leading-relaxed text-white/70">
                Dépôt de {formatEuroWhole(depositAmount)} versé dans un trust. Il lance la procédure et vous
                donne le nom du cabinet.
              </p>
            ) : null}

            {followHref && !sold ? (
              <Link
                href={followHref}
                className="mt-3 flex h-11 items-center justify-center rounded-full border border-white/40 text-[14px] font-medium text-white hover:bg-white/10"
              >
                Suivre ce dossier
              </Link>
            ) : null}
          </aside>
        </div>

        <div className="mt-3 flex flex-wrap gap-3">
          <Link
            href={studyHref}
            className="inline-flex h-11 items-center rounded-full border border-indigo-line bg-indigo-soft px-5 text-[14px] font-semibold text-indigo-dark hover:bg-indigo-soft/70"
          >
            Ouvrir le dossier de présentation (PDF)
          </Link>
          <SectionTabLink
            href={interestHref}
            className="inline-flex h-11 items-center rounded-full border border-line bg-paper px-5 text-[14px] font-medium text-ink hover:bg-surface-alt"
          >
            Poser une question au cédant
          </SectionTabLink>
        </div>

        {/* Le cadre : les quatre étapes, dites comme dans le dossier de présentation. */}
        <section className="mt-6 rounded-3xl border border-line bg-paper p-6 shadow-sm">
          <h2 className="text-lg font-semibold text-ink">Le cadre</h2>
          <ol className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            {SALE_PIPELINE.map((step) => (
              <li key={step.key} className="rounded-2xl border border-line p-4">
                <p className="text-[12px] font-semibold uppercase tracking-[0.12em] text-indigo-dark">
                  {step.num} · {step.label}
                </p>
                <p className="mt-2 text-[13px] leading-relaxed text-muted">{step.summary}</p>
              </li>
            ))}
          </ol>
        </section>

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
