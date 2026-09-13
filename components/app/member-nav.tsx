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
 * Navigation de l'espace membre, dans l'ordre d'une journée de marché :
 * le poste, la salle, ses positions d'achat et de vente, puis les outils.
 *
 * Dix entrées aux noms flous (« Pistes », « Import », « Mandats ») disaient la
 * structure du code plutôt que ce que l'on vient faire. Chaque libellé dit
 * maintenant une intention.
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
    { href: "/app", label: "Poste de marché", short: "Poste", icon: "chart", exact: true },
    { href: "/annonces", label: "Salle de marché", short: "Salle", icon: "bolt", also: [] },
  ];
  if (canBuy) {
    links.push({ href: "/app/achats", label: "Mes achats", short: "Achats", icon: "cart", also: ["/app/positions"] });
  }
  if (canSell) {
    links.push(
      { href: "/app/cessions", label: "Mes cessions", short: "Cessions", icon: "bag", also: ["/app/dossiers"] },
      { href: "/app/annonces/nouvelle", label: "Vendre un portefeuille", short: "Vendre", icon: "plus", also: ["/app/import"] },
    );
  }
  links.push({ href: "/annonces/demandes", label: "Demandes d’acquisition", short: "Demandes", icon: "doc" });
  if (canBuy) {
    links.push(
      { href: "/app/mandats", label: "Ma recherche", short: "Recherche", icon: "search" },
      { href: "/app/opportunites", label: "Correspondances", short: "Matchs", icon: "file-check" },
    );
  }
  // Les services à la carte s'adressent aux deux rôles : les parties se sont trouvées seules.
  links.push(
    {
      href: "/app/services/kits-contractuels",
      label: "Services à la carte",
      short: "Services",
      icon: "clipboard",
      also: ["/app/services", "/app/formaliser"],
    },
    { href: "/app/notifications", label: "Notifications", short: "Alertes", icon: "info" },
    { href: "/app/outils", label: "Outils", short: "Outils", icon: "tools" },
    { href: "/app/profil", label: "Mon compte", short: "Compte", icon: "user" },
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
      className="flex h-full w-[5rem] shrink-0 flex-col items-center border-r border-indigo/25 bg-[#93c5fd] py-3"
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
                "relative flex w-full flex-col items-center gap-1 rounded-xl px-1 py-2 text-ink transition-colors hover:bg-white/80",
                active && "bg-white text-indigo-dark shadow-sm",
              )}
            >
              {active ? <span className="absolute left-0 top-2 bottom-2 w-0.5 rounded-full bg-indigo" /> : null}
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
          className="flex w-full flex-col items-center gap-1 rounded-xl px-1 py-2 text-ink hover:bg-white/80"
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
