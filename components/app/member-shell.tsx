"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { BrandMark } from "@/components/brand-mark";
import { BRAND_NAME } from "@/lib/site";
import { cn } from "@/lib/utils";

export type MemberShellProps = {
  firstName: string;
  alias: string;
  orias: string;
  canSell: boolean;
  canBuy: boolean;
  subscribed: boolean;
  children: React.ReactNode;
};

type NavItem = { href: string; label: string; exact?: boolean };

function navItems(canSell: boolean, canBuy: boolean): { title?: string; items: NavItem[] }[] {
  return [
    {
      items: [
        { href: "/app", label: "Accueil", exact: true },
        { href: "/annonces", label: "Catalogue" },
      ],
    },
    {
      title: "Votre activité",
      items: [
        ...(canSell
          ? [
              { href: "/app/import", label: "Importer" },
              { href: "/app/annonces/nouvelle", label: "Nouvelle annonce" },
            ]
          : []),
        ...(canBuy
          ? [
              { href: "/app/mandats", label: "Mandats" },
              { href: "/app/opportunites", label: "Correspondances" },
            ]
          : []),
      ],
    },
    {
      items: [
        { href: "/app/outils", label: "Outils" },
        { href: "/app/profil", label: "Mon compte" },
      ],
    },
  ];
}

function isActive(path: string, item: NavItem) {
  if (item.exact) return path === item.href;
  return path === item.href || path.startsWith(`${item.href}/`);
}

function NavList({
  groups,
  path,
  onNavigate,
}: {
  groups: { title?: string; items: NavItem[] }[];
  path: string;
  onNavigate?: () => void;
}) {
  return (
    <nav className="flex-1 overflow-y-auto px-3 pb-4" aria-label="Espace membre">
      {groups.map((group, i) => (
        <div key={group.title ?? i} className={i > 0 ? "mt-6" : ""}>
          {group.title ? (
            <p className="px-3 pb-2 text-[11px] font-semibold uppercase tracking-wide text-muted">
              {group.title}
            </p>
          ) : null}
          <ul className="space-y-0.5">
            {group.items.map((item) => {
              const active = isActive(path, item);
              return (
                <li key={item.href}>
                  <Link
                    href={item.href}
                    onClick={onNavigate}
                    className={cn(
                      "block min-h-11 rounded-xl px-3 py-2.5 text-[15px] font-medium",
                      active
                        ? "bg-indigo !text-white"
                        : "text-ink/80 hover:bg-surface-alt hover:text-ink",
                    )}
                  >
                    {item.label}
                  </Link>
                </li>
              );
            })}
          </ul>
        </div>
      ))}
    </nav>
  );
}

export function MemberShell({
  firstName,
  alias,
  orias,
  canSell,
  canBuy,
  subscribed,
  children,
}: MemberShellProps) {
  const path = usePathname();
  const [open, setOpen] = useState(false);
  const groups = navItems(canSell, canBuy).filter((g) => g.items.length > 0);
  const initial = (firstName.trim().charAt(0) || "C").toLocaleUpperCase("fr-FR");

  useEffect(() => {
    setOpen(false);
  }, [path]);

  useEffect(() => {
    document.body.style.overflow = open ? "hidden" : "";
    return () => {
      document.body.style.overflow = "";
    };
  }, [open]);

  return (
    <div className="flex min-h-dvh bg-page">
      <aside className="sticky top-0 hidden h-dvh w-[17.5rem] shrink-0 flex-col border-r border-line bg-surface lg:flex">
        <div className="flex items-center gap-2.5 px-5 py-5">
          <BrandMark className="h-8 w-8" />
          <div className="min-w-0">
            <p className="truncate text-[14px] font-semibold text-ink">{BRAND_NAME}</p>
            <p className="text-[12px] text-muted">Espace membre</p>
          </div>
        </div>
        <NavList groups={groups} path={path} />
        <div className="border-t border-line px-5 py-4">
          <p className="truncate text-[14px] font-medium text-ink">{firstName}</p>
          <p className="mt-0.5 text-[12px] text-muted">
            ORIAS {orias} · {alias}
          </p>
          <p className="mt-2 text-[12px] font-medium text-indigo-dark">
            {subscribed ? "Abonnement actif" : "Accès gratuit"}
          </p>
        </div>
      </aside>

      {open ? (
        <div className="fixed inset-0 z-40 lg:hidden">
          <button
            type="button"
            className="absolute inset-0 bg-ink/40"
            aria-label="Fermer le menu"
            onClick={() => setOpen(false)}
          />
          <aside className="relative flex h-full w-[min(20rem,88vw)] flex-col bg-surface shadow-xl">
            <div className="flex items-center justify-between gap-3 px-4 py-4">
              <div className="flex min-w-0 items-center gap-2.5">
                <BrandMark className="h-8 w-8" />
                <p className="truncate text-[14px] font-semibold text-ink">{BRAND_NAME}</p>
              </div>
              <button
                type="button"
                className="inline-flex h-11 w-11 items-center justify-center rounded-full border border-line"
                onClick={() => setOpen(false)}
              >
                <span className="sr-only">Fermer le menu</span>
                <span aria-hidden="true" className="text-lg leading-none">
                  ×
                </span>
              </button>
            </div>
            <NavList groups={groups} path={path} onNavigate={() => setOpen(false)} />
            <div className="border-t border-line px-5 py-4">
              <p className="truncate text-[14px] font-medium text-ink">{firstName}</p>
              <p className="mt-0.5 text-[12px] text-muted">
                ORIAS {orias} · {alias}
              </p>
              <form action="/api/deconnexion" method="post" className="mt-3">
                <button
                  type="submit"
                  className="min-h-11 w-full rounded-xl px-3 py-2.5 text-left text-[15px] hover:bg-surface-alt"
                >
                  Déconnexion
                </button>
              </form>
            </div>
          </aside>
        </div>
      ) : null}

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="sticky top-0 z-20 flex items-center gap-2 border-b border-line bg-surface/95 px-3 py-2.5 backdrop-blur sm:px-5">
          <button
            type="button"
            className="inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-full border border-line lg:hidden"
            aria-expanded={open}
            onClick={() => setOpen(true)}
          >
            <span className="sr-only">Ouvrir le menu</span>
            <span className="flex flex-col gap-1.5" aria-hidden="true">
              <span className="block h-0.5 w-4 bg-ink" />
              <span className="block h-0.5 w-4 bg-ink" />
              <span className="block h-0.5 w-4 bg-ink" />
            </span>
          </button>

          <p className="min-w-0 truncate rounded-full bg-surface-alt px-3 py-2 text-[13px] font-medium text-ink sm:px-4 sm:text-[14px]">
            Bonjour {firstName}
          </p>

          <div className="ml-auto flex items-center gap-2 sm:gap-3">
            <Link
              href="/"
              className="hidden min-h-11 items-center px-2 text-[13px] text-muted hover:text-ink md:inline-flex"
            >
              Site public
            </Link>
            <form action="/api/deconnexion" method="post" className="hidden lg:block">
              <button
                type="submit"
                className="min-h-11 px-2 text-[13px] text-muted hover:text-ink"
              >
                Déconnexion
              </button>
            </form>
            <Link
              href="/app/profil"
              className="inline-flex h-11 w-11 items-center justify-center rounded-full bg-indigo text-[14px] font-semibold !text-white"
              aria-label="Mon compte"
            >
              {initial}
            </Link>
          </div>
        </header>

        <div className="flex-1">{children}</div>
      </div>
    </div>
  );
}
