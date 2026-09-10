import Link from "next/link";
import { redirect } from "next/navigation";
import { MemberPageHeader } from "@/components/app/member-page-header";
import { MandateForm } from "@/components/mandate/mandate-form";
import { MandatePublishButton } from "@/components/mandate/mandate-publish-button";
import { canBuy, getActor, isOriasVerified, listMyMandates } from "@/lib/authz";
import { formatEuro } from "@/lib/format/fr";
import { asStringArray } from "@/lib/json-array";

export const metadata = { title: "Mandat de recherche" };

export default async function MandatesPage() {
  const actor = await getActor();
  if (!actor) redirect("/connexion");
  if (!isOriasVerified(actor)) redirect("/en-attente-orias");
  if (!canBuy(actor)) redirect("/app");
  const mandates = await listMyMandates(actor);

  return (
    <main className="mx-auto w-full max-w-5xl px-4 py-6 sm:px-6 sm:py-8">
      <MemberPageHeader title="Mandats de recherche">
        Décrivez une fois budget, zones et branches. Publier un mandat le montre
        au catalogue sous votre alias, votre cabinet reste anonyme.{" "}
        <Link href="/app/opportunites" className="font-medium text-indigo-dark">
          Voir les correspondances
        </Link>
      </MemberPageHeader>

      <div className="overflow-x-auto rounded-2xl border border-line bg-paper">
        <table className="w-full text-[14px]">
          <thead className="bg-surface-alt text-left text-[12px] text-muted">
            <tr>
              <th className="px-4 py-3 font-medium">Budget</th>
              <th className="px-4 py-3 font-medium">Zones</th>
              <th className="px-4 py-3 text-right font-medium">Matchs</th>
              <th className="px-4 py-3 font-medium">Catalogue</th>
              <th className="px-4 py-3 text-right font-medium">Action</th>
            </tr>
          </thead>
          <tbody>
            {mandates.length === 0 ? (
              <tr>
                <td className="px-4 py-4 text-muted" colSpan={5}>
                  Aucun mandat pour le moment.
                </td>
              </tr>
            ) : (
              mandates.map((m) => (
                <tr key={m.id} className="border-t border-line align-middle">
                  <td className="px-4 py-3">{formatEuro(m.maxBudget)}</td>
                  <td className="px-4 py-3">{asStringArray(m.zones).join(", ")}</td>
                  <td className="px-4 py-3 text-right tabular-nums">{m._count.matches}</td>
                  <td className="px-4 py-3">
                    {m.isPublic ? (
                      <span className="text-ok">
                        Publié
                        {m.publicNumber ? ` · Demande #${m.publicNumber}` : ""}
                      </span>
                    ) : (
                      <span className="text-muted">Non publié</span>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    <MandatePublishButton mandateId={m.id} isPublic={m.isPublic} />
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      <section className="mt-8 rounded-3xl border border-line bg-paper p-5 shadow-sm sm:p-6">
        <h2 className="text-lg font-semibold text-ink">Nouveau mandat</h2>
        <div className="mt-3">
          <MandateForm />
        </div>
      </section>
    </main>
  );
}
