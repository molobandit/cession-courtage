import Link from "next/link";
import { getActor, isAdmin, isOriasVerified } from "@/lib/authz";
import { logoutAction } from "@/app/actions/auth";
import { BRAND_NAME } from "@/lib/site";

const PUBLIC_LINKS = [
  { href: "/annonces", label: "Annonces" },
  { href: "/ceder", label: "Céder" },
  { href: "/acquerir", label: "Acquérir" },
  { href: "/investisseurs", label: "Investir" },
  { href: "/valoriser", label: "Valoriser" },
  { href: "/tarifs", label: "Tarifs" },
];

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
    <header className="sticky top-0 z-20 border-b border-line bg-surface/95 text-ink backdrop-blur">
      <div className="mx-auto flex min-h-14 max-w-6xl flex-wrap items-center justify-between gap-x-6 gap-y-2 px-4 py-2">
        <Link href="/" className="font-serif text-base font-semibold tracking-tight">
          {BRAND_NAME}
        </Link>

        <nav className="flex flex-wrap items-center gap-x-5 gap-y-1 text-[15px]">
          {PUBLIC_LINKS.map((link) => (
            <Link key={link.href} href={link.href} className="text-muted hover:text-indigo-dark">
              {link.label}
            </Link>
          ))}

          {actor ? (
            <>
              <Link href={memberHref} className="text-muted hover:text-indigo-dark">
                {isAdmin(actor) ? "Administration" : "Espace membre"}
              </Link>
              <span className="hidden text-muted lg:inline">
                {actor.fullName ?? actor.email}
              </span>
              <form action={logoutAction}>
                <button type="submit" className="text-muted hover:text-indigo-dark">
                  Déconnexion
                </button>
              </form>
            </>
          ) : (
            <Link href="/connexion" className="text-muted hover:text-indigo-dark">
              Connexion
            </Link>
          )}
          <Link
            href="/ceder"
            className="rounded-full bg-indigo px-4 py-1.5 font-medium text-white hover:bg-indigo-dark"
          >
            Déposer une annonce
          </Link>
        </nav>
      </div>
    </header>
  );
}
