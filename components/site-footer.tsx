"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { VERIFIED_FEE_RANGE_LABEL } from "@/lib/billing/rates";
import { AUDIENCE_FOOTER } from "@/lib/copy/audience";
import { BRAND_NAME } from "@/lib/site";

const COLUMNS = [
  {
    title: "Céder",
    links: [
      { href: "/ceder", label: "Parcours cédant" },
      { href: "/valoriser", label: "Estimer mon portefeuille" },
      { href: "/certification", label: "Portefeuille certifié" },
      { href: "/tarifs", label: "Tarifs" },
    ],
  },
  {
    title: "Acquérir",
    links: [
      { href: "/acquerir", label: "Parcours acquéreur" },
      { href: "/annonces", label: "Annonces en ligne" },
      { href: "/investisseurs", label: "Espace investisseurs" },
      { href: "/investisseurs/opportunites", label: "Opportunités" },
      { href: "/inscription", label: "Déposer un mandat" },
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
            <p className="mt-3 max-w-xs text-[14px] leading-relaxed text-white/70">
              {AUDIENCE_FOOTER} Option vérifiée : {VERIFIED_FEE_RANGE_LABEL}.
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
            prix. Aucune donnée nominative de client final n’est collectée.
          </p>
        </div>
      </div>
    </footer>
  );
}
