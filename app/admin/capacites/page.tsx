import { redirect } from "next/navigation";
import { CapacityActions } from "@/components/admin/capacity-actions";
import { getActor, isAdmin, listFinancialCapacities } from "@/lib/authz";
import { formatDate } from "@/lib/format/fr";
import { formatEuroWhole } from "@/lib/format/number";
import { libelleCapacite } from "@/lib/buyer/financial-capacity";

export const metadata = { title: "Capacités financières" };

/**
 * Contrôle des capacités financières déclarées.
 *
 * Le site affirme publiquement que la capacité financière des acquéreurs est
 * vérifiée : cette page est l'endroit où cette affirmation devient vraie. Sans
 * elle, la mention resterait une promesse que rien ne fonde.
 */
export default async function AdminCapacitesPage() {
  const actor = await getActor();
  if (!actor) redirect("/connexion?next=/admin/capacites");
  if (!isAdmin(actor)) redirect("/app");

  const comptes = await listFinancialCapacities(actor);
  const enAttente = comptes.filter((c) => c.financialCapacityStatus === "DECLARED").length;

  return (
    <main className="mx-auto max-w-6xl px-4 py-6">
      <h1 className="font-serif text-2xl text-ink">Capacités financières</h1>
      <p className="mt-1 max-w-2xl text-sm text-muted">
        {enAttente === 0
          ? `${comptes.length} déclaration${comptes.length > 1 ? "s" : ""} · aucune en attente.`
          : `${enAttente} en attente de contrôle sur ${comptes.length}.`}{" "}
        Une vérification vaut douze mois, puis doit être refaite.
      </p>

      <div className="mt-4 overflow-x-auto rounded-xl border border-line bg-surface">
        <table className="w-full min-w-[60rem] text-sm">
          <thead className="bg-surface-alt text-left text-xs uppercase tracking-wide text-muted">
            <tr>
              <th className="px-3 py-2 font-medium">Acquéreur</th>
              <th className="px-3 py-2 font-medium">Cabinet</th>
              <th className="px-3 py-2 font-medium text-right">Montant déclaré</th>
              <th className="px-3 py-2 font-medium">État</th>
              <th className="px-3 py-2 font-medium">Contrôle</th>
              <th className="px-3 py-2 font-medium">Décision</th>
            </tr>
          </thead>
          <tbody>
            {comptes.length === 0 ? (
              <tr>
                <td colSpan={6} className="px-3 py-6 text-center text-muted">
                  Aucune capacité déclarée pour le moment.
                </td>
              </tr>
            ) : (
              comptes.map((c) => {
                const capacite = {
                  montantEur: c.financialCapacityEur ? Number(c.financialCapacityEur) : null,
                  statut: c.financialCapacityStatus,
                  verifieeLe: c.financialCapacityAt,
                };
                return (
                  <tr key={c.id} className="border-t border-line align-top">
                    <td className="px-3 py-3">
                      <span className="font-medium text-ink">{c.fullName ?? c.publicAlias}</span>
                      <span className="block text-[13px] text-muted">{c.email}</span>
                    </td>
                    <td className="px-3 py-3">
                      {c.firm ? (
                        <>
                          <span className="text-ink">{c.firm.legalName}</span>
                          <span className="block text-[13px] tabular text-muted">{c.firm.siren}</span>
                        </>
                      ) : (
                        <span className="text-muted">Aucun</span>
                      )}
                    </td>
                    <td className="px-3 py-3 text-right tabular">
                      {capacite.montantEur !== null ? formatEuroWhole(capacite.montantEur) : "—"}
                    </td>
                    <td className="px-3 py-3">{libelleCapacite(capacite)}</td>
                    <td className="px-3 py-3">
                      {c.financialCapacityAt ? (
                        <>
                          <span className="text-ink">{formatDate(c.financialCapacityAt)}</span>
                          {c.financialCapacityNote ? (
                            <span className="block text-[13px] text-muted">{c.financialCapacityNote}</span>
                          ) : null}
                        </>
                      ) : (
                        <span className="text-muted">En attente</span>
                      )}
                    </td>
                    <td className="px-3 py-3">
                      <CapacityActions userId={c.id} />
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
