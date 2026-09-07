import Link from "next/link";
import { getActor, isAdmin, isOriasVerified } from "@/lib/authz";
import { logoutAction } from "@/app/actions/auth";

export async function SiteHeader() {
  const actor = await getActor();
  const memberHref = actor
    ? isOriasVerified(actor)
      ? isAdmin(actor)
        ? "/admin/orias"
        : "/app"
      : "/en-attente-orias"
    : "/connexion";

  return (
    <header className="border-b border-line bg-navy text-cream">
      <div className="mx-auto flex h-12 max-w-6xl items-center justify-between gap-4 px-4">
        <Link href="/" className="font-serif text-[15px] font-semibold tracking-tight">
          Cession courtage
        </Link>
        <nav className="flex items-center gap-4 text-sm">
          <Link href="/annonces" className="text-cream/85 hover:text-cream">
            Annonces
          </Link>
          {actor ? (
            <>
              <Link href={memberHref} className="text-cream/85 hover:text-cream">
                {isAdmin(actor) ? "Administration" : "Espace membre"}
              </Link>
              <span className="hidden text-cream/55 sm:inline">
                {actor.fullName ?? actor.email}
              </span>
              <form action={logoutAction}>
                <button type="submit" className="text-cream/85 hover:text-cream">
                  Déconnexion
                </button>
              </form>
            </>
          ) : (
            <>
              <Link href="/connexion" className="text-cream/85 hover:text-cream">
                Connexion
              </Link>
              <Link
                href="/inscription"
                className="rounded-sm bg-copper px-2.5 py-1 text-sm font-medium text-white hover:bg-copper/90"
              >
                Créer un compte
              </Link>
            </>
          )}
        </nav>
      </div>
    </header>
  );
}
