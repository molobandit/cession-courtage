"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import {
  IconBoard,
  IconClipboard,
  IconFolder,
  IconLinks,
  IconLogout,
  IconPerson,
  IconPlusDoc,
  IconRows,
  IconSliders,
  IconUpload,
} from "@/components/app/member-icons";

type NavLink = { href: string; label: string; exact?: boolean };

function linkActive(path: string, item: NavLink) {
  if (item.exact) return path === item.href;
  return path === item.href || path.startsWith(`${item.href}/`);
}

export function memberWorkspaceLinks(
  canSell: boolean,
  canBuy: boolean,
  isInvestor = false,
): NavLink[] {
  if (isInvestor) {
    return [
      { href: "/app/mes-dossiers", label: "Mes dossiers", exact: true },
      { href: "/investisseurs/opportunites", label: "Opportunités" },
      { href: "/app/profil", label: "Compte" },
    ];
  }
  const links: NavLink[] = [
    { href: "/app", label: "Accueil", exact: true },
    { href: "/annonces", label: "Salle de marché" },
  ];
  if (canSell) {
    links.push(
      { href: "/app/annonces/nouvelle", label: "Publier" },
      { href: "/app/import", label: "Import" },
    );
  }
  if (canBuy) {
    links.push(
      { href: "/app/mandats", label: "Mandats" },
      { href: "/app/opportunites", label: "Pistes" },
      { href: "/annonces/demandes", label: "Demandes" },
    );
  }
  links.push({ href: "/app/outils", label: "Outils" }, { href: "/app/profil", label: "Compte" });
  return links;
}

const ICONS: Record<string, typeof IconBoard> = {
  "/app": IconBoard,
  "/annonces": IconFolder,
  "/app/annonces/nouvelle": IconPlusDoc,
  "/app/import": IconUpload,
  "/app/mandats": IconClipboard,
  "/app/opportunites": IconLinks,
  "/annonces/demandes": IconRows,
  "/app/outils": IconSliders,
  "/app/profil": IconPerson,
  "/app/mes-dossiers": IconBoard,
  "/investisseurs/opportunites": IconLinks,
};

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
      className="flex h-full w-[4.75rem] shrink-0 flex-col items-center border-r border-indigo/25 bg-[#93c5fd] py-3"
      aria-label="Espace membre"
    >
      <div className="flex min-h-0 flex-1 flex-col items-center gap-1 overflow-y-auto px-1">
        {links.map((item) => {
          const Icon = ICONS[item.href] ?? IconFolder;
          const active = linkActive(path, item);
          return (
            <Link
              key={item.href}
              href={item.href}
              title={item.label}
              aria-current={active ? "page" : undefined}
              className={cn(
                "flex w-full flex-col items-center gap-0.5 rounded-xl px-1 py-2 text-ink transition-colors hover:bg-white/80",
                active && "bg-white text-ink shadow-sm",
              )}
            >
              <Icon className="h-5 w-5" />
              <span className="max-w-full truncate text-center text-[10px] font-medium leading-tight">
                {item.label}
              </span>
            </Link>
          );
        })}
      </div>
      <form action="/api/deconnexion" method="post" className="mt-2 px-1">
        <button
          type="submit"
          title="Déconnexion"
          className="flex w-full flex-col items-center gap-0.5 rounded-xl px-1 py-2 text-ink hover:bg-white/80"
        >
          <IconLogout className="h-5 w-5" />
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
                "block rounded-lg px-3 py-2.5 text-[15px]",
                linkActive(path, item)
                  ? "bg-indigo-soft font-medium text-indigo-dark"
                  : "text-ink/80 hover:bg-surface-alt hover:text-ink",
              )}
            >
              {item.label === "Accueil" ? "Tableau de bord" : item.label}
            </Link>
          </li>
        ))}
      </ul>
    </nav>
  );
}
