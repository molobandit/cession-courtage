import Link from "next/link";
import { redirect } from "next/navigation";
import { MemberPageHeader } from "@/components/app/member-page-header";
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
    <main className="mx-auto w-full max-w-5xl px-4 py-6 sm:px-6 sm:py-8">
      <MemberPageHeader title="Correspondances">
        Annonces alignées sur vos mandats.{" "}
        <Link href="/app/mandats" className="font-medium text-indigo-dark">
          Gérer les mandats
        </Link>
      </MemberPageHeader>

      <div className="overflow-x-auto rounded-2xl border border-line bg-paper">
        <table className="w-full text-[14px]">
          <thead className="bg-surface-alt text-left text-[12px] text-muted">
            <tr>
              <th className="px-4 py-3 font-medium">Dossier</th>
              <th className="px-4 py-3 font-medium">Zone</th>
              <th className="px-4 py-3 text-right font-medium">Prix</th>
              <th className="px-4 py-3 text-right font-medium">Score</th>
              <th className="px-4 py-3 font-medium">Statut</th>
            </tr>
          </thead>
          <tbody>
            {matches.length === 0 ? (
              <tr>
                <td className="px-4 py-4 text-muted" colSpan={5}>
                  Aucune correspondance. Créez un mandat ou attendez une publication.
                </td>
              </tr>
            ) : (
              matches.map((m) => (
                <tr key={m.id} className="border-t border-line">
                  <td className="px-4 py-3">
                    <Link
                      href={`/annonces/${m.listing.publicNumber}`}
                      className="font-medium text-indigo-dark"
                    >
                      #{m.listing.publicNumber}
                    </Link>
                  </td>
                  <td className="px-4 py-3">{m.listing.displayedZone}</td>
                  <td className="px-4 py-3 text-right">{formatEuro(m.listing.askingPrice)}</td>
                  <td className="px-4 py-3 text-right tabular-nums">{m.score}/100</td>
                  <td className="px-4 py-3">{LISTING_STATUS_LABELS[m.listing.status]}</td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </main>
  );
}
