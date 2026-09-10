import { notFound, redirect } from "next/navigation";
import { getActor, isOriasVerified, listOffersForListing } from "@/lib/authz";
import { formatDate, formatEuro } from "@/lib/format/fr";
import { ForbiddenError } from "@/lib/authz/errors";

export const metadata = { title: "Offres" };

export default async function ListingOffersPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const actor = await getActor();
  if (!actor) redirect("/connexion");
  if (!isOriasVerified(actor)) redirect("/en-attente-orias");
  const { id } = await params;
  let result: Awaited<ReturnType<typeof listOffersForListing>>;
  try {
    result = await listOffersForListing(id, actor);
  } catch (error) {
    if (error instanceof ForbiddenError) notFound();
    throw error;
  }

  return (
    <main className="mx-auto max-w-4xl px-4 py-6">
      <h1 className="text-2xl font-bold tracking-tight text-ink">Offres</h1>
      {result.access === "sealed" ? (
        <p className="mt-4 border border-line bg-paper px-4 py-3 text-sm">
          Fenêtre d&apos;offres en cours. Les montants et le nombre d&apos;offres restent
          masqués jusqu&apos;à la clôture, y compris pour vous.
        </p>
      ) : result.offers.length === 0 ? (
        <p className="mt-4 text-sm text-muted">Aucune offre visible.</p>
      ) : (
        <div className="mt-4 overflow-x-auto border border-line bg-paper">
          <table className="w-full text-sm">
            <thead className="bg-surface-alt text-left text-xs uppercase tracking-wide text-muted">
              <tr>
                <th className="px-2 py-1.5 font-medium">Acquéreur</th>
                <th className="px-2 py-1.5 text-right font-medium">Montant</th>
                <th className="px-2 py-1.5 text-right font-medium">Comptant</th>
                <th className="px-2 py-1.5 font-medium">Statut</th>
                <th className="px-2 py-1.5 font-medium">Déposée le</th>
              </tr>
            </thead>
            <tbody>
              {result.offers.map((o) => (
                <tr key={o.id} className="border-t border-line">
                  <td className="px-2 py-1.5">#{o.buyer.publicAlias}</td>
                  <td className="px-2 py-1.5 text-right tabular-nums">{formatEuro(o.amount)}</td>
                  <td className="px-2 py-1.5 text-right tabular-nums">
                    {Number(o.upfrontPercent).toLocaleString("fr-FR")} %
                  </td>
                  <td className="px-2 py-1.5">{o.status}</td>
                  <td className="px-2 py-1.5">{formatDate(o.submittedAt)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </main>
  );
}
