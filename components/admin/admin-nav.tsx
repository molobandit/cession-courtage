"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";

const LINKS = [
  { href: "/admin/orias", label: "Validation ORIAS" },
  { href: "/admin/investisseurs", label: "Investisseurs" },
  { href: "/admin/certifications", label: "Certifications" },
] as const;

export function AdminNav({ unreadInquiries }: { unreadInquiries: number }) {
  const path = usePathname();

  return (
    <nav className="mt-4 flex flex-wrap gap-2" aria-label="Administration">
      {LINKS.map((item) => {
        const active = path === item.href || path.startsWith(`${item.href}/`);
        const unread = item.href === "/admin/investisseurs" ? unreadInquiries : 0;
        return (
          <Link
            key={item.href}
            href={item.href}
            className={cn(
              "inline-flex items-center gap-2 rounded-full border px-3 py-1.5 text-sm font-medium",
              active
                ? "border-indigo bg-indigo text-white"
                : "border-line bg-paper text-ink hover:bg-surface-alt",
            )}
          >
            {item.label}
            {unread > 0 ? (
              <span
                className={cn(
                  "rounded-full px-1.5 text-xs tabular-nums",
                  active ? "bg-white/20 text-white" : "bg-indigo-soft text-indigo-dark",
                )}
              >
                {unread}
              </span>
            ) : null}
          </Link>
        );
      })}
    </nav>
  );
}
