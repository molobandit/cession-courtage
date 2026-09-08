import Link from "next/link";
import { getActor, isAdmin, isOriasVerified } from "@/lib/authz";
import { logoutAction } from "@/app/actions/auth";

const PUBLIC_LINKS = [
  { href: "/ceder", label: "Céder" },
  { href: "/acquerir", label: "Acquérir" },
  { href: "/valoriser", label: "Valoriser" },
  { href: "/annonces", label: "Annonces" },
  { href: "/tarifs", label: "Tarifs" },
  { href: "/faq", label: "FAQ" },
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
    <header className="border-b border-charcoal-muted bg-charcoal text-cream">
      <div className="mx-auto flex min-h-14 max-w-6xl flex-wrap items-center justify-between gap-x-6 gap-y-2 px-4 py-2">
        <Link href="/" className="font-serif text-base font-semibold tracking-tight">
          Cession <span className="text-indigo-soft">courtage</span>
        </Link>

        <nav className="flex flex-wrap items-center gap-x-5 gap-y-1 text-[15px]">
          {PUBLIC_LINKS.map((link) => (
            <Link key={link.href} href={link.href} className="text-cream/80 hover:text-indigo-soft">
              {link.label}
            </Link>
          ))}

          {actor ? (
            <>
              <Link href={memberHref} className="text-cream/80 hover:text-indigo-soft">
                {isAdmin(actor) ? "Administration" : "Espace membre"}
              </Link>
              <span className="hidden text-cream/65 lg:inline">
                {actor.fullName ?? actor.email}
              </span>
              <form action={logoutAction}>
                <button type="submit" className="text-cream/80 hover:text-indigo-soft">
                  Déconnexion
                </button>
              </form>
            </>
          ) : (
            <>
              <Link href="/connexion" className="text-cream/80 hover:text-indigo-soft">
                Connexion
              </Link>
              <Link
                href="/inscription"
                className="rounded-full bg-indigo px-4 py-1.5 font-medium text-white hover:bg-gold/85"
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
