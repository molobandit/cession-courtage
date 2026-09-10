"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";

export function MemberNav({ canSell, canBuy }: { canSell: boolean; canBuy: boolean }) {
  const path = usePathname();
  const links = [
    { href: "/app", label: "Tableau", exact: true },
    { href: "/annonces", label: "Annonces" },
    ...(canSell
      ? [
          { href: "/app/annonces/nouvelle", label: "Déposer une annonce" },
          { href: "/app/import", label: "Import" },
        ]
      : []),
    ...(canBuy
      ? [
          { href: "/app/mandats", label: "Mandats" },
          { href: "/app/opportunites", label: "Correspondances" },
        ]
      : []),
  ];

  return (
    <nav className="border-b border-line bg-surface" aria-label="Espace membre">
      <div className="mx-auto flex max-w-6xl gap-1 overflow-x-auto px-4 py-2">
        {links.map((link) => {
          const active = link.exact ? path === link.href : path === link.href || path.startsWith(`${link.href}/`);
          return (
            <Link
              key={link.href}
              href={link.href}
              className={cn(
                "shrink-0 rounded-full px-3.5 py-2 text-[14px] font-medium",
                active ? "bg-indigo !text-white" : "text-ink/80 hover:bg-surface-alt hover:text-ink",
              )}
            >
              {link.label}
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
