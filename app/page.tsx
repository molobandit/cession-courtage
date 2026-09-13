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
  BUY_KICKER,
  BUY_LEDE,
  BUY_REASSURANCE,
  BUY_TITLE,
  SELL_KICKER,
  SELL_LEDE,
  SELL_REASSURANCE,
  SELL_TITLE,
  HERO_HEADLINE,
  HERO_HEADLINE_REST,
  HERO_LEDE,
  HERO_PROOFS,
  HERO_TITLE,
  MARKET_ACCESS,
  MARKET_HALL_TITLE,
  NAV_BUY,
  NAV_INVESTOR,
  NAV_SELL,
  NO_FEE_LABEL,
  MARKET_FIGURES,
  MARKET_FIGURES_KICKER,
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

/** Pictogramme d'une carte du bandeau. Trait, pas aplat : il accompagne le chiffre sans lui voler la vedette. */
function FigureIcon({ name }: { name: "tag" | "clock" | "shield" }) {
  const trace =
    name === "tag" ? (
      <>
        <path d="M3 12V4a1 1 0 0 1 1-1h8l9 9-9 9-9-9Z" />
        <circle cx="7.5" cy="7.5" r="1.5" />
      </>
    ) : name === "clock" ? (
      <>
        <circle cx="12" cy="12" r="9" />
        <path d="M12 7v5l3 2" />
      </>
    ) : (
      <>
        <path d="M12 3 4 6v6c0 5 3.5 8 8 9 4.5-1 8-4 8-9V6l-8-3Z" />
        <path d="m8.5 12 2.5 2.5 4.5-5" />
      </>
    );
  return (
    <span className="inline-flex h-11 w-11 items-center justify-center rounded-xl bg-indigo/20 text-indigo-line">
      <svg
        viewBox="0 0 24 24"
        className="h-5 w-5"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
        aria-hidden="true"
      >
        {trace}
      </svg>
    </span>
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
          <div className="min-w-0">
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
            <ul className="mt-7 grid max-w-xl gap-2.5">
              {HERO_PROOFS.map((proof) => (
                <li key={proof} className="flex items-start gap-2.5 text-[15px] leading-snug text-ink">
                  <span className="mt-0.5 shrink-0 text-indigo">
                    <CheckIcon />
                  </span>
                  {proof}
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

      {/*
        Bandeau sombre, seule rupture de valeur de la page : c'est elle qui
        donne envie de continuer a descendre.

        Trois cartes, chacune avec sa place. Etales sur toute la largeur, les
        chiffres flottaient sans se repondre ; serres au centre, ils se
        marchaient dessus. Une carte par chiffre regle les deux : l'espace est
        genereux, mais chaque chiffre a un cadre qui le tient, et l'icone dit
        de quoi il parle avant meme qu'on lise le libelle.
      */}
      <section className="relative overflow-hidden bg-ink">
        <div className="pointer-events-none absolute -left-24 -top-28 h-72 w-72 rounded-full bg-indigo/25 blur-3xl" />
        <div className="pointer-events-none absolute -bottom-28 right-0 h-64 w-64 rounded-full bg-indigo/20 blur-3xl" />
        <div className="relative mx-auto max-w-5xl px-4 py-14 sm:py-16">
          <p className="text-center text-[11px] font-semibold uppercase tracking-[0.24em] text-indigo-line">
            {MARKET_FIGURES_KICKER}
          </p>
          <dl className="mt-9 grid gap-4 sm:grid-cols-3 sm:gap-5">
            {MARKET_FIGURES.map((row) => (
              <div
                key={row.figure}
                className="rounded-2xl border border-white/10 bg-white/[0.05] p-6 sm:p-7"
              >
                <FigureIcon name={row.icon} />
                <dd className="mt-5 text-[2.75rem] font-bold leading-none tracking-tight text-white sm:text-[3.25rem]">
                  {row.figure}
                </dd>
                <dt className="mt-4 text-[13px] font-semibold uppercase tracking-[0.12em] text-indigo-line">
                  {row.label}
                </dt>
                <p className="mt-1.5 text-[14px] leading-snug text-white/65">{row.note}</p>
              </div>
            ))}
          </dl>
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
            <p className="text-[12px] font-semibold uppercase tracking-[0.16em] text-indigo">
              {SELL_KICKER}
            </p>
            <h2 className="mt-3 text-[1.75rem] font-bold leading-[1.15] tracking-tight text-ink sm:text-4xl">
              {SELL_TITLE}
            </h2>
            <p className="mt-4 text-[16px] leading-relaxed text-muted">{SELL_LEDE}</p>
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
            <p className="mt-8 rounded-xl bg-indigo-soft/60 px-4 py-3 text-[14px] font-medium text-indigo-dark">
              {SELL_REASSURANCE}
            </p>
            <Button asChild variant="primary" className="mt-6">
              <Link href={ADVISOR_BOOKING_HREF}>{CTA_ADVISOR}</Link>
            </Button>
          </article>
          <article className="rounded-[1.75rem] border border-line bg-page p-8 sm:p-10">
            <p className="text-[12px] font-semibold uppercase tracking-[0.16em] text-indigo">
              {BUY_KICKER}
            </p>
            <h2 className="mt-3 text-[1.75rem] font-bold leading-[1.15] tracking-tight text-ink sm:text-4xl">
              {BUY_TITLE}
            </h2>
            <p className="mt-4 text-[16px] leading-relaxed text-muted">{BUY_LEDE}</p>
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
            <p className="mt-8 rounded-xl bg-indigo-soft/60 px-4 py-3 text-[14px] font-medium text-indigo-dark">
              {BUY_REASSURANCE}
            </p>
            <Button asChild variant="primary" className="mt-6">
              <Link href="/annonces">{CTA_BROWSE}</Link>
            </Button>
          </article>
        </div>
      </section>

      <section className="bg-page">
        <div className="mx-auto max-w-6xl px-4 py-16">
          {/*
            Meme traitement que « Portefeuilles disponibles » : pastille,
            titre en deux tons, chapo court. Ce titre montait a text-5xl, soit
            la taille du titre de la page : un titre de section qui egale le
            titre du document efface la hierarchie au lieu de l'affirmer. Son
            chapo reprenait en plus « Prenez position. », deja dans le H1 et
            dans la section finale — trois fois sur une meme page, la phrase
            n'etait plus une signature mais un tic. Elle ne reste qu'a la fin,
            ou elle ferme ce que le H1 ouvre.
          */}
          <div className="text-center">
            <p className="inline-flex rounded-full bg-indigo-soft px-3 py-1 text-[12px] font-semibold text-indigo">
              {MARKET_ACCESS}
            </p>
            <h2 className="mt-4 text-3xl font-bold tracking-tight text-ink sm:text-4xl">
              Entrez sur <span className="text-indigo">la salle de marché</span>
            </h2>
            <p className="mx-auto mt-3 max-w-2xl text-[15px] text-muted">
              Déposez votre portefeuille, ou consultez ceux qui sont ouverts.
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
                Deux actions, pas trois. Le lien vers l'entretien conseiller
                occupait ici une troisieme ligne ; il reste offert en gros
                bouton sur la carte « Vendre » juste au-dessus et dans le pied
                de page, la ou il est cherche.
              */}
              <div className="mt-8 flex flex-col gap-3">
                <Button asChild variant="primary">
                  <Link href="/ceder">{CTA_DEPOSIT}</Link>
                </Button>
                <Button asChild variant="outline">
                  <Link href="/annonces">{CTA_CONSULT}</Link>
                </Button>
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
