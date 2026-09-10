"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { BrandMark } from "@/components/brand-mark";
import { MemberNav, memberPrimaryAction } from "@/components/app/member-nav";
import { BRAND_NAME } from "@/lib/site";

export type MemberShellProps = {
  firstName: string;
  alias: string;
  orias: string;
  canSell: boolean;
  canBuy: boolean;
  subscribed: boolean;
  children: React.ReactNode;
};

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
  const initial = (firstName.trim().charAt(0) || "C").toLocaleUpperCase("fr-FR");
  const action = memberPrimaryAction(canSell, canBuy);

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
    <div className="flex min-h-dvh flex-col bg-page">
      <header className="sticky top-0 z-30 border-b border-line bg-surface">
        <div className="mx-auto flex h-[4.25rem] max-w-6xl items-center gap-4 px-4 sm:gap-6">
          <Link href="/app" className="flex shrink-0 items-center gap-2.5" onClick={() => setOpen(false)}>
            <BrandMark className="h-9 w-9" />
            <span className="text-[15px] font-semibold tracking-tight text-ink">{BRAND_NAME}</span>
          </Link>

          <MemberNav canSell={canSell} canBuy={canBuy} variant="desktop" />

          <div className="ml-auto hidden items-center gap-3 lg:flex">
            <Link
              href="/app/profil"
              className="flex max-w-[12rem] items-center gap-2.5 rounded-full py-1 pr-1 pl-3 hover:bg-surface-alt"
              aria-label="Mon compte"
            >
              <span className="truncate text-[13px] text-ink/80">{firstName}</span>
              <span className="inline-flex h-9 w-9 items-center justify-center rounded-full bg-indigo text-[13px] font-semibold !text-white">
                {initial}
              </span>
            </Link>
            <form action="/api/deconnexion" method="post">
              <button type="submit" className="text-[14px] text-ink/80 hover:text-ink">
                Déconnexion
              </button>
            </form>
            <Link
              href={action.href}
              className="rounded-full bg-indigo px-5 py-2.5 text-[14px] font-semibold !text-white hover:bg-indigo-dark"
            >
              {action.label}
            </Link>
          </div>

          <div className="ml-auto flex items-center gap-2 lg:hidden">
            <Link
              href={action.href}
              className="rounded-full bg-indigo px-3.5 py-2 text-[13px] font-semibold !text-white"
            >
              Déposer
            </Link>
            <button
              type="button"
              className="inline-flex h-10 w-10 items-center justify-center rounded-full border border-line"
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
        </div>

        {open ? (
          <div
            id="member-mobile-nav"
            className="border-t border-line bg-surface px-4 py-4 lg:hidden"
          >
            <p className="px-3 pb-3 text-[13px] text-muted">
              {firstName}
              <span className="mx-1.5 text-muted">·</span>
              ORIAS {orias}
              <span className="mx-1.5 text-muted">·</span>
              {alias}
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
              variant="mobile"
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
  );
}
