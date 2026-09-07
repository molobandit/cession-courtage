import Link from "next/link";
import { redirect } from "next/navigation";
import { canBuy, canSell, isAdmin, isOriasVerified, requireActor } from "@/lib/authz";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const actor = await requireActor().catch(() => null);
  if (!actor) redirect("/connexion?next=/app");
  if (!isOriasVerified(actor)) redirect("/en-attente-orias");
  if (isAdmin(actor)) redirect("/admin/orias");

  return (
    <>
      <nav className="border-b border-line bg-paper">
        <div className="mx-auto flex max-w-6xl flex-wrap gap-4 px-4 py-2 text-sm">
          <Link href="/app" className="text-navy underline-offset-2 hover:underline">
            Tableau
          </Link>
          <Link href="/annonces" className="text-navy underline-offset-2 hover:underline">
            Place de marché
          </Link>
          {canSell(actor) ? (
            <>
              <Link href="/app/import" className="text-navy underline-offset-2 hover:underline">
                Import
              </Link>
              <Link href="/app/annonces/nouvelle" className="text-navy underline-offset-2 hover:underline">
                Annonce
              </Link>
            </>
          ) : null}
          {canBuy(actor) ? (
            <>
              <Link href="/app/mandats" className="text-navy underline-offset-2 hover:underline">
                Mandats
              </Link>
              <Link href="/app/opportunites" className="text-navy underline-offset-2 hover:underline">
                Correspondances
              </Link>
            </>
          ) : null}
        </div>
      </nav>
      {children}
    </>
  );
}
