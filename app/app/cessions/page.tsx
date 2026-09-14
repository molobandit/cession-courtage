import Link from "next/link";
import { redirect } from "next/navigation";
import { DeskPanel, PositionsTable } from "@/components/app/desk";
import { QuickLinks } from "@/components/app/quick-links";
import { getActor, isOriasVerified } from "@/lib/authz";
import { loadDesk } from "@/lib/dashboard/desk";

export const metadata = { title: "Mes ventes" };

export default async function Page() {
  const actor = await getActor();
  if (!actor) redirect("/connexion?next=/app/cessions");
  if (!isOriasVerified(actor)) redirect("/en-attente-orias");

  const { lignes } = await loadDesk(actor);
  const rows = lignes.filter((row) => row.side === "Vente");
  const actives = rows.filter((row) => (row.issue ?? "active") === "active").length;

  return (
    <main className="mx-auto w-full max-w-6xl px-4 py-6 sm:px-6 sm:py-8">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-ink sm:text-[28px]">Mes ventes</h1>
          <p className="mt-1 max-w-2xl text-[15px] text-muted">Vos annonces, les acquéreurs intéressés et vos dossiers de vente.</p>
        </div>
        <Link
          href="/app/annonces/nouvelle"
          className="inline-flex h-11 items-center rounded-full bg-indigo px-5 text-[15px] font-semibold !text-white hover:bg-indigo-dark"
        >
          Vendre un portefeuille
        </Link>
      </div>
      <QuickLinks
        links={[
          { href: "/annonces/demandes", label: "Acheteurs qui recherchent" },
          { href: "/app/import", label: "Importer un bordereau" },
          { href: "/app/profil#profil-cabinet", label: "Profil du cabinet" },
        ]}
      />
      <DeskPanel
        className="mt-6"
        title={`${rows.length} dossier${rows.length > 1 ? "s" : ""}`}
        subtitle={`${actives} en cours`}
      >
        <PositionsTable rows={rows} empty="Aucun portefeuille en vente. Mettez le vôtre en vente : c’est gratuit." />
      </DeskPanel>
    </main>
  );
}
