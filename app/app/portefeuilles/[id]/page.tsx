import Link from "next/link";
import { redirect } from "next/navigation";
import { Button } from "@/components/ui/button";
import { RankedBars } from "@/components/charts/ranked-bars";
import { MaturityColumns } from "@/components/charts/maturity-columns";
import { CarrierCodesPanel } from "@/components/portfolio/carrier-codes-panel";
import { RecalculateValuationButton } from "@/components/valuation/recalculate-button";
import {
  canSell,
  findMyPortfolio,
  getActor,
  isOriasVerified,
  listPortfolioLines,
} from "@/lib/authz";
import { formatDate, formatPercent } from "@/lib/format/fr";
import { formatCount, formatEuroWhole } from "@/lib/format/number";
import {
  SEGMENT_LABELS,
  DISTRIBUTION_LABELS,
  LISTING_STATUS_LABELS,
  RISK_TYPE_LABELS,
} from "@/lib/labels";
import {
  breakdownBy,
  maturitySchedule,
  type AnalyticsLine,
} from "@/lib/portfolio/analytics";
import { buildCarrierCodes, carrierRisk } from "@/lib/portfolio/carrier-codes";
import { qualityFactRows, qualityFromPortfolio } from "@/lib/portfolio/quality";
import { valuePortfolio } from "@/lib/valuation/run";
import { ALGORITHM_VERSION } from "@/lib/valuation/types";
import { parseValuationBreakdown } from "@/lib/valuation/parse";
import { prisma } from "@/lib/prisma";
import { PRICE_RULE_SENTENCES, STUDY_SENTENCE } from "@/lib/copy/market";

export const metadata = { title: "Portefeuille" };

/** Leviers présentés au cédant, sans montant : l'étude ne chiffre pas son portefeuille devant lui. */
const LEVIER_DETAILS: Record<string, string> = {
  "Maîtriser la résiliation": "Un taux de résiliation élevé sur douze mois pèse sur l’intérêt des acquéreurs. Le réduire renforce le dossier.",
  "Proposer un accompagnement": "Accompagner l’acquéreur quelques mois après la cession rassure et facilite la reprise de la clientèle.",
};

export default async function PortfolioPage({ params }: { params: Promise<{ id: string }> }) {
  const actor = await getActor();
  if (!actor) redirect("/connexion?next=/app");
  if (!isOriasVerified(actor)) redirect("/en-attente-orias");
  if (!canSell(actor)) redirect("/app");
  const { id } = await params;
  let portfolio = await findMyPortfolio(id, actor);
  if (!portfolio) redirect("/app");

  // Une valorisation calculée avec une méthode retirée est recalculée à l'ouverture.
  if (portfolio.valuations.length === 0 || portfolio.valuations[0].algorithmVersion !== ALGORITHM_VERSION) {
    await valuePortfolio(portfolio.id).catch(() => null);
    portfolio = (await findMyPortfolio(id, actor)) ?? portfolio;
  }

  const valuation = portfolio.valuations[0] ?? null;
  const breakdown = valuation ? parseValuationBreakdown(valuation.breakdown) : null;

  const rows = await listPortfolioLines(portfolio.id, actor);
  const lines: AnalyticsLine[] = rows.map((row) => ({
    carrier: row.carrier,
    riskType: row.riskType,
    clientSegment: row.clientSegment,
    department: row.department,
    clientKey: row.clientKey,
    annualCommission: Number(row.annualCommission),
    renewalDate: row.renewalDate,
    effectiveDate: row.effectiveDate,
  }));

  const byCarrier = breakdownBy(lines, (l) => l.carrier);
  const byRisk = breakdownBy(lines, (l) => RISK_TYPE_LABELS[l.riskType as keyof typeof RISK_TYPE_LABELS] ?? l.riskType);
  const bySegment = breakdownBy(
    lines,
    (l) => SEGMENT_LABELS[l.clientSegment as keyof typeof SEGMENT_LABELS] ?? l.clientSegment,
    4,
  );
  const byDepartment = breakdownBy(lines, (l) => `Département ${l.department}`, 6);

  const schedule = maturitySchedule(lines, new Date());

  const knownCodes = await prisma.carrierCode.findMany({
    where: { portfolioId: portfolio.id },
    select: { carrier: true, status: true, note: true },
  });
  const carrierCodes = buildCarrierCodes(
    lines.map((l) => ({ carrier: l.carrier, annualCommission: l.annualCommission })),
    knownCodes,
  );
  const codesRisk = carrierRisk(carrierCodes);


  const KPIS = [
    { label: "Commissions annuelles", value: formatEuroWhole(Number(portfolio.annualCommissions)) },
    { label: "Contrats", value: formatCount(portfolio.contractCount) },
    { label: "Clients", value: formatCount(portfolio.clientCount) },
    { label: "Ancienneté moyenne", value: `${formatCount(portfolio.averageAgeMonths)} mois` },
    ...qualityFactRows(qualityFromPortfolio(portfolio)),
  ];

  return (
    <main className="mx-auto max-w-6xl px-4 py-8">
      <p className="text-[15px] text-muted">
        <Link href="/app" className="underline-offset-4 hover:underline">
          Espace membre
        </Link>
        {" / Portefeuille"}
      </p>

      <div className="mt-2 flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-3xl font-semibold text-ink">{portfolio.label}</h1>
          <p className="mt-1.5 text-[15px] text-muted">
            {DISTRIBUTION_LABELS[portfolio.firm.distributionMode]} · résiliation{" "}
            {formatPercent(Number(portfolio.churnRate12m) * 100)} sur douze mois
          </p>
        </div>
        <div className="flex flex-wrap gap-3">
          <RecalculateValuationButton portfolioId={portfolio.id} />
          <Button asChild variant="primary">
            <Link href={`/app/annonces/nouvelle?portfolio=${portfolio.id}`}>
              Proposer à la vente
            </Link>
          </Button>
        </div>
      </div>

      {/* Chiffres de tête */}
      <section className="mt-8 grid grid-cols-2 gap-px overflow-hidden rounded-3xl border border-line bg-line lg:grid-cols-4">
        {KPIS.map((kpi) => (
          <div key={kpi.label} className="bg-paper p-5">
            <p className="text-sm text-muted">{kpi.label}</p>
            <p className="tabular mt-1.5 text-2xl font-semibold text-ink">{kpi.value}</p>
          </div>
        ))}
      </section>

      {/* Étude du portefeuille : le cédant voit ses caractéristiques, jamais un prix. */}
      <section className="mt-10">
        <h2 className="text-2xl font-semibold text-ink">Étude du portefeuille</h2>
        <p className="mt-1.5 max-w-3xl text-[15px] text-muted">
          {STUDY_SENTENCE} {PRICE_RULE_SENTENCES[2]}
          {valuation ? ` Score de qualité ${valuation.qualityScore} sur 100, étude du ${formatDate(valuation.computedAt)}.` : ""}
        </p>
        {breakdown ? (
          <ul className="mt-5 grid gap-3 sm:grid-cols-2">
            {breakdown.adjustments.map((row) => {
              const effet = row.factor > 1 ? "Point fort" : row.factor < 1 ? "Point à améliorer" : "Dans la moyenne";
              const ton = row.factor > 1 ? "text-ok" : row.factor < 1 ? "text-danger" : "text-muted";
              return (
                <li key={row.key} className="flex items-center justify-between gap-4 rounded-2xl border border-line bg-paper px-5 py-4">
                  <span className="text-[15px] text-ink">{row.label}</span>
                  <span className={`shrink-0 text-[13px] font-semibold ${ton}`}>{effet}</span>
                </li>
              );
            })}
          </ul>
        ) : (
          <p className="mt-5 rounded-3xl border border-line bg-paper p-6 text-[15px] text-muted">
            L’étude n’est pas encore faite. Lancez-la pour voir les éléments de votre portefeuille.
          </p>
        )}
      </section>

      {/* Composition */}
      <section className="mt-10">
        <h2 className="text-2xl font-semibold text-ink">
          Composition du portefeuille
        </h2>
        <p className="mt-1.5 max-w-3xl text-[15px] text-muted">
          Ce sont les chiffres qu’un acquéreur demande systématiquement en
          vérification préalable. Les avoir prêts raccourcit la négociation.
        </p>

        <div className="mt-5 grid gap-5 lg:grid-cols-2">
          <RankedBars
            title="Répartition par compagnie"
            unit={["compagnie", "compagnies"]}
            subtitle="Part des commissions annuelles portée par chaque compagnie."
            shares={byCarrier}
          />
          <RankedBars
            title="Répartition par branche"
            unit={["branche", "branches"]}
            subtitle="Les branches professionnelles se négocient plus cher que les particuliers."
            shares={byRisk}
          />
        </div>

        <div className="mt-5 grid gap-5 lg:grid-cols-2">
          <RankedBars
            title="Répartition par clientèle"
            unit={["profil", "profils"]}
            subtitle="Les acquéreurs regardent d’abord la clientèle dominante."
            shares={bySegment}
          />
          <RankedBars
            title="Implantation géographique"
            unit={["département", "départements"]}
            subtitle="Un acquéreur cherche une zone qu’il sait déjà servir."
            shares={byDepartment}
          />
        </div>

        <div className="mt-5">
          <MaturityColumns buckets={schedule} />
        </div>
      </section>

      <CarrierCodesPanel
        portfolioId={portfolio.id}
        rows={carrierCodes}
        risk={codesRisk}
      />

      {/* Leviers */}
      {breakdown && breakdown.actions.length > 0 ? (
        <section className="mt-10">
          <h2 className="text-2xl font-semibold text-ink">Ce qui renforcerait votre dossier</h2>
          <ul className="mt-5 grid gap-5 lg:grid-cols-2">
            {breakdown.actions.map((action) => (
              <li key={action.title} className="rounded-3xl border border-line bg-paper p-6">
                <h3 className="text-lg font-semibold text-ink">{action.title}</h3>
                <p className="mt-2 text-[15px] leading-relaxed text-muted">{LEVIER_DETAILS[action.title] ?? "Un point que les acquéreurs regardent de près."}</p>
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      {/* Annonces */}
      {portfolio.listings.length > 0 ? (
        <section className="mt-10">
          <h2 className="text-2xl font-semibold text-ink">Annonces liées</h2>
          <ul className="mt-5 grid gap-3">
            {portfolio.listings.map((listing) => (
              <li key={listing.id}>
                <Link
                  href={`/app/annonces/${listing.id}`}
                  className="flex flex-wrap items-baseline justify-between gap-3 rounded-3xl border border-line bg-paper px-6 py-4 hover:border-indigo"
                >
                  <span className="tabular text-[15px] font-medium text-ink">
                    Dossier n° {listing.publicNumber}
                  </span>
                  <span className="text-[15px] text-muted">
                    {LISTING_STATUS_LABELS[listing.status]}
                  </span>
                  <span className="tabular text-[15px] text-ink">
                    {listing.publishedAt ? formatEuroWhole(Number(listing.askingPrice)) : "Prix à venir"}
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        </section>
      ) : null}
    </main>
  );
}
