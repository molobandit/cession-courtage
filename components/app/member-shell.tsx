"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { BrandMark } from "@/components/brand-mark";
import { MemberNav, MemberRail } from "@/components/app/member-nav";
import { MemberSearch } from "@/components/app/member-search";
import { BRAND_NAME } from "@/lib/site";

export type MemberShellProps = {
  firstName: string;
  alias: string;
  orias: string | null;
  canSell: boolean;
  canBuy: boolean;
  isInvestor?: boolean;
  subscribed: boolean;
  children: React.ReactNode;
};

export function MemberShell({
  firstName,
  alias,
  orias,
  canSell,
  canBuy,
  isInvestor = false,
  subscribed,
  children,
}: MemberShellProps) {
  const path = usePathname();
  const [open, setOpen] = useState(false);
  const initial = (firstName.trim().charAt(0) || "C").toLocaleUpperCase("fr-FR");
  const homeHref = isInvestor ? "/app/mes-dossiers" : "/app";

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
      <aside className="sticky top-0 hidden h-dvh shrink-0 lg:flex">
        <MemberRail canSell={canSell} canBuy={canBuy} isInvestor={isInvestor} />
      </aside>
      <div className="flex min-w-0 flex-1 flex-col">
        <header className="sticky top-0 z-30 border-b border-line bg-surface">
          <div className="flex h-[4.25rem] items-center gap-3 px-4">
            <Link href={homeHref} className="flex shrink-0 items-center gap-2">
              <BrandMark className="h-8 w-8" />
              <span className="hidden text-[15px] font-semibold tracking-tight text-ink sm:inline">
                {BRAND_NAME}
              </span>
            </Link>
            <MemberSearch />
            <Link
              href="/app/profil"
              className="hidden shrink-0 items-center gap-2 rounded-full py-1 pr-1 pl-3 hover:bg-surface-alt lg:flex"
              aria-label="Mon compte"
            >
              <span className="max-w-[8rem] truncate text-[13px] text-ink/80">{firstName}</span>
              <span className="inline-flex h-9 w-9 items-center justify-center rounded-full bg-indigo text-[13px] font-semibold !text-white">
                {initial}
              </span>
            </Link>
            <form action="/api/deconnexion" method="post" className="hidden lg:block">
              <button type="submit" className="text-[14px] text-ink/80 hover:text-ink">
                Déconnexion
              </button>
            </form>
            <button
              type="button"
              className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-line lg:hidden"
              aria-expanded={open}
              aria-controls="member-mobile-nav"
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
          {open ? (
            <div id="member-mobile-nav" className="border-t border-line bg-surface px-4 py-4 lg:hidden">
              <p className="px-3 pb-3 text-[13px] text-muted">
                {firstName}
                {orias ? (
                  <>
                    <span className="mx-1.5 text-muted">·</span>
                    ORIAS {orias}
                  </>
                ) : (
                  <>
                    <span className="mx-1.5 text-muted">·</span>
                    {alias.replace(/^#/, "")}
                  </>
                )}
                {subscribed ? (
                  <>
                    <span className="mx-1.5 text-muted">·</span>
                    Abonnement actif
                  </>
                ) : null}
              </p>
              <MemberNav
                canSell={canSell}
                canBuy={canBuy}
                isInvestor={isInvestor}
                onNavigate={() => setOpen(false)}
              />
              <form action="/api/deconnexion" method="post" className="mt-2">
                <button
                  type="submit"
                  className="block w-full rounded-xl px-3 py-2.5 text-left text-[15px] hover:bg-surface-alt"
                >
                  Déconnexion
                </button>
              </form>
            </div>
          ) : null}
        </header>
        <div className="flex-1">{children}</div>
      </div>
    </div>
  );
}
