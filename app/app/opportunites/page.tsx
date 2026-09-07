import Link from "next/link";
import { redirect } from "next/navigation";
import { canBuy, getActor, isOriasVerified, listBuyerMatches } from "@/lib/authz";
import { formatEuro } from "@/lib/format/fr";
import { LISTING_STATUS_LABELS } from "@/lib/labels";

export const metadata = { title: "Correspondances" };

export default async function OpportunitiesPage() {
  const actor = await getActor();
  if (!actor) redirect("/connexion");
  if (!isOriasVerified(actor)) redirect("/en-attente-orias");
  if (!canBuy(actor)) redirect("/app");
  const matches = await listBuyerMatches(actor);

  return (
    <main className="mx-auto max-w-6xl px-4 py-6">
      <h1 className="font-serif text-2xl text-navy">Correspondances</h1>
      <p className="mt-1 text-sm text-muted">
        Annonces alignées sur vos mandats.{" "}
        <Link href="/app/mandats" className="underline-offset-2 hover:underline">
          Gérer les mandats
        </Link>
      </p>
      <div className="mt-4 overflow-x-auto border border-line bg-paper">
        <table className="w-full text-sm">
          <thead className="bg-cream text-left text-xs uppercase text-muted">
            <tr>
              <th className="px-2 py-1.5">Dossier</th>
              <th className="px-2 py-1.5">Zone</th>
              <th className="px-2 py-1.5 text-right">Prix</th>
              <th className="px-2 py-1.5 text-right">Score</th>
              <th className="px-2 py-1.5">Statut</th>
            </tr>
          </thead>
          <tbody>
            {matches.length === 0 ? (
              <tr>
                <td className="px-2 py-3 text-muted" colSpan={5}>
                  Aucune correspondance. Créez un mandat ou attendez une publication.
                </td>
              </tr>
            ) : (
              matches.map((m) => (
                <tr key={m.id} className="border-t border-line">
                  <td className="px-2 py-1.5">
                    <Link
                      href={`/annonces/${m.listing.publicNumber}`}
                      className="underline-offset-2 hover:underline"
                    >
                      #{m.listing.publicNumber}
                    </Link>
                  </td>
                  <td className="px-2 py-1.5">{m.listing.displayedZone}</td>
                  <td className="px-2 py-1.5 text-right">{formatEuro(m.listing.askingPrice)}</td>
                  <td className="px-2 py-1.5 text-right tabular-nums">{m.score}/100</td>
                  <td className="px-2 py-1.5">{LISTING_STATUS_LABELS[m.listing.status]}</td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </main>
  );
}
