import Link from "next/link";
import { listPublicListings } from "@/lib/authz";
import { formatEuro } from "@/lib/format/fr";
import { LISTING_STATUS_LABELS } from "@/lib/labels";

export const metadata = { title: "Annonces" };

export default async function PublicListingsPage() {
  const listings = await listPublicListings();
  return (
    <main className="mx-auto max-w-6xl px-4 py-6">
      <h1 className="font-serif text-2xl text-navy">Portefeuilles à céder</h1>
      <p className="mt-1 text-sm text-muted">
        Fiches anonymes. L&apos;identité du cédant n&apos;est révélée qu&apos;à la lettre d&apos;intention.
      </p>
      <div className="mt-4 overflow-x-auto border border-line bg-paper">
        <table className="w-full text-sm">
          <thead className="bg-cream text-left text-xs uppercase tracking-wide text-muted">
            <tr>
              <th className="px-2 py-1.5 font-medium">Dossier</th>
              <th className="px-2 py-1.5 font-medium">Zone</th>
              <th className="px-2 py-1.5 text-right font-medium">Prix</th>
              <th className="px-2 py-1.5 text-right font-medium">Commissions / an</th>
              <th className="px-2 py-1.5 font-medium">Statut</th>
            </tr>
          </thead>
          <tbody>
            {listings.length === 0 ? (
              <tr>
                <td className="px-2 py-3 text-muted" colSpan={5}>
                  Aucune annonce publique pour le moment.
                </td>
              </tr>
            ) : (
              listings.map((l) => (
                <tr key={l.id} className="border-t border-line">
                  <td className="px-2 py-1.5">
                    <Link href={`/annonces/${l.publicNumber}`} className="underline-offset-2 hover:underline">
                      #{l.publicNumber}
                    </Link>
                    {l.isPartial ? <span className="ml-1 text-xs text-muted">partiel</span> : null}
                  </td>
                  <td className="px-2 py-1.5">{l.displayedZone}</td>
                  <td className="px-2 py-1.5 text-right tabular-nums">{formatEuro(l.askingPrice)}</td>
                  <td className="px-2 py-1.5 text-right tabular-nums">
                    {formatEuro(l.portfolio.annualCommissions)}
                  </td>
                  <td className="px-2 py-1.5">{LISTING_STATUS_LABELS[l.status]}</td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </main>
  );
}
