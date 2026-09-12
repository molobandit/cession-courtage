import type { Metadata } from "next";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { HomeHeroVisual } from "@/components/home/hero-visual";
import { ListingRecordCard } from "@/components/home/listing-record-card";
import {
  ADVISOR_BOOKING_HREF,
  ACCESS_MARKET_POINTS,
  ACCESS_PRICE_LINE,
  BUY_POINTS,
  COMPANY_LEGAL_NAME,
  CTA_ADVISOR,
  CTA_BROWSE,
  CTA_CONSULT,
  CTA_DEPOSIT,
  CTA_SELL,
  HERO_HEADLINE,
  HERO_HEADLINE_REST,
  HERO_LEDE,
  HERO_TITLE,
  MARKET_HALL_TITLE,
  NAV_BUY,
  NAV_INVESTOR,
  NAV_SELL,
  NO_FEE_LABEL,
  SALE_SPEED_CLAIM,
  SELL_PILLARS,
  TAKE_POSITION,
} from "@/lib/copy/market";
import { loadPublicListingCards } from "@/lib/listing/load-public-cards";
import type { PublicListingCard } from "@/lib/listing/public-card";

export const metadata: Metadata = {
  title: HERO_TITLE,
  description:
    "Salle de marché pour acheter ou vendre un portefeuille d’assurance. Valorisation, certification, transaction sécurisée.",
  alternates: { canonical: "/" },
};

const CHECKS = ["Valorisation", "Certification", "Transaction sécurisée"];

function CheckIcon() {
  return (
    <svg className="h-3.5 w-3.5 shrink-0" viewBox="0 0 16 16" fill="none" aria-hidden="true">
      <path
        d="M3.5 8.5 6.2 11.2 12.5 4.8"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function featuredSpotlight(listings: PublicListingCard[]): PublicListingCard[] {
  const sold = listings.find((item) => item.sold);
  const others = listings.filter((item) => item.id !== sold?.id);
  if (!sold) return others.slice(0, 3);
  return [others[0], sold, others[1]].filter((item): item is PublicListingCard => Boolean(item));
}

export default async function HomePage() {
  const listings = await loadPublicListingCards();
  const rang = (item: (typeof listings)[number]) => (item.certified ? 0 : item.sold ? 1 : 2);
  const vitrine = [...listings].sort((a, b) => rang(a) - rang(b));
  const latest = featuredSpotlight(vitrine);
  const preview = vitrine.slice(0, 8);

  return (
    <main>
      <section className="relative overflow-hidden bg-page">
        <div className="pointer-events-none absolute -left-24 top-10 h-56 w-56 rounded-full bg-indigo-soft" />
        <div className="pointer-events-none absolute -right-16 top-32 h-40 w-40 rounded-full bg-indigo-soft/80" />
        <div className="relative mx-auto grid max-w-6xl items-center gap-12 px-4 py-14 lg:grid-cols-[1.05fr_0.95fr] lg:py-20">
          <div>
            <p className="inline-flex items-center gap-1.5 rounded-full border border-indigo-line bg-indigo-soft px-3 py-1 text-[12px] font-semibold text-indigo">
              <CheckIcon />
              Salle de marché
            </p>
            <h1 className="mt-6 text-4xl font-bold leading-[1.12] tracking-tight text-ink sm:text-5xl">
              {HERO_HEADLINE}{" "}
              <span className="text-indigo">{HERO_HEADLINE_REST}</span>
            </h1>
            <p className="mt-6 max-w-xl">
              <span className="block text-[1.65rem] font-bold leading-tight tracking-tight text-ink sm:text-3xl">
                {COMPANY_LEGAL_NAME}
              </span>
              <span className="mt-3 block text-[16px] leading-relaxed text-muted sm:text-[17px]">
                {HERO_LEDE}
              </span>
            </p>
            <ul className="mt-6 flex flex-wrap gap-2">
              {CHECKS.map((label) => (
                <li
                  key={label}
                  className="inline-flex items-center gap-1.5 rounded-full bg-indigo-soft px-3 py-1.5 text-[13px] font-medium text-indigo-dark"
                >
                  <CheckIcon />
                  {label}
                </li>
              ))}
            </ul>
            <div className="mt-8 flex flex-wrap gap-3">
              <Button asChild variant="primary" size="lg">
                <Link href="/ceder">{CTA_SELL}</Link>
              </Button>
              <Button asChild variant="outline" size="lg">
                <Link href="/annonces">{CTA_BROWSE}</Link>
              </Button>
            </div>
            <nav className="mt-6 flex flex-wrap gap-x-5 gap-y-2 text-[14px] font-medium" aria-label="Parcours">
              <Link href="/ceder" className="text-indigo underline-offset-2 hover:underline">
                {NAV_SELL}
              </Link>
              <Link href="/acquerir" className="text-indigo underline-offset-2 hover:underline">
                {NAV_BUY}
              </Link>
              <Link href="/investisseurs" className="text-indigo underline-offset-2 hover:underline">
                {NAV_INVESTOR}
              </Link>
            </nav>
          </div>
          <HomeHeroVisual listings={latest} />
        </div>
      </section>

      <section className="border-y border-line bg-page">
        <div className="mx-auto grid max-w-6xl gap-4 px-4 py-12 sm:grid-cols-3 sm:gap-6 sm:py-16">
          {[
            { v: "< 1 semaine", k: "Délai moyen", l: `${SALE_SPEED_CLAIM}*` },
            { v: "50+", k: "Points de contrôle", l: "Chaque dossier certifié est vérifié pièce par pièce." },
            { v: "Trust", k: "Paiement sécurisé", l: "Accompagnement jusqu’au transfert des contrats." },
          ].map((row) => (
            <article
              key={row.v}
              className="rounded-[1.75rem] border border-line bg-paper px-6 py-8 shadow-sm sm:px-8"
            >
              <p className="text-4xl font-bold tracking-tight text-indigo sm:text-5xl">{row.v}</p>
              <p className="mt-4 text-[15px] font-semibold tracking-tight text-ink">{row.k}</p>
              <p className="mt-1 text-[14px] leading-relaxed text-muted">{row.l}</p>
            </article>
          ))}
        </div>
      </section>

      <section className="bg-page">
        <div className="mx-auto max-w-6xl px-4 py-16">
          <div className="text-center">
            <p className="inline-flex rounded-full bg-indigo-soft px-3 py-1 text-[12px] font-semibold text-indigo">
              {MARKET_HALL_TITLE}
            </p>
            <h2 className="mt-4 text-3xl font-bold tracking-tight text-ink sm:text-4xl">
              Portefeuilles <span className="text-indigo">disponibles</span>
            </h2>
            <p className="mx-auto mt-3 max-w-2xl text-[15px] text-muted">
              Prenez position sur les dossiers ouverts. Les critères détaillés se
              règlent dans votre compte, pas sur la page publique.
            </p>
          </div>
          {preview.length === 0 ? (
            <p className="mt-10 rounded-3xl border border-line bg-paper p-8 text-center text-[15px] text-muted">
              Aucun portefeuille publié pour le moment.
            </p>
          ) : (
            <div className="mt-10 -mx-4 overflow-x-auto px-4 pb-2">
              <ul className="flex gap-4">
                {preview.map((item) => (
                  <li key={item.id}>
                    <ListingRecordCard item={item} />
                  </li>
                ))}
              </ul>
            </div>
          )}
          <div className="mt-8 flex flex-wrap justify-center gap-3">
            <Button asChild variant="primary">
              <Link href="/annonces">{CTA_BROWSE}</Link>
            </Button>
            <Button asChild variant="outline">
              <Link href="/ceder">{CTA_SELL}</Link>
            </Button>
          </div>
        </div>
      </section>

      <section className="bg-paper">
        <div className="mx-auto grid max-w-6xl gap-8 px-4 py-16 lg:grid-cols-2">
          <article className="rounded-[1.75rem] border border-line bg-page p-8 sm:p-10">
            <h2 className="text-4xl font-bold tracking-tight text-ink sm:text-5xl">
              Vendre
            </h2>
            <p className="mt-3 text-xl font-semibold tracking-tight text-indigo">
              un portefeuille, dans un cadre sécurisé
            </p>
            <ol className="mt-8 space-y-5">
              {SELL_PILLARS.map((item, index) => (
                <li key={item.title} className="flex gap-4">
                  <span className="tabular shrink-0 text-[13px] font-bold text-indigo">
                    {String(index + 1).padStart(2, "0")}
                  </span>
                  <div>
                    <p className="text-[16px] font-semibold text-ink">{item.title}</p>
                    <p className="mt-1 text-[15px] leading-relaxed text-muted">{item.body}</p>
                  </div>
                </li>
              ))}
            </ol>
            <Button asChild variant="primary" className="mt-8">
              <Link href={ADVISOR_BOOKING_HREF}>{CTA_ADVISOR}</Link>
            </Button>
          </article>
          <article className="rounded-[1.75rem] border border-line bg-page p-8 sm:p-10">
            <h2 className="text-4xl font-bold tracking-tight text-ink sm:text-5xl">
              Acheter
            </h2>
            <p className="mt-3 text-xl font-semibold tracking-tight text-indigo">
              un portefeuille, en positionnant votre offre
            </p>
            <ul className="mt-8 space-y-3 text-[15px] text-ink">
              {BUY_POINTS.map((item) => (
                <li key={item} className="flex items-start gap-3">
                  <span className="mt-1 text-indigo">
                    <CheckIcon />
                  </span>
                  {item}
                </li>
              ))}
            </ul>
            <Button asChild variant="outline" className="mt-8">
              <Link href="/annonces">{CTA_BROWSE}</Link>
            </Button>
          </article>
        </div>
      </section>

      <section className="bg-page">
        <div className="mx-auto max-w-6xl px-4 py-16">
          <div className="text-center">
            <p className="text-[13px] font-semibold uppercase tracking-[0.18em] text-indigo">
              {TAKE_POSITION}
            </p>
            <h2 className="mt-3 text-4xl font-bold tracking-tight text-ink sm:text-5xl">
              Entrez sur la salle de marché
            </h2>
            <p className="mx-auto mt-4 max-w-2xl text-[16px] leading-relaxed text-muted">
              Consultez les portefeuilles disponibles et déposez le vôtre.
            </p>
          </div>
          <div className="mx-auto mt-10 grid max-w-4xl gap-6 md:grid-cols-2">
            <article className="rounded-[1.75rem] border border-line bg-paper p-8">
              <h3 className="text-xl font-bold text-ink">{NO_FEE_LABEL}</h3>
              <p className="mt-3 text-[15px] leading-relaxed text-muted">
                Déposez votre portefeuille sans frais, ou parcourez ceux qui sont
                ouverts avant de vous décider.
              </p>
              {/*
                Les deux actions demandées, dans cet ordre. L'entretien reste
                offert en dessous : c'est le chemin le plus utile à qui dépose,
                mais il ne doit pas prendre la place des deux premières.
              */}
              <div className="mt-8 flex flex-col gap-3">
                <Button asChild variant="primary">
                  <Link href="/ceder">{CTA_DEPOSIT}</Link>
                </Button>
                <Button asChild variant="outline">
                  <Link href="/annonces">{CTA_CONSULT}</Link>
                </Button>
                <Link
                  href={ADVISOR_BOOKING_HREF}
                  className="mt-1 text-center text-[14px] font-medium text-indigo underline underline-offset-2"
                >
                  {CTA_ADVISOR}
                </Link>
              </div>
            </article>
            <article className="rounded-[1.75rem] border border-indigo bg-indigo-soft/50 p-8">
              <p className="tabular text-[28px] font-bold tracking-tight text-indigo sm:text-4xl">
                {ACCESS_PRICE_LINE}
              </p>
              <ul className="mt-6 space-y-3 text-[15px] text-ink">
                {ACCESS_MARKET_POINTS.map((item) => (
                  <li key={item} className="flex items-start gap-3">
                    <span className="mt-1 text-indigo">
                      <CheckIcon />
                    </span>
                    {item}
                  </li>
                ))}
              </ul>
              <Button asChild variant="primary" className="mt-8">
                <Link href="/tarifs">S’abonner</Link>
              </Button>
            </article>
          </div>
          <p className="mx-auto mt-6 max-w-2xl text-center text-[12px] text-muted">
            * Délai constaté sur les cessions accompagnées. Il ne constitue pas
            une garantie de délai.
          </p>
        </div>
      </section>

      <section className="bg-indigo px-4 py-16 text-white">
        <div className="mx-auto max-w-4xl text-center">
          <h2 className="text-3xl font-bold tracking-tight sm:text-4xl">
            {TAKE_POSITION}
          </h2>
          <p className="mx-auto mt-4 max-w-xl text-[15px] text-white/85">
            Mettez en vente ou consultez les portefeuilles disponibles.
          </p>
          <div className="mt-8 flex flex-wrap justify-center gap-3">
            <Link
              href="/ceder"
              className="rounded-full bg-white px-6 py-3 text-[15px] font-semibold text-indigo hover:bg-surface-alt"
            >
              {CTA_SELL}
            </Link>
            <Link
              href="/annonces"
              className="rounded-full border border-white/40 px-6 py-3 text-[15px] font-semibold text-white hover:bg-white/10"
            >
              {CTA_BROWSE}
            </Link>
          </div>
        </div>
      </section>
    </main>
  );
}
