import Link from "next/link";
import { redirect } from "next/navigation";
import {
  getActor,
  isAdmin,
  listDealsForOversight,
  listDepositsForOversight,
  listDirectDealsForOversight,
} from "@/lib/authz";
import { depositOutcomeLabel, type DepositOutcome } from "@/lib/billing/deposit-fate";
import { feeLines, feesTotal } from "@/lib/direct/fees";
import { nextPipelineAction, pipelineProgressPercent } from "@/lib/deal/pipeline";
import {
  progressPercent as directProgress,
  stepByKey as directStep,
  type DirectStage,
} from "@/lib/direct/stages";
import { readCarriers } from "@/lib/listing/lot-availability";
import { DEAL_STAGE_LABELS } from "@/lib/labels";
import { formatDate } from "@/lib/format/fr";
import { formatEuroWhole } from "@/lib/format/number";

export const metadata = { title: "Suivi des cessions" };

/** Jours écoulés depuis la dernière avancée : c'est là que se voient les blocages. */
function joursDepuis(date: Date): number {
  return Math.max(0, Math.floor((Date.now() - date.getTime()) / 86_400_000));
}

/**
 * Contrôle de l'éditeur sur les cessions en cours.
 *
 * L'éditeur certifie, séquestre et accompagne : il engage sa responsabilité sur
 * ce qui se passe ici. Un compteur ne lui suffit pas — il lui faut voir où
 * chaque dossier est arrêté, depuis combien de temps, et ce qu'il attend.
 *
 * Rien n'est modifiable depuis cet écran, et c'est voulu : avancer un dossier à
 * la place des parties reviendrait à signer pour elles.
 */
export default async function AdminDossiersPage() {
  const actor = await getActor();
  if (!actor) redirect("/connexion?next=/admin/dossiers");
  if (!isAdmin(actor)) redirect("/app");

  const [deals, directs, depots] = await Promise.all([
    listDealsForOversight(actor),
    listDirectDealsForOversight(actor),
    listDepositsForOversight(actor),
  ]);

  const enCours = deals.filter((d) => d.stage !== "CLOSED");
  const bloques = enCours.filter((d) => joursDepuis(d.updatedAt) >= 14);
  const engage = depots
    .filter((d) => d.outcome === "PENDING")
    .reduce((somme, d) => somme + Number(d.amount), 0);

  return (
    <main className="mx-auto max-w-6xl px-4 py-6">
      <h1 className="font-serif text-2xl text-ink">Suivi des cessions</h1>
      <p className="mt-1 max-w-2xl text-sm text-muted">
        {enCours.length} cession{enCours.length > 1 ? "s" : ""} en cours,{" "}
        {directs.filter((d) => d.stage !== "CLOSED").length} de gré à gré,{" "}
        {formatEuroWhole(engage)} de dépôts engagés.
        {bloques.length > 0
          ? ` ${bloques.length} dossier${bloques.length > 1 ? "s" : ""} sans mouvement depuis plus de quinze jours.`
          : " Aucun dossier à l’arrêt."}
      </p>

      <section className="mt-8">
        <h2 className="text-lg font-semibold text-ink">Cessions intermédiées</h2>
        <div className="mt-3 overflow-x-auto rounded-xl border border-line bg-surface">
          <table className="w-full min-w-[64rem] text-sm">
            <thead className="bg-surface-alt text-left text-xs uppercase tracking-wide text-muted">
              <tr>
                <th className="px-3 py-2 font-medium">Dossier</th>
                <th className="px-3 py-2 font-medium">Parties</th>
                <th className="px-3 py-2 font-medium">Lot</th>
                <th className="px-3 py-2 font-medium text-right">Prix</th>
                <th className="px-3 py-2 font-medium">Étape</th>
                <th className="px-3 py-2 font-medium text-right">Avancement</th>
                <th className="px-3 py-2 font-medium">En attente de</th>
                <th className="px-3 py-2 font-medium text-right">Immobile</th>
              </tr>
            </thead>
            <tbody>
              {deals.length === 0 ? (
                <tr>
                  <td colSpan={8} className="px-3 py-6 text-center text-muted">
                    Aucune cession ouverte.
                  </td>
                </tr>
              ) : (
                deals.map((deal) => {
                  const lot = readCarriers(deal.carriers);
                  const jours = joursDepuis(deal.updatedAt);
                  const attente =
                    deal.stage === "CLOSED"
                      ? "—"
                      : nextPipelineAction(deal.stage, "seller").title;
                  return (
                    <tr key={deal.id} className="border-t border-line align-top">
                      <td className="px-3 py-3">
                        <Link
                          href={`/annonces/${deal.listing.publicNumber}`}
                          className="font-medium underline-offset-2 hover:underline"
                        >
                          n° {deal.listing.publicNumber}
                        </Link>
                        <span className="block text-[12px] text-muted">
                          ouvert le {formatDate(deal.createdAt)}
                        </span>
                      </td>
                      <td className="px-3 py-3">
                        <span className="block text-[13px] text-ink">{deal.seller.publicAlias}</span>
                        <span className="block text-[13px] text-muted">{deal.buyer.publicAlias}</span>
                      </td>
                      <td className="px-3 py-3 text-[13px]">
                        {lot.length === 0 ? (
                          <span className="text-muted">Portefeuille entier</span>
                        ) : (
                          <span className="text-ink">{lot.join(", ")}</span>
                        )}
                      </td>
                      <td className="px-3 py-3 text-right tabular">
                        {formatEuroWhole(Number(deal.agreedPrice))}
                      </td>
                      <td className="px-3 py-3 text-[13px]">{DEAL_STAGE_LABELS[deal.stage]}</td>
                      <td className="px-3 py-3 text-right tabular font-medium">
                        {pipelineProgressPercent(deal.stage)} %
                      </td>
                      <td className="px-3 py-3 text-[13px] text-muted">{attente}</td>
                      <td
                        className={`px-3 py-3 text-right tabular ${
                          jours >= 14 && deal.stage !== "CLOSED"
                            ? "font-semibold text-danger"
                            : "text-muted"
                        }`}
                      >
                        {jours} j
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </section>

      <section className="mt-10">
        <h2 className="text-lg font-semibold text-ink">Gré à gré</h2>
        <div className="mt-3 overflow-x-auto rounded-xl border border-line bg-surface">
          <table className="w-full min-w-[56rem] text-sm">
            <thead className="bg-surface-alt text-left text-xs uppercase tracking-wide text-muted">
              <tr>
                <th className="px-3 py-2 font-medium">Portefeuille</th>
                <th className="px-3 py-2 font-medium">Parties</th>
                <th className="px-3 py-2 font-medium">Services</th>
                <th className="px-3 py-2 font-medium text-right">Prix</th>
                <th className="px-3 py-2 font-medium text-right">Honoraires</th>
                <th className="px-3 py-2 font-medium">Étape</th>
                <th className="px-3 py-2 font-medium text-right">Avancement</th>
              </tr>
            </thead>
            <tbody>
              {directs.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-3 py-6 text-center text-muted">
                    Aucun dossier de gré à gré.
                  </td>
                </tr>
              ) : (
                directs.map((d) => {
                  const services = { kit: d.kit, escrow: d.escrow, attestations: d.attestations };
                  const prix = Number(d.salePrice);
                  const lignes = feeLines({
                    services,
                    salePrice: prix,
                    escrowedAmount: prix * (Number(d.upfrontPercent) / 100),
                  });
                  const noms = [
                    d.kit ? "Kit" : null,
                    d.escrow ? "Séquestre" : null,
                    d.attestations && !d.kit ? "Attestations" : null,
                  ].filter(Boolean);
                  return (
                    <tr key={d.id} className="border-t border-line align-top">
                      <td className="px-3 py-3">
                        <span className="font-medium text-ink">{d.portfolioLabel}</span>
                        <span className="block text-[12px] text-muted">
                          ouvert le {formatDate(d.createdAt)}
                        </span>
                      </td>
                      <td className="px-3 py-3 text-[13px]">
                        <span className="block text-ink">{d.openedBy.publicAlias}</span>
                        <span className="block text-muted">{d.counterpartyEmail}</span>
                      </td>
                      <td className="px-3 py-3 text-[13px] text-muted">{noms.join(" · ")}</td>
                      <td className="px-3 py-3 text-right tabular">{formatEuroWhole(prix)}</td>
                      <td className="px-3 py-3 text-right tabular">
                        {formatEuroWhole(feesTotal(lignes))} HT
                      </td>
                      <td className="px-3 py-3 text-[13px]">
                        {directStep(d.stage as DirectStage).label}
                      </td>
                      <td className="px-3 py-3 text-right tabular font-medium">
                        {directProgress(d.stage as DirectStage, services)} %
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </section>

      <section className="mt-10">
        <h2 className="text-lg font-semibold text-ink">Dépôts de garantie</h2>
        <p className="mt-1 text-sm text-muted">
          De l’argent engagé par des acquéreurs. Son sort se décide à la clôture ou au retrait.
        </p>
        <div className="mt-3 overflow-x-auto rounded-xl border border-line bg-surface">
          <table className="w-full min-w-[44rem] text-sm">
            <thead className="bg-surface-alt text-left text-xs uppercase tracking-wide text-muted">
              <tr>
                <th className="px-3 py-2 font-medium">Annonce</th>
                <th className="px-3 py-2 font-medium">Acquéreur</th>
                <th className="px-3 py-2 font-medium text-right">Montant</th>
                <th className="px-3 py-2 font-medium">Sort</th>
                <th className="px-3 py-2 font-medium">Versé le</th>
              </tr>
            </thead>
            <tbody>
              {depots.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-3 py-6 text-center text-muted">
                    Aucun dépôt versé.
                  </td>
                </tr>
              ) : (
                depots.map((d) => (
                  <tr key={d.id} className="border-t border-line">
                    <td className="px-3 py-3">
                      <Link
                        href={`/annonces/${d.listing.publicNumber}`}
                        className="underline-offset-2 hover:underline"
                      >
                        n° {d.listing.publicNumber}
                      </Link>
                    </td>
                    <td className="px-3 py-3 text-[13px]">{d.buyer.publicAlias}</td>
                    <td className="px-3 py-3 text-right tabular">
                      {formatEuroWhole(Number(d.amount))}
                    </td>
                    <td className="px-3 py-3 text-[13px]">
                      {depositOutcomeLabel(d.outcome as DepositOutcome)}
                    </td>
                    <td className="px-3 py-3 whitespace-nowrap text-[13px] text-muted">
                      {formatDate(d.placedAt)}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </section>
    </main>
  );
}
