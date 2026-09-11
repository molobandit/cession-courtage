"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { AUDIENCE_FOOTER } from "@/lib/copy/audience";
import {
  MARKET_ACCESS,
  MARKET_HALL,
  NAV_BUY,
  NAV_INVESTOR,
  NAV_SELL,
} from "@/lib/copy/market";
import { BRAND_NAME, COMPANY_LEGAL_NAME } from "@/lib/site";

const COLUMNS = [
  {
    title: "Céder",
    links: [
      { href: "/ceder", label: NAV_SELL },
      { href: "/valoriser", label: "Valoriser un portefeuille" },
      { href: "/certification", label: "Portefeuille certifié" },
      { href: "/tarifs", label: MARKET_ACCESS },
    ],
  },
  {
    title: "Acquérir",
    links: [
      { href: "/acquerir", label: NAV_BUY },
      { href: "/annonces", label: MARKET_HALL },
      { href: "/investisseurs", label: NAV_INVESTOR },
      { href: "/investisseurs/opportunites", label: "Opportunités" },
    ],
  },
  {
    title: "Comprendre",
    links: [
      { href: "/faq", label: "Questions fréquentes" },
      { href: "/journal", label: "Journal" },
    ],
  },
  {
    title: "Informations légales",
    links: [
      { href: "/mentions-legales", label: "Mentions légales" },
      { href: "/conditions-generales", label: "Conditions générales" },
      { href: "/confidentialite", label: "Confidentialité" },
    ],
  },
];

export function SiteFooter() {
  const path = usePathname();
  if (path.startsWith("/app")) return null;

  return (
    <footer className="bg-gradient-to-br from-deep via-deep to-deep-soft text-white">
      <div className="mx-auto max-w-6xl px-4 py-12">
        <div className="grid gap-10 lg:grid-cols-[1.4fr_repeat(4,1fr)]">
          <div>
            <p className="text-[15px] font-semibold tracking-tight">{BRAND_NAME}</p>
            <p className="mt-1 text-[12px] text-white/55">{COMPANY_LEGAL_NAME}</p>
            <p className="mt-3 max-w-xs text-[14px] leading-relaxed text-white/70">
              {AUDIENCE_FOOTER}
            </p>
          </div>
          {COLUMNS.map((column) => (
            <nav key={column.title} aria-label={column.title}>
              <p className="text-[12px] font-semibold uppercase tracking-[0.08em] text-indigo-line">
                {column.title}
              </p>
              <ul className="mt-3 space-y-2">
                {column.links.map((link) => (
                  <li key={link.href}>
                    <Link href={link.href} className="text-[14px] text-white/70 hover:text-white">
                      {link.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </nav>
          ))}
        </div>

        <div className="mt-10 border-t border-white/15 pt-6">
          <p className="text-[13px] leading-relaxed text-white/65">
            La plateforme met en relation des professionnels. Elle n’est partie à
            aucune transaction, n’exerce aucune activité d’intermédiation en
            assurance et ne fournit aucun conseil en investissement. Les
            valorisations sont indicatives et ne constituent pas une garantie de
            prix.
          </p>
        </div>
      </div>
    </footer>
  );
}
