import Link from "next/link";
import { redirect } from "next/navigation";
import { Button } from "@/components/ui/button";
import { RankedBars } from "@/components/charts/ranked-bars";
import { MaturityColumns } from "@/components/charts/maturity-columns";
import { CarrierCodesPanel } from "@/components/portfolio/carrier-codes-panel";
import {
  ConcentrationMeter,
  MarketPositionCard,
} from "@/components/charts/concentration-meter";
import { RecalculateValuationButton } from "@/components/valuation/recalculate-button";
import {
  canSell,
  findMyPortfolio,
  getActor,
  isOriasVerified,
  listPortfolioLines,
} from "@/lib/authz";
import { formatDate, formatEuro, formatPercent } from "@/lib/format/fr";
import { formatCount, formatEuroWhole } from "@/lib/format/number";
import {
  SEGMENT_LABELS,
  DISTRIBUTION_LABELS,
  LISTING_STATUS_LABELS,
  RISK_TYPE_LABELS,
} from "@/lib/labels";
import {
  breakdownBy,
  dominantSegment,
  herfindahl,
  marketPosition,
  maturitySchedule,
  topClientShare,
  type AnalyticsLine,
} from "@/lib/portfolio/analytics";
import { buildCarrierCodes, carrierRisk } from "@/lib/portfolio/carrier-codes";
import { parseValuationBreakdown } from "@/lib/valuation/parse";
import { valuePortfolio } from "@/lib/valuation/run";
import { prisma } from "@/lib/prisma";

export const metadata = { title: "Portefeuille" };

export default async function PortfolioPage({ params }: { params: Promise<{ id: string }> }) {
  const actor = await getActor();
  if (!actor) redirect("/connexion?next=/app");
  if (!isOriasVerified(actor)) redirect("/en-attente-orias");
  if (!canSell(actor)) redirect("/app");
  const { id } = await params;
  let portfolio = await findMyPortfolio(id, actor);
  if (!portfolio) redirect("/app");

  if (portfolio.valuations.length === 0) {
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

  const carrierHhi = herfindahl(byCarrier);
  const top10 = topClientShare(lines);
  const schedule = maturitySchedule(lines, new Date());
  const position = valuation
    ? marketPosition(
        Number(valuation.midValue),
        Number(portfolio.annualCommissions),
        dominantSegment(lines),
      )
    : null;

  const knownCodes = await prisma.carrierCode.findMany({
    where: { portfolioId: portfolio.id },
    select: { carrier: true, status: true, note: true },
  });
  const carrierCodes = buildCarrierCodes(
    lines.map((l) => ({ carrier: l.carrier, annualCommission: l.annualCommission })),
    knownCodes,
  );
  const codesRisk = carrierRisk(carrierCodes);

  const carrierStatus = carrierHhi > 0.6 ? "penalisant" : carrierHhi >= 0.3 ? "surveiller" : "bon";
  const clientStatus = top10 > 0.4 ? "penalisant" : top10 > 0.25 ? "surveiller" : "bon";

  const KPIS = [
    { label: "Commissions annuelles", value: formatEuroWhole(Number(portfolio.annualCommissions)) },
    { label: "Contrats", value: formatCount(portfolio.contractCount) },
    { label: "Clients", value: formatCount(portfolio.clientCount) },
    { label: "Ancienneté moyenne", value: `${formatCount(portfolio.averageAgeMonths)} mois` },
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
              Créer une annonce
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

      {/* Valorisation */}
      {valuation ? (
        <section className="mt-10">
          <h2 className="text-2xl font-semibold text-ink">Valorisation</h2>
          <p className="mt-1.5 text-[15px] text-muted">
            Score de qualité {valuation.qualityScore} sur 100 · algorithme{" "}
            {valuation.algorithmVersion} · calculée le {formatDate(valuation.computedAt)}
          </p>

          <div className="mt-5 grid gap-5 lg:grid-cols-[1.4fr_1fr]">
            <div className="rounded-3xl border border-indigo-line bg-indigo-soft p-6">
              <p className="text-[13px] font-medium uppercase tracking-[0.14em] text-indigo-dark">
                Fourchette
              </p>
              <div className="mt-4 grid grid-cols-3 gap-4">
                <div>
                  <p className="text-sm text-muted">Basse</p>
                  <p className="tabular mt-1 text-xl font-semibold text-ink">
                    {formatEuroWhole(Number(valuation.lowValue))}
                  </p>
                </div>
                <div>
                  <p className="text-sm font-medium text-indigo-dark">Médiane</p>
                  <p className="tabular mt-1 text-3xl font-semibold text-ink">
                    {formatEuroWhole(Number(valuation.midValue))}
                  </p>
                </div>
                <div className="text-right">
                  <p className="text-sm text-muted">Haute</p>
                  <p className="tabular mt-1 text-xl font-semibold text-ink">
                    {formatEuroWhole(Number(valuation.highValue))}
                  </p>
                </div>
              </div>
              <p className="mt-5 border-t border-indigo-line pt-4 text-[15px] leading-relaxed text-muted">
                Valeur brute issue des multiples par branche :{" "}
                {formatEuroWhole(Number(valuation.grossValue))}, corrigée par les sept
                coefficients ci-dessous.
              </p>
            </div>

            {position ? <MarketPositionCard position={position} /> : null}
          </div>
        </section>
      ) : (
        <p className="mt-8 rounded-3xl border border-line bg-paper p-6 text-[15px] text-muted">
          Pas encore de valorisation. Lancez le calcul pour obtenir la fourchette et le
          détail des correctifs.
        </p>
      )}

      {/* Cascade */}
      {breakdown ? (
        <section className="mt-10">
          <h2 className="text-2xl font-semibold text-ink">
            Le détail de la cascade
          </h2>
          <p className="mt-1.5 max-w-3xl text-[15px] text-muted">
            Chaque coefficient est appliqué à la suite du précédent. La colonne impact
            indique ce que ce poste vous coûte ou vous rapporte, en euros.
          </p>
          <div className="mt-5 overflow-x-auto rounded-3xl border border-line bg-paper">
            <table className="w-full min-w-[34rem] border-collapse text-left">
              <thead>
                <tr className="border-b border-line">
                  <th scope="col" className="px-6 py-4 text-[15px] font-semibold text-ink">
                    Correctif
                  </th>
                  <th scope="col" className="px-4 py-4 text-right text-[15px] font-semibold text-ink">
                    Coefficient
                  </th>
                  <th scope="col" className="px-6 py-4 text-right text-[15px] font-semibold text-ink">
                    Impact
                  </th>
                </tr>
              </thead>
              <tbody>
                {breakdown.adjustments.map((row) => (
                  <tr key={row.key} className="border-b border-line last:border-b-0">
                    <th scope="row" className="px-6 py-4 text-[15px] font-normal text-ink">
                      {row.label}
                    </th>
                    <td className="tabular px-4 py-4 text-right text-[15px] text-muted">
                      {row.factor.toLocaleString("fr-FR", { minimumFractionDigits: 2 })}
                    </td>
                    <td
                      className={
                        row.impactEur < 0
                          ? "tabular px-6 py-4 text-right text-[15px] font-medium text-danger"
                          : "tabular px-6 py-4 text-right text-[15px] font-medium text-ok"
                      }
                    >
                      {row.impactEur > 0 ? "+" : ""}
                      {formatEuro(row.impactEur)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      ) : null}

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
          <ConcentrationMeter
            title="Concentration des compagnies"
            value={carrierHhi}
            status={carrierStatus}
            scaleLabels={["Diversifié", "Compagnie unique"]}
            detail={
              carrierStatus === "bon"
                ? "Votre panel est suffisamment large pour qu’aucune compagnie ne fasse basculer la valeur à elle seule."
                : carrierStatus === "surveiller"
                  ? "Votre dépendance à un nombre restreint de compagnies applique un coefficient de 0,92 à la valorisation. Élargir le panel la relèverait."
                  : "Une compagnie domine votre portefeuille. Le coefficient tombe à 0,80, et un refus de transfert de code menacerait une part importante des commissions."
            }
          />
          <ConcentrationMeter
            title="Poids des dix premiers clients"
            value={top10}
            status={clientStatus}
            scaleLabels={["Réparti", "Concentré"]}
            detail={
              clientStatus === "bon"
                ? "Le départ d’un client ne se verrait pas dans les comptes de l’acquéreur."
                : clientStatus === "surveiller"
                  ? "Au delà de 25 %, un acquéreur applique une décote. Étaler le risque relèverait la valeur."
                  : "Au delà de 40 %, le départ d’un seul client se voit immédiatement. C’est le premier point qu’un acquéreur soulèvera."
            }
          />
        </div>

        <div className="mt-5 grid gap-5 lg:grid-cols-2">
          <RankedBars
            title="Répartition par compagnie"
            subtitle="Part des commissions annuelles portée par chaque compagnie."
            shares={byCarrier}
          />
          <RankedBars
            title="Répartition par branche"
            subtitle="Les branches professionnelles se négocient plus cher que les particuliers."
            shares={byRisk}
          />
        </div>

        <div className="mt-5 grid gap-5 lg:grid-cols-2">
          <RankedBars
            title="Répartition par clientèle"
            subtitle="La clientèle dominante détermine la fourchette de multiple applicable."
            shares={bySegment}
          />
          <RankedBars
            title="Implantation géographique"
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
          <h2 className="text-2xl font-semibold text-ink">
            Ce qui relèverait votre valorisation
          </h2>
          <p className="mt-1.5 max-w-3xl text-[15px] text-muted">
            Chaque levier est chiffré à partir de votre propre cascade. Douze mois de
            préparation valent souvent davantage que six mois de négociation.
          </p>
          <ul className="mt-5 grid gap-5 lg:grid-cols-2">
            {breakdown.actions.map((action) => (
              <li key={action.title} className="rounded-3xl border border-line bg-paper p-6">
                <h3 className="text-lg font-semibold text-ink">{action.title}</h3>
                <p className="mt-2 text-[15px] leading-relaxed text-muted">{action.detail}</p>
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
                    {formatEuroWhole(Number(listing.askingPrice))}
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
