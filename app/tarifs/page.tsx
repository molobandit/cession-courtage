import type { Metadata } from "next";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import {
  INTEREST_DEPOSIT_LABEL,
  SUCCESS_FEE_FLOOR_EUR,
  VERIFIED_FEE_RANGE_LABEL,
} from "@/lib/billing/rates";
import { formatEuroWhole } from "@/lib/format/number";
import { CESSION_FUNDS_DISCLAIMER } from "@/lib/partners/catalog";
import { CERTIFIED_BADGE, CERTIFIED_LABEL } from "@/lib/site";
import { presentPartners } from "@/lib/partners/status";
import { PartnerStrip } from "@/components/partners/partner-grid";
import {
  ACCESS_MARKET_POINTS,
  ACCESS_PRICE_LINE,
  COMPANY_SOCIETY_CHECKS,
  CTA_BROWSE,
  CTA_SELL,
  DEPOSIT_POSITION_ITEMS,
  DEPOSIT_POSITION_LEDE,
  DEPOSIT_POSITION_TITLE,
  FAQ_PORTFOLIO_TRANSFER_A,
  FAQ_PORTFOLIO_TRANSFER_Q,
  MARKET_ACCESS,
  NO_FEE_LABEL,
  RETENTION_TRUST_ITEMS,
  RETENTION_TRUST_LEDE,
  RETENTION_TRUST_TITLE,
  SECURE_PAYMENT_ITEMS,
  SECURE_PAYMENT_LEDE,
  SECURE_PAYMENT_TITLE,
  TAKE_POSITION,
} from "@/lib/copy/market";

export const metadata: Metadata = {
  title: MARKET_ACCESS,
  description: `Mettre en vente : ${NO_FEE_LABEL.toLowerCase()}. Honoraires dus uniquement si la vente aboutit.`,
};


const PLAN_ROWS: { label: string; free: boolean; paid: boolean }[] = [
  { label: "Consulter la salle de marché", free: true, paid: true },
  { label: "Mettre un portefeuille en vente", free: true, paid: true },
  { label: "Détail pour se positionner", free: true, paid: true },
  { label: "Contact et messages", free: true, paid: true },
  { label: "Dépôt de positionnement", free: true, paid: true },
];

const COMPARE_ROWS: {
  label: string;
  simple: string;
  verified: string;
}[] = [
  { label: "Publication sous alias", simple: "oui", verified: "oui" },
  { label: "Transaction sécurisée", simple: "oui", verified: "oui" },
  { label: "Kbis et existence réelle de la société", simple: "non", verified: "oui" },
  { label: "Réputation du cabinet", simple: "non", verified: "oui" },
  { label: "Pièce d’identité du représentant", simple: "non", verified: "oui" },
  { label: "Justificatif ORIAS du dossier", simple: "non", verified: "oui" },
  { label: "États de portefeuille et bordereaux", simple: "non", verified: "oui" },
  { label: "Badge en salle de marché", simple: "Non certifié", verified: CERTIFIED_LABEL },
];

const VERIFIED_PILLS = [
  "Société réelle : Kbis et RCS",
  "Réputation du cabinet",
  "Identité du représentant",
  "Justificatif ORIAS du dossier",
  "Statuts et documents sociaux",
  "États de portefeuille",
  "Bordereaux de commissions",
  "Revue interne compagnies et mix",
  "Transaction sécurisée jusqu’au transfert",
];

const VERIFY_BLOCKS = [
  {
    title: "La société",
    lede: "Nous contrôlons que le cabinet existe et qu’il est en règle pour céder.",
    items: [...COMPANY_SOCIETY_CHECKS],
  },
  {
    title: "La personne",
    lede: "Nous contrôlons l’identité de celui qui signe, pas seulement le numéro ORIAS du compte.",
    items: [
      "Pièce d’identité du représentant légal",
      "Concordance avec le Kbis",
      "Les deux parties du dossier passent par cette étape avant l’acte",
      "Les pièces ne sont jamais publiées en salle de marché",
    ],
  },
  {
    title: "Le portefeuille",
    lede: "Nous confrontons ce qui est annoncé aux documents du cabinet.",
    items: [
      "États de portefeuille",
      "Bordereaux et relevés de commissions",
      "Relevés des compagnies, le cas échéant",
      "Répartition des contrats, renouvellement et résiliation",
    ],
  },
];

const FAQ = [
  {
    q: FAQ_PORTFOLIO_TRANSFER_Q,
    a: FAQ_PORTFOLIO_TRANSFER_A,
  },
];

export default async function TarifsPage() {
  const partners = presentPartners();

  return (
    <main>
      <section className="relative overflow-hidden bg-gradient-to-b from-indigo-soft via-page to-page">
        <div className="mx-auto max-w-4xl px-4 py-16 text-center sm:py-20">
          <p className="inline-flex rounded-full border border-indigo-line bg-surface px-3.5 py-1 text-[12px] font-semibold text-indigo">
            {MARKET_ACCESS}
          </p>
          <h1 className="mt-5 text-4xl font-bold tracking-tight text-ink sm:text-5xl">
            {TAKE_POSITION}
          </h1>
          <p className="mx-auto mt-4 max-w-2xl text-[16px] leading-relaxed text-muted">
            Accès à toutes les opportunités de portefeuille. {ACCESS_PRICE_LINE}.
          </p>
          <div className="mt-8 flex flex-wrap justify-center gap-3">
            <a
              href="#honoraires"
              className="rounded-full border border-line bg-surface px-5 py-2.5 text-[14px] font-medium text-ink shadow-sm hover:border-indigo"
            >
              {MARKET_ACCESS}
            </a>
            <a
              href="#verification"
              className="rounded-full border border-line bg-surface px-5 py-2.5 text-[14px] font-medium text-ink shadow-sm hover:border-indigo"
            >
              Ce que nous vérifions
            </a>
            <Link
              href="/partenaires"
              className="rounded-full border border-line bg-surface px-5 py-2.5 text-[14px] font-medium text-ink shadow-sm hover:border-indigo"
            >
              Transaction sécurisée
            </Link>
            <Link
              href="/annonces"
              className="rounded-full border border-line bg-surface px-5 py-2.5 text-[14px] font-medium text-ink shadow-sm hover:border-indigo"
            >
              {CTA_BROWSE}
            </Link>
          </div>
        </div>
      </section>

      <section className="bg-page px-4 pb-2 pt-2">
        <div className="mx-auto max-w-5xl rounded-3xl border border-line bg-paper px-5 py-5">
          <p className="text-center text-[13px] font-medium text-ink">
            Stripe, Trustap, Yousign, DocuSign, Ondorse, CrediPro. La bourse n’encaisse pas les fonds de la cession.
          </p>
          <div className="mt-3 flex justify-center">
            <PartnerStrip partners={partners} />
          </div>
        </div>
      </section>

      <section id="honoraires" className="bg-page pb-6 pt-4">
        <div className="mx-auto max-w-6xl px-4 py-10 text-center">
          <p className="inline-flex rounded-full bg-indigo-soft px-3.5 py-1 text-[12px] font-semibold text-indigo">
            Honoraires
          </p>
          <h2 className="mt-4 text-3xl font-bold tracking-tight text-ink sm:text-4xl">
            Vous ne payez que si la vente aboutit
          </h2>
          <p className="mx-auto mt-3 max-w-xl text-[15px] text-muted">
            {ACCESS_MARKET_POINTS[0]} {ACCESS_MARKET_POINTS[1]}
          </p>
        </div>

        <div className="mx-auto grid max-w-5xl items-stretch gap-6 px-4 pb-16 lg:grid-cols-2">
          <article className="flex flex-col rounded-3xl border border-line bg-surface p-8 shadow-sm">
            <h3 className="text-center text-xl font-bold text-ink">{NO_FEE_LABEL}</h3>
            <p className="mt-4 text-center text-[15px] font-semibold text-ink">Mise en vente sans frais</p>
            <p className="mt-1 text-center text-[13px] text-muted">
              L’étude du portefeuille et la mise en ligne ne coûtent rien au cédant.
            </p>
            <ul className="mt-8 flex-1 space-y-3">
              {PLAN_ROWS.map((row) => (
                <PlanRow key={row.label} label={row.label} on={row.free} />
              ))}
            </ul>
            <Button asChild variant="outline" className="mt-8 w-full" size="lg">
              <Link href="/ceder">{CTA_SELL}</Link>
            </Button>
          </article>

          <article className="relative flex flex-col rounded-3xl border-2 border-indigo bg-indigo-soft/60 p-8 shadow-sm">
            <h3 className="text-center text-xl font-bold text-ink">Portefeuille certifié</h3>
            <p className="tabular mt-4 text-center text-4xl font-bold tracking-tight text-indigo">
              {VERIFIED_FEE_RANGE_LABEL}
            </p>
            <p className="mt-1 text-center text-[13px] text-muted">
              Minimum {formatEuroWhole(SUCCESS_FEE_FLOOR_EUR)} HT, dus uniquement si la vente aboutit.
            </p>
            <ul className="mt-8 flex-1 space-y-3">
              {COMPARE_ROWS.map((row) => (
                <PlanRow key={row.label} label={row.label} on={row.verified !== "non"} accent />
              ))}
            </ul>
            <p className="mt-6 rounded-2xl bg-paper px-4 py-3 text-center text-[13px] leading-relaxed text-ink">
              Côté acquéreur : un dépôt de positionnement de {INTEREST_DEPOSIT_LABEL} du montant de l’annonce,
              versé dans un trust, lance la procédure de cession.
            </p>
          </article>
        </div>
      </section>

      <section id="verification" className="border-t border-line bg-page">
        <div className="mx-auto max-w-6xl px-4 py-16">
          <div className="text-center">
            <p className="inline-flex rounded-full bg-indigo-soft px-3.5 py-1 text-[12px] font-semibold text-indigo">
              Vérification
            </p>
            <h2 className="mt-4 text-3xl font-bold tracking-tight text-ink sm:text-4xl">
              Ce que nous contrôlons, et ce que nous ne contrôlons pas
            </h2>
            <p className="mx-auto mt-3 max-w-2xl text-[15px] text-muted">
              La mise en ligne n’est pas une vérification. L’annonce simple n’est
              pas certifiée : les données du portefeuille ne sont pas vérifiées
              par La bourse du portefeuille. Le portefeuille certifié : tous les
              éléments sont contrôlés.
            </p>
          </div>

          <div className="mt-10 overflow-hidden rounded-3xl border border-line bg-surface">
            <table className="w-full min-w-[36rem] border-collapse text-left">
              <thead className="bg-page">
                <tr>
                  <th scope="col" className="px-5 py-4 text-[14px] font-semibold text-ink">
                    Contrôle
                  </th>
                  <th scope="col" className="px-5 py-4 text-center text-[14px] font-semibold text-ink">
                    Annonce simple
                  </th>
                  <th scope="col" className="px-5 py-4 text-center text-[14px] font-semibold text-ink">
                    Portefeuille certifié
                  </th>
                </tr>
              </thead>
              <tbody>
                {COMPARE_ROWS.map((row) => (
                  <tr key={row.label} className="border-t border-line">
                    <th
                      scope="row"
                      className="px-5 py-3.5 text-[14px] font-medium text-ink"
                    >
                      {row.label}
                    </th>
                    <td className="px-5 py-3.5 text-center text-[14px]">
                      <CompareValue value={row.simple} />
                    </td>
                    <td className="px-5 py-3.5 text-center text-[14px]">
                      <CompareValue value={row.verified} accent />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <article
            id="services"
            className="mt-12 rounded-3xl bg-gradient-to-br from-indigo via-indigo-mid to-indigo-dark p-8 text-white shadow-sm sm:p-10"
          >
            <div className="flex flex-col gap-6 lg:flex-row lg:items-start lg:justify-between">
              <div>
                <p className="inline-flex rounded-full bg-white/15 px-3 py-1 text-[12px] font-semibold">
                  Option 2 · {CERTIFIED_LABEL}
                </p>
                <h3 className="mt-4 text-2xl font-bold tracking-tight">
                  Portefeuille certifié
                </h3>
                <p className="mt-2 max-w-2xl text-[15px] leading-relaxed text-white/80">
                  Portefeuille certifié. Tous les éléments sont contrôlés. Les
                  données et les bordereaux de commission sont vérifiés, ainsi
                  que le reste du dossier. Honoraires dus uniquement si la vente
                  aboutit. La salle de marché affiche {CERTIFIED_BADGE}.
                </p>
              </div>
              <div className="shrink-0 text-right">
                <p className="text-2xl font-bold sm:text-3xl">Au contrat</p>
                <p className="mt-1 text-[13px] text-white/70">
                  Dus seulement si la vente aboutit
                </p>
              </div>
            </div>
            <ul className="mt-8 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
              {VERIFIED_PILLS.map((item) => (
                <li
                  key={item}
                  className="flex items-start gap-2 rounded-2xl bg-white/10 px-4 py-3 text-[14px] leading-snug"
                >
                  <CheckIcon className="mt-0.5 shrink-0 text-white" />
                  {item}
                </li>
              ))}
            </ul>
            <div className="mt-8">
              <Button asChild className="bg-white !text-indigo hover:bg-white/90" size="lg">
                <Link href="/certification">Voir le détail des pièces</Link>
              </Button>
            </div>
          </article>

          <div className="mt-8 grid gap-6 lg:grid-cols-3">
            {VERIFY_BLOCKS.map((block) => (
              <article
                key={block.title}
                className="flex flex-col rounded-3xl border border-line bg-surface p-7 shadow-sm"
              >
                <h3 className="text-lg font-bold text-ink">{block.title}</h3>
                <p className="mt-2 text-[14px] leading-relaxed text-muted">{block.lede}</p>
                <ul className="mt-5 space-y-2">
                  {block.items.map((item) => (
                    <li key={item} className="flex items-start gap-2 text-[14px] text-ink">
                      <CheckIcon className="mt-0.5 shrink-0 text-indigo" />
                      {item}
                    </li>
                  ))}
                </ul>
              </article>
            ))}
          </div>

          <div className="mt-6 grid gap-6 lg:grid-cols-3">
            <ServiceCard
              title={DEPOSIT_POSITION_TITLE}
              lede={DEPOSIT_POSITION_LEDE}
              price={INTEREST_DEPOSIT_LABEL}
              items={[...DEPOSIT_POSITION_ITEMS]}
            />
            <ServiceCard
              title="Annonce simple"
              lede="Annonce non certifiée. Les données du portefeuille ne sont pas vérifiées par La bourse du portefeuille."
              price="Sans honoraires"
              items={[
                "C’est à l’acquéreur d’effectuer ses propres vérifications",
                "Kbis, pièces d’identité et capacité du vendeur à contrôler de son côté",
                "Mise en vente sans honoraires",
                "Transaction sécurisée",
              ]}
              href="/ceder"
              cta="Choisir l’annonce simple"
            />
            <ServiceCard
              title={SECURE_PAYMENT_TITLE}
              lede={SECURE_PAYMENT_LEDE}
              price="Inclus"
              items={[...SECURE_PAYMENT_ITEMS]}
            />
          </div>
          <article className="mt-6 rounded-3xl border border-line bg-surface p-7 shadow-sm">
            <h3 className="text-lg font-bold text-ink">{RETENTION_TRUST_TITLE}</h3>
            <p className="mt-2 text-[14px] leading-relaxed text-muted">{RETENTION_TRUST_LEDE}</p>
            <ul className="mt-5 space-y-2">
              {RETENTION_TRUST_ITEMS.map((item) => (
                <li key={item} className="flex items-start gap-2 text-[14px] text-ink">
                  <CheckIcon className="mt-0.5 shrink-0 text-indigo" />
                  {item}
                </li>
              ))}
            </ul>
          </article>
        </div>
      </section>


      <section className="border-t border-line bg-page">
        <div className="mx-auto max-w-3xl px-4 py-16">
          <h2 className="text-center text-3xl font-bold tracking-tight text-ink">
            Questions fréquentes
          </h2>
          <p className="mt-3 text-center text-[15px] text-muted">
            Ce que coûte le service, et à quel moment.
          </p>
          <div className="mt-8 space-y-3">
            {FAQ.map((item) => (
              <details
                key={item.q}
                className="group rounded-2xl border border-line bg-surface p-5 open:border-indigo-line"
              >
                <summary className="cursor-pointer list-none text-[15px] font-medium text-ink">
                  <span className="flex items-start justify-between gap-4">
                    {item.q}
                    <span aria-hidden="true" className="text-indigo group-open:hidden">
                      +
                    </span>
                    <span aria-hidden="true" className="hidden text-indigo group-open:inline">
                      −
                    </span>
                  </span>
                </summary>
                <p className="mt-3 text-[15px] leading-relaxed text-muted">{item.a}</p>
              </details>
            ))}
          </div>
        </div>
      </section>

      <section className="border-t border-line bg-indigo-soft">
        <div className="mx-auto max-w-3xl px-4 py-16 text-center">
          <h2 className="text-3xl font-bold tracking-tight text-ink">
            Prêt à vendre ou à acheter ?
          </h2>
          <div className="mx-auto mt-6 grid max-w-2xl gap-3 text-left">
            <p className="rounded-2xl border border-line bg-paper px-5 py-4 text-[15px] leading-relaxed text-muted">
              <span className="font-semibold text-ink">Vous vendez.</span> Notre équipe relit
              votre annonce, puis la publie en salle de marché sous alias.
            </p>
            <p className="rounded-2xl border border-line bg-paper px-5 py-4 text-[15px] leading-relaxed text-muted">
              <span className="font-semibold text-ink">Vous achetez.</span> Vous vous positionnez en versant
              un dépôt de {INTEREST_DEPOSIT_LABEL} du montant de l’annonce dans un trust.
            </p>
            <p className="rounded-2xl border border-line bg-paper px-5 py-4 text-[15px] leading-relaxed text-muted">
              <span className="font-semibold text-ink">La transaction est sécurisée.</span> {CESSION_FUNDS_DISCLAIMER}
            </p>
          </div>
          <div className="mt-8 flex flex-wrap justify-center gap-3">
            <Button asChild variant="primary" size="lg">
              <Link href="/ceder">Déposer une annonce</Link>
            </Button>
            <Button asChild variant="outline" size="lg">
              <Link href="/inscription">S’abonner</Link>
            </Button>
          </div>
        </div>
      </section>
    </main>
  );
}

function CompareValue({
  value,
  accent = false,
}: {
  value: string;
  accent?: boolean;
}) {
  if (value === "oui") {
    return (
      <span className="inline-flex items-center justify-center gap-1 font-medium text-ink">
        <CheckIcon className={accent ? "text-indigo" : "text-ok"} />
        oui
      </span>
    );
  }
  if (value === "non") {
    return <span className="text-muted">non</span>;
  }
  return (
    <span className={`font-medium ${accent ? "text-indigo" : "text-ink"}`}>
      {value}
    </span>
  );
}

function PlanRow({
  label,
  on,
  accent = false,
}: {
  label: string;
  on: boolean;
  accent?: boolean;
}) {
  return (
    <li className="flex items-start gap-3 text-[14px] leading-snug text-ink">
      {on ? (
        <CheckIcon className={accent ? "mt-0.5 text-indigo" : "mt-0.5 text-ok"} />
      ) : (
        <span className="mt-0.5 inline-flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-surface-alt text-[11px] text-muted">
          ×
        </span>
      )}
      <span>
        {label}
        {!on ? <span className="text-muted"> : non</span> : null}
      </span>
    </li>
  );
}

function ServiceCard({
  title,
  lede,
  price,
  items,
  href,
  cta,
}: {
  title: string;
  lede: string;
  price: string;
  items: string[];
  href?: string;
  cta?: string;
}) {
  return (
    <article className="flex flex-col rounded-3xl border border-line bg-surface p-7 shadow-sm">
      <h3 className="text-lg font-bold text-ink">{title}</h3>
      <p className="mt-2 text-[14px] leading-relaxed text-muted">{lede}</p>
      <p className="tabular mt-4 text-2xl font-bold text-indigo">{price}</p>
      <ul className="mt-5 flex-1 space-y-2">
        {items.map((item) => (
          <li key={item} className="flex items-start gap-2 text-[14px] text-ink">
            <CheckIcon className="mt-0.5 shrink-0 text-indigo" />
            {item}
          </li>
        ))}
      </ul>
      {href && cta ? (
        <Button asChild variant="outline" className="mt-6">
          <Link href={href}>{cta}</Link>
        </Button>
      ) : null}
    </article>
  );
}

function CheckIcon({ className }: { className?: string }) {
  return (
    <svg
      className={`h-5 w-5 ${className ?? ""}`}
      viewBox="0 0 20 20"
      fill="none"
      aria-hidden="true"
    >
      <circle cx="10" cy="10" r="9" fill="currentColor" opacity="0.15" />
      <path
        d="M6 10.2 8.6 13 14 7.5"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}
