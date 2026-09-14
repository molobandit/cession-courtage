"use client";

import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";
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

function linkActive(path: string, item: NavLink, query = "") {
  if (item.href.includes("?")) return `${path}?${query}` === item.href;
  if (item.exact) return path === item.href && !(item.href === "/annonces" && query.includes("tri=meilleures"));
  const chemins = [item.href, ...(item.also ?? [])];
  return chemins.some((c) => path === c || path.startsWith(`${c}/`));
}

/**
 * Navigation de l'espace membre, dite comme sur le bon coin : acheter, trouver
 * la bonne affaire, suivre ses achats et ses ventes, investir.
 *
 * Douze entrées (« Poste », « Salle », « Matchs », « Services »…) obligeaient à
 * connaître la maison. Il en reste huit, chacune dit ce qu'on vient faire ;
 * les écrans secondaires (recherche, correspondances, demandes, outils,
 * services) s'ouvrent depuis la page de leur famille.
 */
export function memberWorkspaceLinks(
  canSell: boolean,
  canBuy: boolean,
  isInvestor = false,
): NavLink[] {
  if (isInvestor) {
    return [
      { href: "/app/mes-dossiers", label: "Mes dossiers", short: "Dossiers", icon: "folder", exact: true },
      { href: "/investisseurs/opportunites", label: "Opportunités", short: "Marché", icon: "chart" },
      { href: "/app/notifications", label: "Notifications", short: "Alertes", icon: "info" },
      { href: "/app/profil", label: "Mon compte", short: "Compte", icon: "user" },
    ];
  }
  const links: NavLink[] = [
    { href: "/app", label: "Accueil", short: "Accueil", icon: "chart", exact: true },
    { href: "/annonces", label: "Acheter", short: "Acheter", icon: "search", exact: true },
    { href: "/annonces?tri=meilleures", label: "Meilleures affaires", short: "Affaires", icon: "bolt", exact: true },
  ];
  if (canBuy) {
    links.push({
      href: "/app/achats",
      label: "Mes achats",
      short: "Achats",
      icon: "cart",
      also: ["/app/positions", "/app/mandats", "/app/opportunites"],
    });
  }
  if (canSell) {
    links.push({
      href: "/app/cessions",
      label: "Mes ventes",
      short: "Ventes",
      icon: "bag",
      also: ["/app/annonces", "/app/dossiers", "/app/import", "/app/portefeuilles"],
    });
  }
  links.push(
    { href: "/investisseurs/opportunites", label: "Investir", short: "Investir", icon: "briefcase" },
    { href: "/app/notifications", label: "Notifications", short: "Alertes", icon: "info" },
    {
      href: "/app/profil",
      label: "Mon compte",
      short: "Compte",
      icon: "user",
      also: ["/app/engagements", "/app/outils", "/app/services", "/app/formaliser"],
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
  const query = useSearchParams().toString();
  const links = memberWorkspaceLinks(canSell, canBuy, isInvestor);

  return (
    <nav
      className="flex h-full w-60 shrink-0 flex-col border-r border-indigo/25 bg-[#93c5fd] px-3 py-4"
      aria-label="Espace membre"
    >
      <div className="flex min-h-0 flex-1 flex-col gap-1 overflow-y-auto">
        {links.map((item) => {
          const active = linkActive(path, item, query);
          return (
            <Link
              key={item.href}
              href={item.href}
              aria-current={active ? "page" : undefined}
              className={cn(
                "flex items-center gap-3 rounded-xl px-3 py-2.5 text-[15px] font-medium text-ink transition-colors hover:bg-white/80",
                active && "bg-white text-indigo-dark shadow-sm",
              )}
            >
              <ToolIcon name={item.icon} className="h-5 w-5 shrink-0" />
              {item.label}
            </Link>
          );
        })}
      </div>
      <form action="/api/deconnexion" method="post" className="mt-2">
        <button
          type="submit"
          className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-[15px] font-medium text-ink hover:bg-white/80"
        >
          <ToolIcon name="arrow-left" className="h-5 w-5 shrink-0" />
          Déconnexion
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
  const query = useSearchParams().toString();
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
                linkActive(path, item, query)
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
