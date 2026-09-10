import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { RetentionForm } from "@/components/deal/deal-forms";
import { findMyDeal, getActor, isOriasVerified } from "@/lib/authz";
import { formatDate, formatEuro, formatPercent } from "@/lib/format/fr";
import { prisma } from "@/lib/prisma";

export const metadata = { title: "Rétention" };

export default async function RetentionPage({ params }: { params: Promise<{ id: string }> }) {
  const actor = await getActor();
  if (!actor) redirect("/connexion");
  if (!isOriasVerified(actor)) redirect("/en-attente-orias");
  const { id } = await params;
  const deal = await findMyDeal(id, actor);
  if (!deal) notFound();

  const listing = await prisma.listing.findFirst({
    where: { publicNumber: deal.listing.publicNumber },
    select: { portfolio: { select: { contractCount: true } } },
  });
  const transferred = listing?.portfolio.contractCount ?? 0;

  return (
    <main className="mx-auto max-w-3xl px-4 py-6">
      <p className="text-sm text-muted">
        <Link href={`/app/dossiers/${deal.id}`} className="underline-offset-2 hover:underline">
          Dossier
        </Link>
      </p>
      <h1 className="mt-1 text-2xl font-bold tracking-tight text-ink">Rétention post-cession</h1>
      <p className="text-sm text-muted">
        Cible 90 %. Le différé est recalculé à M+12 : différé × (taux / 0,90), borné entre 50 % et 100 %.
      </p>
      {deal.adjustedDeferredAmount ? (
        <p className="mt-2 text-sm">
          Différé ajusté : {formatEuro(Number(deal.adjustedDeferredAmount))} (initial{" "}
          {formatEuro(Number(deal.deferredAmount))})
        </p>
      ) : null}

      <div className="mt-4 overflow-x-auto border border-line bg-paper">
        <table className="w-full text-sm">
          <thead className="bg-surface-alt text-left text-xs uppercase text-muted">
            <tr>
              <th className="px-2 py-1.5">Échéance</th>
              <th className="px-2 py-1.5 text-right">Conservés</th>
              <th className="px-2 py-1.5 text-right">Taux</th>
              <th className="px-2 py-1.5">Date</th>
            </tr>
          </thead>
          <tbody>
            {deal.retentionReports.length === 0 ? (
              <tr>
                <td className="px-2 py-3 text-muted" colSpan={4}>
                  Aucune déclaration.
                </td>
              </tr>
            ) : (
              deal.retentionReports.map((r) => (
                <tr key={r.id} className="border-t border-line">
                  <td className="px-2 py-1.5">M+{r.monthIndex}</td>
                  <td className="px-2 py-1.5 text-right">
                    {r.contractsRetained}/{r.contractsTransferred}
                  </td>
                  <td className="px-2 py-1.5 text-right">{formatPercent(Number(r.retentionRate) * 100)}</td>
                  <td className="px-2 py-1.5">{formatDate(r.reportedAt)}</td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {deal.stage === "RETENTION" || deal.stage === "CLOSED" ? (
        <section className="mt-6">
          <h2 className="text-lg font-semibold text-ink">Nouvelle déclaration</h2>
          <div className="mt-3">
            <RetentionForm dealId={deal.id} transferred={transferred} />
          </div>
        </section>
      ) : (
        <p className="mt-4 text-sm text-muted">Disponible à l&apos;étape rétention.</p>
      )}
    </main>
  );
}
