import { redirect } from "next/navigation";
import { ListingReviewActions } from "@/components/admin/listing-review-actions";
import { getActor, isAdmin } from "@/lib/authz";
import { formatDateTime } from "@/lib/format/fr";
import { formatEuroWhole } from "@/lib/format/number";
import { DATA_ROOM_KINDS } from "@/lib/listing/company-doc-kinds";
import { ASKING_MAX, ASKING_MIN } from "@/lib/listing/constants";
import { commissionsCedees, listingLotTotals } from "@/lib/listing/lot-totals";
import { listListingsToReview } from "@/lib/listing/review";

export const metadata = { title: "Dossiers à étudier" };

export default async function AdminListingsReviewPage() {
  const actor = await getActor();
  if (!actor) redirect("/connexion?next=/admin/annonces");
  if (!isAdmin(actor)) redirect("/app");
  const annonces = await listListingsToReview();
  const lots = await listingLotTotals(annonces.filter((a) => a.isPartial).map((a) => a.id));

  return (
    <main className="mx-auto max-w-6xl px-4 py-6">
      <h1 className="font-serif text-2xl text-ink">Dossiers à étudier</h1>
      <p className="mt-1 max-w-2xl text-sm text-muted">
        Le cédant ne fixe pas le prix. Réalisez l’étude du portefeuille (sincérité des chiffres, anonymat, complétude),
        fixez le prix, puis mettez l’annonce en ligne : la séance de 21 jours s’ouvre. Renvoyé, le dossier part au cédant
        avec le motif.
      </p>
      <div className="mt-4 overflow-x-auto rounded-xl border border-line bg-surface">
        <table className="w-full min-w-[56rem] text-sm">
          <thead className="bg-surface-alt text-left text-xs uppercase tracking-wide text-muted">
            <tr>
              <th className="px-3 py-2 font-medium">Dossier</th>
              <th className="px-3 py-2 font-medium">Cabinet</th>
              <th className="px-3 py-2 text-right font-medium">Étude · commissions</th>
              <th className="px-3 py-2 font-medium">Présentation</th>
              <th className="px-3 py-2 font-medium">Décision</th>
            </tr>
          </thead>
          <tbody>
            {annonces.length === 0 ? (
              <tr>
                <td colSpan={5} className="px-3 py-6 text-center text-muted">
                  Aucune annonce en attente.
                </td>
              </tr>
            ) : (
              annonces.map((a) => {
                const etude = a.valuations[0];
                const suggere = Math.round(Number(etude?.midValue ?? a.askingPrice));
                const pieces = DATA_ROOM_KINDS.filter((k) => a.companyDocuments.some((d) => d.kind === k)).length;
                return (
                  <tr key={a.id} className="border-t border-line align-top">
                    <td className="px-3 py-3">
                      <span className="font-medium text-ink">N° {a.publicNumber}</span>
                      <span className="block text-[13px] text-muted">{a.portfolio.label}</span>
                      <span className="block text-[13px] text-muted">
                        {a.displayedZone} · soumise le {a.submittedForReviewAt ? formatDateTime(a.submittedForReviewAt) : "date inconnue"}
                      </span>
                    </td>
                    <td className="px-3 py-3">
                      <span className="text-ink">{a.portfolio.firm.legalName}</span>
                      <span className="block text-[13px] tabular text-muted">{a.portfolio.firm.siren}</span>
                      <span className="block text-[13px] text-muted">Pièces du cabinet : {pieces} / {DATA_ROOM_KINDS.length}</span>
                    </td>
                    <td className="px-3 py-3 text-right tabular">
                      {etude
                        ? `${formatEuroWhole(Number(etude.lowValue))} à ${formatEuroWhole(Number(etude.highValue))}`
                        : "Étude à faire"}
                      <span className="block text-[13px] text-muted">
                        {formatEuroWhole(commissionsCedees(a, lots))} · {lots.get(a.id)?.contractCount ?? a.portfolio.contractCount} contrats
                      </span>
                    </td>
                    <td className="max-w-[22rem] px-3 py-3 text-[13px] text-ink">{a.presentation?.slice(0, 400) || <span className="text-muted">Aucune</span>}</td>
                    <td className="px-3 py-3">
                      <ListingReviewActions listingId={a.id} suggestedPrice={Math.min(ASKING_MAX, Math.max(ASKING_MIN, suggere))} />
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>
    </main>
  );
}
