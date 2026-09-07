import Link from "next/link";
import { redirect } from "next/navigation";
import { MandateForm } from "@/components/mandate/mandate-form";
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
    <main className="mx-auto max-w-6xl px-4 py-6">
      <h1 className="font-serif text-2xl text-navy">Mandats de recherche</h1>
      <p className="mt-1 text-sm text-muted">
        <Link href="/app/opportunites" className="underline-offset-2 hover:underline">
          Voir les correspondances
        </Link>
      </p>
      <div className="mt-4 overflow-x-auto border border-line bg-paper">
        <table className="w-full text-sm">
          <thead className="bg-cream text-left text-xs uppercase text-muted">
            <tr>
              <th className="px-2 py-1.5">Budget</th>
              <th className="px-2 py-1.5">Zones</th>
              <th className="px-2 py-1.5 text-right">Matchs</th>
            </tr>
          </thead>
          <tbody>
            {mandates.map((m) => (
              <tr key={m.id} className="border-t border-line">
                <td className="px-2 py-1.5">{formatEuro(m.maxBudget)}</td>
                <td className="px-2 py-1.5">{asStringArray(m.zones).join(", ")}</td>
                <td className="px-2 py-1.5 text-right">{m._count.matches}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <section className="mt-8">
        <h2 className="font-serif text-lg text-navy">Nouveau mandat</h2>
        <div className="mt-3">
          <MandateForm />
        </div>
      </section>
    </main>
  );
}
