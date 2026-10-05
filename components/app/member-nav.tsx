"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { ToolIcon, type ToolIconName } from "@/components/app/toolbox";
import { cn } from "@/lib/utils";

type NavLink = {
  href: string;
  label: string;
  /** Libellé du rail étroit, en un mot. */
  short: string;
  icon: ToolIconName;
  exact?: boolean;
  /** Autres chemins qui rendent l'entrée active. */
  also?: string[];
};

function linkActive(path: string, item: NavLink) {
  if (item.exact) return path === item.href;
  const chemins = [item.href, ...(item.also ?? [])];
  return chemins.some((c) => path === c || path.startsWith(`${c}/`));
}

/**
 * Navigation de l'espace membre : un parcours par ligne, dans l'ordre du
 * modèle. Accueil, la salle, ses ventes, ses achats, l'investissement, le
 * compte.
 *
 * Les écrans secondaires restent à un clic depuis leur page : mise en vente
 * depuis les ventes, suivi d'un dossier depuis les achats, notifications par
 * la cloche.
 */
export function memberWorkspaceLinks(
  canSell: boolean,
  canBuy: boolean,
  isInvestor = false,
): NavLink[] {
  if (isInvestor) {
    return [
      { href: "/app/mes-dossiers", label: "Mes dossiers", short: "Dossiers", icon: "folder", exact: true },
      { href: "/app/documents", label: "Mes documents", short: "Documents", icon: "doc" },
      { href: "/investisseurs/opportunites", label: "Opportunités", short: "Marché", icon: "chart" },
      { href: "/app/profil", label: "Mon compte", short: "Compte", icon: "user", also: ["/app/notifications"] },
    ];
  }
  const links: NavLink[] = [
    { href: "/app", label: "Accueil", short: "Accueil", icon: "chart", exact: true },
    { href: "/annonces", label: "Salle de marché", short: "Salle", icon: "bolt" },
  ];
  if (canSell) {
    links.push({
      href: "/app/cessions",
      label: "Mes ventes",
      short: "Ventes",
      icon: "bag",
      also: ["/app/dossiers", "/app/annonces", "/app/import", "/app/portefeuilles"],
    });
  }
  if (canBuy) {
    links.push({
      href: "/app/achats",
      label: "Mes achats",
      short: "Achats",
      icon: "cart",
      also: ["/app/positions", "/app/mandats", "/app/opportunites"],
    });
  }
  links.push(
    { href: "/app/documents", label: "Mes documents", short: "Documents", icon: "doc" },
    { href: "/investisseurs", label: "Investir", short: "Investir", icon: "chart" },
    {
      href: "/app/profil",
      label: "Mon compte",
      short: "Compte",
      icon: "user",
      also: ["/app/engagements", "/app/notifications"],
    },
  );
  return links;
}

export function MemberRail({
  canSell,
  canBuy,
  isInvestor = false,
}: {
  canSell: boolean;
  canBuy: boolean;
  isInvestor?: boolean;
}) {
  const path = usePathname();
  const links = memberWorkspaceLinks(canSell, canBuy, isInvestor);

  return (
    <nav
      className="flex h-full w-[5rem] shrink-0 flex-col items-center bg-[#004fda] py-3"
      aria-label="Espace membre"
    >
      <div className="flex min-h-0 flex-1 flex-col items-center gap-1 overflow-y-auto px-1.5">
        {links.map((item) => {
          const active = linkActive(path, item);
          return (
            <Link
              key={item.href}
              href={item.href}
              title={item.label}
              aria-current={active ? "page" : undefined}
              className={cn(
                "relative flex w-full flex-col items-center gap-1 rounded-xl px-1 py-2.5 text-white transition-colors hover:bg-white/15",
                active && "bg-white/20 text-white",
              )}
            >
              {active ? <span className="absolute left-0 top-2 bottom-2 w-0.5 rounded-full bg-white" /> : null}
              <ToolIcon name={item.icon} className="h-5 w-5" />
              <span className="max-w-full truncate text-center text-[10px] font-medium leading-tight">{item.short}</span>
            </Link>
          );
        })}
      </div>
      <form action="/api/deconnexion" method="post" className="mt-2 w-full px-1.5">
        <button
          type="submit"
          title="Déconnexion"
          className="flex w-full flex-col items-center gap-1 rounded-xl px-1 py-2 text-white hover:bg-white/15"
        >
          <ToolIcon name="arrow-left" className="h-5 w-5" />
          <span className="text-[10px] font-medium leading-tight">Sortir</span>
        </button>
      </form>
    </nav>
  );
}

export function MemberNav({
  canSell,
  canBuy,
  isInvestor = false,
  onNavigate,
}: {
  canSell: boolean;
  canBuy: boolean;
  isInvestor?: boolean;
  onNavigate?: () => void;
}) {
  const path = usePathname();
  const links = memberWorkspaceLinks(canSell, canBuy, isInvestor);
  return (
    <nav aria-label="Espace membre">
      <ul className="space-y-0.5">
        {links.map((item) => (
          <li key={item.href}>
            <Link
              href={item.href}
              onClick={onNavigate}
              className={cn(
                "flex items-center gap-3 rounded-lg px-3 py-2.5 text-[15px]",
                linkActive(path, item)
                  ? "bg-indigo-soft font-medium text-indigo-dark"
                  : "text-ink/80 hover:bg-surface-alt hover:text-ink",
              )}
            >
              <ToolIcon name={item.icon} className="h-5 w-5" />
              {item.label}
            </Link>
          </li>
        ))}
      </ul>
    </nav>
  );
}
