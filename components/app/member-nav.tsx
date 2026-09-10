"use client";

import { useEffect, useId, useRef, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";

type NavLink = { href: string; label: string; exact?: boolean };

function linkActive(path: string, item: NavLink) {
  if (item.exact) return path === item.href;
  return path === item.href || path.startsWith(`${item.href}/`);
}

function buildNav(canSell: boolean, canBuy: boolean): {
  primary: NavLink[];
  sell: NavLink[];
  buy: NavLink[];
} {
  return {
    primary: [
      { href: "/app", label: "Accueil", exact: true },
      { href: "/annonces", label: "Annonces" },
    ],
    sell: canSell
      ? [
          { href: "/app/annonces/nouvelle", label: "Publier une annonce" },
          { href: "/app/import", label: "Importer un bordereau" },
          { href: "/valoriser", label: "Estimer un portefeuille" },
        ]
      : [],
    buy: canBuy
      ? [
          { href: "/app/mandats", label: "Mandats" },
          { href: "/app/opportunites", label: "Correspondances" },
          { href: "/annonces/demandes", label: "Demandes d’acquisition" },
        ]
      : [],
  };
}

function MenuChevron() {
  return (
    <svg className="ml-1 h-3.5 w-3.5 opacity-60" viewBox="0 0 12 12" aria-hidden="true">
      <path
        d="M2.5 4.5 6 8l3.5-3.5"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function Dropdown({
  label,
  items,
  path,
  onNavigate,
}: {
  label: string;
  items: NavLink[];
  path: string;
  onNavigate?: () => void;
}) {
  const [open, setOpen] = useState(false);
  const root = useRef<HTMLDivElement>(null);
  const menuId = useId();
  const active = items.some((item) => linkActive(path, item));

  useEffect(() => {
    setOpen(false);
  }, [path]);

  useEffect(() => {
    if (!open) return;
    function onDoc(event: MouseEvent) {
      if (!root.current?.contains(event.target as Node)) setOpen(false);
    }
    function onKey(event: KeyboardEvent) {
      if (event.key === "Escape") setOpen(false);
    }
    document.addEventListener("mousedown", onDoc);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDoc);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  if (items.length === 0) return null;

  return (
    <div className="relative" ref={root}>
      <button
        type="button"
        aria-expanded={open}
        aria-controls={menuId}
        onClick={() => setOpen((v) => !v)}
        className={cn(
          "inline-flex items-center rounded-full px-3 py-2 text-[14px]",
          active || open ? "bg-surface-alt text-ink" : "text-ink/80 hover:bg-surface-alt hover:text-ink",
        )}
      >
        {label}
        <MenuChevron />
      </button>
      {open ? (
        <ul
          id={menuId}
          role="menu"
          className="absolute left-0 top-[calc(100%+0.35rem)] z-30 min-w-[16rem] rounded-2xl border border-line bg-surface p-1.5 shadow-sm"
        >
          {items.map((item) => (
            <li key={item.href} role="none">
              <Link
                role="menuitem"
                href={item.href}
                onClick={() => {
                  setOpen(false);
                  onNavigate?.();
                }}
                className={cn(
                  "block rounded-xl px-3 py-2.5 text-[14px]",
                  linkActive(path, item)
                    ? "bg-indigo-soft font-medium text-indigo-dark"
                    : "text-ink/80 hover:bg-surface-alt hover:text-ink",
                )}
              >
                {item.label}
              </Link>
            </li>
          ))}
        </ul>
      ) : null}
    </div>
  );
}

export function MemberNav({
  canSell,
  canBuy,
  variant,
  onNavigate,
}: {
  canSell: boolean;
  canBuy: boolean;
  variant: "desktop" | "mobile";
  onNavigate?: () => void;
}) {
  const path = usePathname();
  const { primary, sell, buy } = buildNav(canSell, canBuy);
  const extra: NavLink[] = [{ href: "/app/outils", label: "Outils" }];

  if (variant === "mobile") {
    const all = [...primary, ...sell, ...buy, ...extra, { href: "/app/profil", label: "Mon compte" }];
    return (
      <nav aria-label="Espace membre">
        <ul className="space-y-1">
          {all.map((item) => (
            <li key={item.href}>
              <Link
                href={item.href}
                onClick={onNavigate}
                className={cn(
                  "block rounded-xl px-3 py-2.5 text-[15px]",
                  linkActive(path, item)
                    ? "bg-indigo-soft font-medium text-indigo-dark"
                    : "hover:bg-surface-alt",
                )}
              >
                {item.label}
              </Link>
            </li>
          ))}
        </ul>
      </nav>
    );
  }

  return (
    <nav className="hidden flex-1 items-center justify-center gap-1 lg:flex" aria-label="Espace membre">
      {primary.map((item) => (
        <Link
          key={item.href}
          href={item.href}
          className={cn(
            "rounded-full px-3 py-2 text-[14px]",
            linkActive(path, item)
              ? "bg-surface-alt text-ink"
              : "text-ink/80 hover:bg-surface-alt hover:text-ink",
          )}
        >
          {item.label}
        </Link>
      ))}
      <Dropdown label="Céder" items={sell} path={path} onNavigate={onNavigate} />
      <Dropdown label="Acquérir" items={buy} path={path} onNavigate={onNavigate} />
      {extra.map((item) => (
        <Link
          key={item.href}
          href={item.href}
          className={cn(
            "rounded-full px-3 py-2 text-[14px]",
            linkActive(path, item)
              ? "bg-surface-alt text-ink"
              : "text-ink/80 hover:bg-surface-alt hover:text-ink",
          )}
        >
          {item.label}
        </Link>
      ))}
    </nav>
  );
}

export function memberPrimaryAction(canSell: boolean, canBuy: boolean): NavLink {
  if (canSell) return { href: "/app/annonces/nouvelle", label: "Déposer une annonce" };
  if (canBuy) return { href: "/app/mandats", label: "Déposer un mandat" };
  return { href: "/annonces", label: "Voir les annonces" };
}
