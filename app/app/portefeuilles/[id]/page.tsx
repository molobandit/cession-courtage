import Link from "next/link";
import { redirect } from "next/navigation";
import { RecalculateValuationButton } from "@/components/valuation/recalculate-button";
import { canSell, findMyPortfolio, getActor, isOriasVerified } from "@/lib/authz";
import { formatDate, formatEuro, formatPercent } from "@/lib/format/fr";
import { DISTRIBUTION_LABELS, LISTING_STATUS_LABELS } from "@/lib/labels";
import { parseValuationBreakdown } from "@/lib/valuation/parse";
import { valuePortfolio } from "@/lib/valuation/run";

export const metadata = { title: "Valorisation" };

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

  return (
    <main className="mx-auto max-w-6xl px-4 py-6">
      <p className="text-sm text-muted">
        <Link href="/app" className="underline-offset-2 hover:underline">
          Espace membre
        </Link>
        {" / "}
        Portefeuille
      </p>
      <div className="mt-1 flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="font-serif text-2xl text-navy">{portfolio.label}</h1>
          <p className="text-sm text-muted">
            {portfolio.contractCount.toLocaleString("fr-FR")} contrats ·{" "}
            {portfolio.clientCount.toLocaleString("fr-FR")} clients ·{" "}
            {formatEuro(portfolio.annualCommissions)} / an · ancienneté {portfolio.averageAgeMonths} mois ·
            résiliation {formatPercent(Number(portfolio.churnRate12m) * 100)} ·{" "}
            {DISTRIBUTION_LABELS[portfolio.firm.distributionMode]}
          </p>
        </div>
        <div className="flex gap-2">
          <RecalculateValuationButton portfolioId={portfolio.id} />
          <Link
            href={`/app/annonces/nouvelle?portfolio=${portfolio.id}`}
            className="inline-flex h-8 items-center rounded-sm bg-navy px-2.5 text-xs font-medium text-cream"
          >
            Créer une annonce
          </Link>
        </div>
      </div>

      {valuation ? (
        <section className="mt-6 grid gap-3 sm:grid-cols-4">
          {[
            { k: "Brut", v: valuation.grossValue },
            { k: "Basse", v: valuation.lowValue },
            { k: "Médiane", v: valuation.midValue },
            { k: "Haute", v: valuation.highValue },
          ].map((item) => (
            <div key={item.k} className="border border-line bg-paper p-3">
              <p className="text-xs uppercase tracking-wide text-muted">{item.k}</p>
              <p className="mt-1 font-serif text-xl text-navy">{formatEuro(item.v)}</p>
            </div>
          ))}
        </section>
      ) : (
        <p className="mt-6 text-sm text-muted">Pas encore de valorisation. Lancez le calcul.</p>
      )}

      {valuation ? (
        <p className="mt-2 text-sm text-muted">
          Score qualité {valuation.qualityScore}/100 · algorithme {valuation.algorithmVersion} ·{" "}
          {formatDate(valuation.computedAt)}
        </p>
      ) : null}

      {breakdown ? (
        <section className="mt-6">
          <h2 className="font-serif text-lg text-navy">Cascade</h2>
          <div className="mt-2 overflow-x-auto border border-line bg-paper">
            <table className="w-full text-sm">
              <thead className="bg-cream text-left text-xs uppercase tracking-wide text-muted">
                <tr>
                  <th className="px-2 py-1.5 font-medium">Correctif</th>
                  <th className="px-2 py-1.5 text-right font-medium">Facteur</th>
                  <th className="px-2 py-1.5 text-right font-medium">Impact</th>
                </tr>
              </thead>
              <tbody>
                {breakdown.adjustments.map((row) => (
                  <tr key={row.key} className="border-t border-line">
                    <td className="px-2 py-1.5">{row.label}</td>
                    <td className="px-2 py-1.5 text-right tabular-nums">× {row.factor.toLocaleString("fr-FR")}</td>
                    <td className="px-2 py-1.5 text-right tabular-nums">{formatEuro(row.impactEur)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      ) : null}

      {breakdown && breakdown.actions.length > 0 ? (
        <section className="mt-6">
          <h2 className="font-serif text-lg text-navy">Leviers</h2>
          <ul className="mt-2 grid gap-2">
            {breakdown.actions.map((action) => (
              <li key={action.title} className="border border-line bg-paper p-3">
                <p className="text-sm font-medium text-navy">{action.title}</p>
                <p className="mt-1 text-sm text-muted">{action.detail}</p>
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      {portfolio.listings.length > 0 ? (
        <section className="mt-6">
          <h2 className="font-serif text-lg text-navy">Annonces</h2>
          <ul className="mt-2 text-sm">
            {portfolio.listings.map((listing) => (
              <li key={listing.id}>
                <Link href={`/app/annonces/${listing.id}`} className="underline-offset-2 hover:underline">
                  #{listing.publicNumber} · {LISTING_STATUS_LABELS[listing.status]} ·{" "}
                  {formatEuro(listing.askingPrice)}
                </Link>
              </li>
            ))}
          </ul>
        </section>
      ) : null}
    </main>
  );
}
