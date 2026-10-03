import Link from "next/link";
import { redirect } from "next/navigation";
import { DeskPanel, PositionsTable } from "@/components/app/desk";
import { getActor, isOriasVerified } from "@/lib/authz";
import { loadDesk } from "@/lib/dashboard/desk";

export const metadata = { title: "Mes achats" };

export default async function Page() {
  const actor = await getActor();
  if (!actor) redirect("/connexion?next=/app/achats");
  if (!isOriasVerified(actor)) redirect("/en-attente-orias");

  const { lignes } = await loadDesk(actor);
  const rows = lignes.filter((row) => row.side === "Achat" || row.side === "Demande");
  const actives = rows.filter((row) => (row.issue ?? "active") === "active").length;

  return (
    <main className="mx-auto w-full max-w-6xl px-4 py-6 sm:px-6 sm:py-8">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-ink sm:text-[28px]">Mes achats</h1>
          <p className="mt-1 max-w-2xl text-[15px] text-muted">
            Vos positions, du dépôt de positionnement à la signature.
          </p>
        </div>
        <Link
          href="/annonces"
          className="inline-flex h-11 items-center rounded-full bg-indigo px-5 text-[15px] font-semibold !text-white hover:bg-indigo-dark"
        >
          Voir les portefeuilles
        </Link>
      </div>
      <DeskPanel
        className="mt-6"
        title={`${rows.length} dossier${rows.length > 1 ? "s" : ""}`}
        subtitle={`${actives} en cours`}
      >
        <PositionsTable
          rows={rows}
          empty={
            <>
              Vous ne suivez aucun dossier.{" "}
              <Link href="/annonces" className="font-semibold text-indigo-dark">
                Parcourez la salle de marché
              </Link>{" "}
              : chaque portefeuille a été étudié et chiffré avant sa mise en ligne.
            </>
          }
        />
      </DeskPanel>
    </main>
  );
}
