import Link from "next/link";
import { redirect } from "next/navigation";
import { OpenDirectDealForm } from "@/components/direct/open-direct-deal-form";
import { getActor, isOriasVerified } from "@/lib/authz";
import { listMyDirectDeals } from "@/lib/direct/load";
import { progressPercent, stepByKey, type DirectStage } from "@/lib/direct/stages";
import { formatEuroWhole } from "@/lib/format/number";
import { formatDate } from "@/lib/format/fr";

export const metadata = { title: "Formaliser une cession de gré à gré" };

/**
 * Parcours de gré à gré.
 *
 * Deux cessions sur trois se nouent hors plateforme. Leur vendre
 * l'intermédiation entière n'aurait aucun sens : elles ont fait le travail. Ce
 * qui leur manque tient en trois services.
 */
export default async function FormaliserPage() {
  const actor = await getActor();
  if (!actor) redirect("/connexion?next=/app/formaliser");
  if (!isOriasVerified(actor)) redirect("/en-attente-orias");

  const dossiers = await listMyDirectDeals(actor.id, actor.email);

  return (
    <main className="mx-auto max-w-4xl px-4 py-10">
      <p className="text-[13px] font-semibold uppercase tracking-[0.18em] text-indigo">
        Gré à gré
      </p>
      <h1 className="mt-3 text-3xl font-bold tracking-tight text-ink sm:text-4xl">
        Formaliser une cession déjà négociée
      </h1>
      <p className="mt-4 max-w-2xl text-[16px] leading-relaxed text-muted">
        Vous vous êtes trouvés seuls et vous êtes d’accord sur le prix. Nous ne
        reprenons pas la négociation : nous fournissons l’acte, les attestations, la
        vérification des parties et le séquestre — séparément ou ensemble.
      </p>

      {dossiers.length > 0 ? (
        <section className="mt-10">
          <h2 className="text-xl font-semibold text-ink">Vos dossiers</h2>
          <ul className="mt-4 grid gap-3">
            {dossiers.map((d) => {
              const services = { kit: d.kit, escrow: d.escrow, attestations: d.attestations };
              const avancement = progressPercent(d.stage as DirectStage, services);
              return (
                <li key={d.id}>
                  <Link
                    href={`/app/formaliser/${d.id}`}
                    className="flex flex-wrap items-center justify-between gap-x-4 gap-y-2 rounded-2xl border border-line bg-paper px-5 py-4 hover:border-indigo-line"
                  >
                    <span className="min-w-0">
                      <span className="block truncate font-medium text-ink">
                        {d.portfolioLabel}
                      </span>
                      <span className="mt-0.5 block text-[13px] text-muted">
                        {stepByKey(d.stage as DirectStage).label} · ouvert le{" "}
                        {formatDate(d.createdAt)}
                      </span>
                    </span>
                    <span className="flex shrink-0 items-center gap-4">
                      <span className="tabular text-[15px] font-semibold text-ink">
                        {formatEuroWhole(Number(d.salePrice))}
                      </span>
                      <span className="tabular w-12 text-right text-[13px] font-semibold text-indigo">
                        {avancement} %
                      </span>
                    </span>
                  </Link>
                </li>
              );
            })}
          </ul>
        </section>
      ) : null}

      <section className="mt-10 rounded-[1.75rem] border border-line bg-paper p-6 sm:p-8">
        <h2 className="text-xl font-semibold text-ink">Ouvrir un dossier</h2>
        <p className="mt-2 text-[15px] leading-relaxed text-muted">
          La contrepartie reçoit une invitation à confirmer les conditions. Elle n’a
          pas besoin d’un compte pour être désignée.
        </p>
        <div className="mt-6">
          <OpenDirectDealForm />
        </div>
      </section>
    </main>
  );
}
