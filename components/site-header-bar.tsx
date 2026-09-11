"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { BrandMark } from "@/components/brand-mark";
import {
  CTA_BROWSE,
  CTA_SELL,
  MARKET_ACCESS,
  MARKET_HALL,
} from "@/lib/copy/market";
import { BRAND_NAME } from "@/lib/site";

const NAV = [
  { href: "/annonces", label: MARKET_HALL },
  { href: "/ceder", label: "Vendre" },
  { href: "/acquerir", label: "Rechercher" },
  { href: "/investisseurs", label: "Investir" },
  { href: "/tarifs", label: MARKET_ACCESS },
];

export type HeaderSession = {
  label: string;
  memberHref: string;
  memberLabel: string;
};

export function SiteHeaderBar({
  session,
}: {
  session: HeaderSession | null;
}) {
  const [open, setOpen] = useState(false);
  const path = usePathname();
  if (path.startsWith("/app")) return null;

  return (
    <header className="sticky top-0 z-30 border-b border-line bg-surface">
      <div className="mx-auto flex h-[4.25rem] max-w-6xl items-center gap-6 px-4">
        <Link href="/" className="flex items-center gap-2.5 shrink-0" onClick={() => setOpen(false)}>
          <BrandMark className="h-9 w-9" />
          <span className="text-[15px] font-semibold tracking-tight text-ink">{BRAND_NAME}</span>
        </Link>

        <nav className="hidden min-w-0 flex-1 items-center justify-center gap-0.5 overflow-x-auto lg:flex" aria-label="Principal">
          {NAV.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className="whitespace-nowrap rounded-full px-2.5 py-2 text-[13px] text-ink/80 hover:bg-surface-alt hover:text-ink"
            >
              {link.label}
            </Link>
          ))}
        </nav>

        <div className="ml-auto hidden items-center gap-3 lg:flex">
          {session ? (
            <>
              <Link href={session.memberHref} className="text-[14px] text-ink/80 hover:text-ink">
                {session.memberLabel}
              </Link>
              <form action="/api/deconnexion" method="post">
                <button type="submit" className="text-[14px] text-ink/80 hover:text-ink">
                  Déconnexion
                </button>
              </form>
            </>
          ) : (
            <Link href="/connexion" className="text-[14px] font-medium text-ink/80 hover:text-ink">
              Connexion
            </Link>
          )}
          <Link
            href="/annonces"
            className="rounded-full border border-line px-4 py-2.5 text-[14px] font-medium text-ink hover:bg-surface-alt"
          >
            {CTA_BROWSE}
          </Link>
          <Link
            href="/ceder"
            className="rounded-full bg-indigo px-5 py-2.5 text-[14px] font-semibold !text-white hover:bg-indigo-dark"
          >
            {CTA_SELL}
          </Link>
        </div>

        <div className="ml-auto flex items-center gap-2 lg:hidden">
          <Link
            href="/ceder"
            className="rounded-full bg-indigo px-3.5 py-2 text-[13px] font-semibold !text-white"
          >
            Vendre
          </Link>
          <button
            type="button"
            className="inline-flex h-10 w-10 items-center justify-center rounded-full border border-line"
            aria-expanded={open}
            aria-controls="mobile-nav"
            onClick={() => setOpen((v) => !v)}
          >
            <span className="sr-only">{open ? "Fermer le menu" : "Ouvrir le menu"}</span>
            <span className="flex flex-col gap-1.5" aria-hidden="true">
              <span className="block h-0.5 w-4 bg-ink" />
              <span className="block h-0.5 w-4 bg-ink" />
              <span className="block h-0.5 w-4 bg-ink" />
            </span>
          </button>
        </div>
      </div>

      {open ? (
        <nav
          id="mobile-nav"
          className="border-t border-line bg-surface px-4 py-4 lg:hidden"
          aria-label="Menu mobile"
        >
          <ul className="space-y-1">
            {NAV.map((link) => (
              <li key={link.href}>
                <Link
                  href={link.href}
                  className="block rounded-xl px-3 py-2.5 text-[15px] hover:bg-surface-alt"
                  onClick={() => setOpen(false)}
                >
                  {link.label}
                </Link>
              </li>
            ))}
            {session ? (
              <>
                <li>
                  <Link
                    href={session.memberHref}
                    className="block rounded-xl px-3 py-2.5 text-[15px] hover:bg-surface-alt"
                    onClick={() => setOpen(false)}
                  >
                    {session.memberLabel}
                  </Link>
                </li>
                <li>
                  <form action="/api/deconnexion" method="post">
                    <button type="submit" className="block w-full rounded-xl px-3 py-2.5 text-left text-[15px] hover:bg-surface-alt">
                      Déconnexion
                    </button>
                  </form>
                </li>
              </>
            ) : (
              <li>
                <Link
                  href="/connexion"
                  className="block rounded-xl px-3 py-2.5 text-[15px] hover:bg-surface-alt"
                  onClick={() => setOpen(false)}
                >
                  Connexion
                </Link>
              </li>
            )}
          </ul>
        </nav>
      ) : null}
    </header>
  );
}
