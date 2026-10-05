import type { ReactNode } from "react";
import Link from "next/link";
import { SectionTab, SectionTabLink, SectionTabs } from "@/components/ui/section-tabs";
import { MarketBadge } from "@/components/listing/market-badge";
import { DossierLink } from "@/components/listing/dossier-link";
import type { ListingActions } from "@/lib/listing/listing-actions";
import type { MarketTone } from "@/lib/listing/market-status";
import { TakePositionButton } from "@/components/listing/take-position-button";
import { MarketStamp } from "@/components/listing/market-stamp";
import { MixDonut } from "@/components/charts/mix-donut";
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
  /** Dossier de présentation en PDF. */
  studyHref: string;
  /** Le PDF derrière la page du lecteur : il part dès le survol du lien. */
  studyPdfHref: string;
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
  /** Ce que la fiche propose, selon son état et selon qui la regarde. */
  actions: ListingActions;
  /** Où en est le dépôt du lecteur, quand il en a posé un. */
  depositNotice?: { titre: string; phrase: string } | null;
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
    studyHref,
    studyPdfHref,
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
    actions,
    depositNotice,
    dealHref,
    defaultTab,
  } = model;

  /*
   * La fourchette de valorisation, dite comme le dossier de présentation :
   * en années de commissions annuelles nettes, jamais en euros seuls.
   */
  const fois = (v: number) =>
    (v / annualCommissions).toLocaleString("fr-FR", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  const fourchette =
    valuation && annualCommissions > 0
      ? { low: fois(valuation.low), high: fois(valuation.high) }
      : null;

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
          <div className="min-w-0">
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


          <div className="mt-3 flex flex-wrap gap-3">
            <DossierLink
              href={studyHref}
              pdfHref={studyPdfHref}
              className="inline-flex h-11 items-center rounded-full border border-indigo-line bg-indigo-soft px-5 text-[14px] font-semibold text-indigo-dark hover:bg-indigo-soft/70"
            >
              Ouvrir le dossier de présentation
            </DossierLink>
            {actions.askSeller ? (
              <SectionTabLink
                href={interestHref}
                className="inline-flex h-11 items-center rounded-full border border-line bg-paper px-5 text-[14px] font-medium text-ink hover:bg-surface-alt"
              >
                Poser une question au cédant
              </SectionTabLink>
            ) : null}
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
              {documents ? (
                <SectionTab id="documents" label="Documents">
                  {documents}
                </SectionTab>
              ) : null}
              <SectionTab id="position" label="Position">
                {position}
              </SectionTab>
            </SectionTabs>
          </div>
          </div>

          <aside className="h-fit rounded-3xl bg-deep-soft p-6 text-white shadow-sm lg:sticky lg:top-20">
            <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-white/70">
              Montant de l’annonce, net vendeur
            </p>
            <p className="tabular mt-2 text-[32px] font-bold leading-none">{formatEuroWhole(askingPrice)}</p>
            <p className="mt-3 text-[13px] leading-relaxed text-white/80">
              {multiple
                ? `${multiple.toLocaleString("fr-FR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })} fois les commissions`
                : "Montant arrêté après l’étude"}
            </p>
            {fourchette ? (
              <p className="tabular mt-1 text-[13px] leading-relaxed text-white/70">
                fourchette {fourchette.low} à {fourchette.high}
              </p>
            ) : null}

            <div className="mt-5">
              {/*
                * Le lecteur qui s'est déjà positionné lit où en est son dépôt,
                * et non une invitation à se positionner une seconde fois.
                */}
              {depositNotice ? (
                <div className="mb-4">
                  <p className="text-[13px] font-semibold text-white">{depositNotice.titre}</p>
                  <p className="mt-1 text-[13px] leading-relaxed text-white/80">{depositNotice.phrase}</p>
                </div>
              ) : null}
              {actions.primary === "deal" && dealHref ? (
                <Link
                  href={dealHref}
                  className="flex h-12 items-center justify-center rounded-full bg-white text-[15px] font-semibold text-deep-soft hover:bg-white/90"
                >
                  Ouvrir le dossier de cession
                </Link>
              ) : (actions.primary === "position" || actions.primary === "manage") && positionHref ? (
                <Link
                  href={positionHref}
                  className="flex h-12 items-center justify-center rounded-full bg-white text-[15px] font-semibold text-deep-soft hover:bg-white/90"
                >
                  {positionLabel ?? "Suivre mon dossier"}
                </Link>
              ) : actions.primary === "takePosition" && positionListingId ? (
                <TakePositionButton
                  listingId={positionListingId}
                  label="Se positionner"
                  className="flex h-12 w-full items-center justify-center rounded-full bg-white text-[15px] font-semibold text-deep-soft hover:bg-white/90 disabled:opacity-60"
                />
              ) : actions.primary === "takePosition" || actions.primary === "signIn" ? (
                <SectionTabLink
                  href={interestHref}
                  className="flex h-12 items-center justify-center rounded-full bg-white text-[15px] font-semibold text-deep-soft hover:bg-white/90"
                >
                  Se positionner
                </SectionTabLink>
              ) : null}

              {/*
                * Ce qui remplace un bouton absent. Une action impossible n'est
                * jamais laissée en place pour échouer au clic : on dit pourquoi.
                */}
              {actions.notices.map((phrase, i) => (
                <p
                  key={phrase}
                  className={`text-[13px] leading-relaxed ${i === 0 ? "font-semibold text-white" : "mt-2 text-white/80"}`}
                >
                  {phrase}
                </p>
              ))}
            </div>

            {followHref && actions.follow ? (
              <Link
                href={followHref}
                className="mt-3 flex h-11 items-center justify-center rounded-full border border-white/40 text-[14px] font-medium text-white hover:bg-white/10"
              >
                Suivre ce dossier
              </Link>
            ) : null}
          </aside>
        </div>
      </div>
    </main>
  );
}

