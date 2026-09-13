import Link from "next/link";
import { redirect } from "next/navigation";
import { DossierCard, EmptyState, ToolIcon } from "@/components/app/toolbox";
import { getActor, isOriasVerified } from "@/lib/authz";
import { loadMemberDossiers } from "@/lib/dashboard/member-dossiers";

export const metadata = { title: "Mes achats" };

export default async function Page() {
  const actor = await getActor();
  if (!actor) redirect("/connexion?next=/app/achats");
  if (!isOriasVerified(actor)) redirect("/en-attente-orias");

  const { achats: items } = await loadMemberDossiers(actor);

  return (
    <main className="w-full">
      <header className="border-b border-line bg-paper">
        <div className="mx-auto flex w-full max-w-6xl flex-wrap items-center justify-between gap-4 px-4 py-5 sm:px-6">
          <div className="flex items-center gap-4">
            <Link href="/app" aria-label="Retour au tableau de bord" className="text-muted hover:text-ink">
              <ToolIcon name="arrow-left" className="h-5 w-5" />
            </Link>
            <div>
              <h1 className="text-2xl font-bold tracking-tight text-ink sm:text-[28px]">Mes achats</h1>
              <p className="mt-0.5 text-[15px] text-muted">Voir et suivre toutes vos positions d’acheteur</p>
            </div>
          </div>
        </div>
      </header>
      <div className="mx-auto w-full max-w-6xl px-4 py-6 sm:px-6 sm:py-8">
        {items.length === 0 ? (
          <div className="rounded-2xl border border-line bg-paper shadow-sm">
            <EmptyState
              icon="search"
              title="Pas encore d’achats"
              text="Vos offres, vos annonces d’achat et vos acquisitions en cours apparaîtront ici."
              action={{ href: "/annonces", label: "Trouver un portefeuille" }}
            />
          </div>
        ) : (
          <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {items.map(({ key, active: _active, ...item }) => (
              <DossierCard key={key} {...item} />
            ))}
          </ul>
        )}
      </div>
    </main>
  );
}
