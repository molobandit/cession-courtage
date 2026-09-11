import type { ReactNode } from "react";
import Link from "next/link";
import { CertifiedBadge } from "@/components/listing/certified-badge";
import { MixDonut } from "@/components/charts/mix-donut";
import { RankedBars } from "@/components/charts/ranked-bars";
import { ConcentrationMeter } from "@/components/charts/concentration-meter";
import { GROWTH_PLAN_ANNUAL_EUR, INTEREST_DEPOSIT_LABEL } from "@/lib/billing/rates";
import { formatCount, formatEuroWhole } from "@/lib/format/number";
import { groupMaturityByYear, type MaturityBucket, type Share } from "@/lib/portfolio/analytics";
import { hasQualityFigures, qualityFactRows, type PortfolioQuality } from "@/lib/portfolio/quality";

export type ListingFact = { label: string; value: string };

export type PublicListingDetailModel = {
  publicNumber: number;
  title: string;
  zone: string;
  statusLabel: string;
  certified: boolean;
  isPartial: boolean;
  isNationwide: boolean;
  askingPrice: number;
  annualCommissions: number;
  contractCount: number;
  clientCount: number;
  averageAgeMonths: number;
  sellerSupportMonths: number;
  multiple: number | null;
  deposit: number;
  daysLeft: number | null;
  publishedAt: Date | null;
  presentation: string;
  facts: ListingFact[];
  byRisk: Share[];
  byCarrier: Share[];
  bySegment: Share[];
  byDepartment: Share[];
  schedule: MaturityBucket[];
  top10: number;
  carrierHhi: number;
  quality: PortfolioQuality;
  interestHref: string;
  followHref?: string | null;
  manageHref: string | null;
};

function formatDateLong(value: Date) {
  return new Intl.DateTimeFormat("fr-FR", {
    day: "numeric",
    month: "long",
    year: "numeric",
  }).format(value);
}

function windowCopy(daysLeft: number | null): string {
  if (daysLeft === null) return "Fenêtre non datée";
  if (daysLeft < 0) return "Fenêtre d’offres close";
  if (daysLeft === 0) return "Clôture aujourd’hui";
  if (daysLeft === 1) return "Clôture demain";
  return `Clôture dans ${daysLeft} jours`;
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
  children,
}: {
  model: PublicListingDetailModel;
  children?: ReactNode;
}) {
  const {
    publicNumber,
    title,
    zone,
    statusLabel,
    certified,
    isPartial,
    askingPrice,
    annualCommissions,
    contractCount,
    clientCount,
    averageAgeMonths,
    sellerSupportMonths,
    multiple,
    deposit,
    daysLeft,
    publishedAt,
    presentation,
    facts,
    byRisk,
    byCarrier,
    bySegment,
    byDepartment,
    schedule,
    top10,
    carrierHhi,
    quality,
    interestHref,
    followHref,
    manageHref,
  } = model;

  const carrierStatus = carrierHhi > 0.6 ? "penalisant" : carrierHhi >= 0.3 ? "surveiller" : "bon";
  const clientStatus = top10 > 0.4 ? "penalisant" : top10 > 0.25 ? "surveiller" : "bon";

  const kpis = [
    { label: "Commissions / an", value: formatEuroWhole(annualCommissions) },
    { label: "Contrats", value: formatCount(contractCount) },
    { label: "Clients", value: formatCount(clientCount) },
    { label: "Ancienneté", value: `${formatCount(averageAgeMonths)} mois` },
  ];

  return (
    <main className="bg-page pb-16">
      <div className="mx-auto max-w-6xl px-4 pt-6">
        <Link
          href="/annonces"
          className="inline-flex items-center gap-2 text-[14px] font-medium text-muted hover:text-ink"
        >
          <svg className="h-4 w-4" viewBox="0 0 16 16" fill="none" aria-hidden="true">
            <path d="M10 3 5 8l5 5" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
          </svg>
          Retour à la liste
        </Link>

        <div className="mt-5 overflow-hidden rounded-3xl border border-line bg-paper shadow-sm">
          <div className="grid md:grid-cols-12">
            <section className="p-7 sm:p-9 md:col-span-8">
              <div className="flex flex-wrap gap-2">
                {certified ? (
                  <CertifiedBadge />
                ) : (
                  <span className="rounded-full border border-line bg-surface-alt px-3 py-1 text-[12px] font-medium text-muted">
                    Annonce simple
                  </span>
                )}
                <span className="rounded-full border border-line bg-surface-alt px-3 py-1 text-[12px] text-ink">
                  {statusLabel}
                </span>
                <span className="rounded-full border border-line bg-surface-alt px-3 py-1 text-[12px] text-ink">
                  {isPartial ? "Cession partielle" : "Cession totale"}
                </span>
              </div>

              <h1 className="mt-5 text-3xl font-bold leading-tight tracking-tight text-ink sm:text-[2.35rem]">
                {title}
              </h1>
              <p className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-1 text-[14px] text-muted">
                <span className="inline-flex items-center gap-1.5">
                  <PinIcon />
                  {zone}
                </span>
                <span>Dossier n° {publicNumber}</span>
                {publishedAt ? <span>Publiée le {formatDateLong(publishedAt)}</span> : null}
              </p>

              <dl className="mt-8 grid grid-cols-2 gap-4 border-t border-line pt-6 sm:grid-cols-4">
                {kpis.map((kpi) => (
                  <div key={kpi.label}>
                    <dt className="text-[12px] text-muted">{kpi.label}</dt>
                    <dd className="tabular mt-1 text-[18px] font-semibold text-ink">{kpi.value}</dd>
                  </div>
                ))}
              </dl>
            </section>

            <aside className="flex flex-col justify-between bg-indigo p-7 text-white sm:p-8 md:col-span-4">
              <div>
                <p className="text-[13px] font-medium text-white/80">Prix demandé</p>
                <p className="tabular mt-1 text-4xl font-bold tracking-tight lg:text-5xl">
                  {formatEuroWhole(askingPrice)}
                </p>
                {multiple !== null ? (
                  <p className="mt-4 inline-flex rounded-full bg-white/15 px-3 py-1 text-[13px] font-medium">
                    Ratio prix / commissions :{" "}
                    {multiple.toLocaleString("fr-FR", { maximumFractionDigits: 1 })}
                  </p>
                ) : null}
                <dl className="mt-6 space-y-2 border-t border-white/20 pt-5 text-[14px]">
                  <div className="flex justify-between gap-3">
                    <dt className="text-white/75">Commissions / an</dt>
                    <dd className="tabular font-semibold">{formatEuroWhole(annualCommissions)}</dd>
                  </div>
                  <div className="flex justify-between gap-3">
                    <dt className="text-white/75">Fenêtre</dt>
                    <dd className="font-medium">{windowCopy(daysLeft)}</dd>
                  </div>
                  {sellerSupportMonths > 0 ? (
                    <div className="flex justify-between gap-3">
                      <dt className="text-white/75">Accompagnement</dt>
                      <dd className="font-medium">{sellerSupportMonths} mois</dd>
                    </div>
                  ) : null}
                </dl>
              </div>
              <div className="mt-8">
                <Link
                  href={interestHref}
                  className="flex h-12 w-full items-center justify-center rounded-full bg-white text-[15px] font-semibold !text-indigo hover:bg-white/90"
                >
                  Je suis intéressé
                </Link>
                {followHref ? (
                  <Link
                    href={followHref}
                    className="mt-2 flex h-12 w-full items-center justify-center rounded-full border border-white/40 text-[15px] font-semibold text-white hover:bg-white/10"
                  >
                    Suivre ce dossier
                  </Link>
                ) : null}
                <p className="mt-3 text-[12px] leading-relaxed text-white/75">
                  Abonnement {GROWTH_PLAN_ANNUAL_EUR.toLocaleString("fr-FR")} € HT
                  / an pour le contact. Le vendeur reste anonyme jusqu’au dépôt de{" "}
                  {INTEREST_DEPOSIT_LABEL} ({formatEuroWhole(deposit)}). Aucun
                  débit en démo.
                </p>
              </div>
            </aside>
          </div>
        </div>
        {manageHref ? (
          <Link
            href={manageHref}
            className="mt-3 block rounded-2xl border border-line bg-paper px-4 py-3 text-center text-[14px] font-medium text-ink hover:bg-surface-alt"
          >
            Gérer cette annonce
          </Link>
        ) : null}

        <div className="mt-6 grid gap-6 lg:grid-cols-2">
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
            </p>
            <dl className="mt-5 divide-y divide-line">
              {[
                { label: "Commissions annuelles", value: formatEuroWhole(annualCommissions) },
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
            subtitle="Commissions annuelles par porteur."
            shares={byCarrier}
          />
          <RankedBars
            title="Clientèles"
            subtitle="Commissions annuelles par profil : particuliers, professionnels, entreprises."
            shares={bySegment}
          />
        </div>

        <div className="mt-6 grid gap-6 lg:grid-cols-2">
          <RankedBars
            title="Zones"
            subtitle="Départements du portefeuille, grain maximal autorisé. Commissions annuelles."
            shares={byDepartment}
          />
          <YearlyRenewals buckets={schedule} />
        </div>

        <div className="mt-6 grid gap-6 lg:grid-cols-2">
          <ConcentrationMeter
            title="Poids des dix premiers clients"
            value={top10}
            status={clientStatus}
            scaleLabels={["Diversifié", "Concentré"]}
            detail="Part des commissions portée par les dix plus gros clients, sans aucun nom."
          />
          <ConcentrationMeter
            title="Concentration compagnies"
            value={carrierHhi}
            status={carrierStatus}
            scaleLabels={["Réparti", "Dépendant"]}
            detail="Indice de Herfindahl sur les compagnies. Au-delà de 0,30, la dépendance pèse."
          />
        </div>

        <p className="mt-6 rounded-2xl border border-line bg-paper px-5 py-4 text-[13px] leading-relaxed text-muted">
          Fiche anonyme. Ni raison sociale, ni commune, ni donnée nominative de client
          final. Les chiffres de mix viennent des commissions, pas d’un historique inventé.
        </p>

        <div id="interesse" className="mt-8 grid gap-6">
          {children}
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

function YearlyRenewals({ buckets }: { buckets: MaturityBucket[] }) {
  const years = groupMaturityByYear(buckets);
  const total = years.reduce((sum, year) => sum + year.commissions, 0);
  const hasData = years.some((year) => year.commissions > 0);

  return (
    <article className="rounded-3xl border border-line bg-paper p-7 shadow-sm">
      <h3 className="text-lg font-semibold text-ink">Renouvellements par année</h3>
      <p className="mt-1 text-sm text-muted">
        Commissions annuelles dont l’échéance tombe dans les douze prochains
        mois, regroupées par année civile. Pas de détail mensuel.
      </p>
      {!hasData ? (
        <p className="mt-4 text-[15px] text-muted">Aucune échéance renseignée sur la période.</p>
      ) : (
        <table className="mt-5 w-full border-collapse text-left">
          <thead>
            <tr className="border-b border-line text-[12px] text-muted">
              <th scope="col" className="py-2 pr-3 font-medium">
                Année
              </th>
              <th scope="col" className="py-2 pr-3 text-right font-medium">
                Commissions / an
              </th>
              <th scope="col" className="py-2 text-right font-medium">
                Contrats
              </th>
            </tr>
          </thead>
          <tbody>
            {years.map((year) => (
              <tr key={year.year} className="border-b border-line">
                <th scope="row" className="py-2.5 pr-3 text-[15px] font-medium text-ink">
                  {year.year}
                </th>
                <td className="tabular py-2.5 pr-3 text-right text-[15px] text-ink">
                  {formatEuroWhole(year.commissions)}
                </td>
                <td className="tabular py-2.5 text-right text-[15px] text-ink">
                  {formatCount(year.contracts)}
                </td>
              </tr>
            ))}
          </tbody>
          <tfoot>
            <tr>
              <th scope="row" className="pt-3 pr-3 text-[15px] font-semibold text-ink">
                Total
              </th>
              <td className="tabular pt-3 pr-3 text-right text-[15px] font-semibold text-ink">
                {formatEuroWhole(total)}
              </td>
              <td className="tabular pt-3 text-right text-[15px] font-semibold text-ink">
                {formatCount(years.reduce((sum, year) => sum + year.contracts, 0))}
              </td>
            </tr>
          </tfoot>
        </table>
      )}
    </article>
  );
}
