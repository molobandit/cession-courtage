import Link from "next/link";
import { SUCCESS_FEE_RATE } from "@/lib/billing/rates";
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
  const fee = `${(SUCCESS_FEE_RATE * 100).toLocaleString("fr-FR")} % HT`;
  return (
    <footer className="mt-20 border-t border-charcoal-muted bg-charcoal text-cream">
      <div className="mx-auto max-w-6xl px-4 py-12">
        <div className="grid gap-10 lg:grid-cols-[1.4fr_repeat(4,1fr)]">
          <div>
            <p className="font-serif text-lg font-semibold">{BRAND_NAME}</p>
            <p className="mt-3 max-w-xs text-[15px] leading-relaxed text-cream/70">
              Place de marché réservée aux courtiers immatriculés ORIAS. Gratuit
              jusqu’à la vente, honoraires de {fee} au succès.
            </p>
          </div>
          {COLUMNS.map((column) => (
            <nav key={column.title} aria-label={column.title}>
              <p className="text-[13px] font-medium uppercase tracking-[0.14em] text-indigo-soft">
                {column.title}
              </p>
              <ul className="mt-3 space-y-2">
                {column.links.map((link) => (
                  <li key={link.href}>
                    <Link href={link.href} className="text-[15px] text-cream/75 hover:text-indigo-soft">
                      {link.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </nav>
          ))}
        </div>

        <div className="mt-10 border-t border-cream/10 pt-6">
          <p className="text-sm leading-relaxed text-cream/65">
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
