import type { Metadata } from "next";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { HomeHeroVisual } from "@/components/home/hero-visual";
import { ListingAdCard } from "@/components/listing/listing-ad-card";
import {
  GROWTH_PLAN_ANNUAL_EUR,
  INTEREST_DEPOSIT_LABEL,
  SIMPLE_FEE_LABEL,
  VERIFIED_FEE_RANGE_LABEL,
} from "@/lib/billing/rates";
import { OFFER_WINDOW_DAYS } from "@/lib/listing/constants";
import { loadPublicListingCards } from "@/lib/listing/load-public-cards";
import { BRAND_NAME } from "@/lib/site";

export const metadata: Metadata = {
  title: "Achetez ou vendez votre portefeuille simplement",
  description:
    "Le Bon Portefeuille met en relation les professionnels qui souhaitent céder leur portefeuille avec ceux qui souhaitent en acquérir un, et avec les investisseurs.",
  alternates: { canonical: "/" },
};

const ADVANTAGES = [
  {
    t: "Portefeuilles à vendre",
    d: "Catalogue anonymisé, filtré par zone, branche et budget.",
  },
  {
    t: "Portefeuilles certifiés",
    d: "Revue interne des commissions, du mix et des compagnies.",
  },
  {
    t: "Mise en relation qualifiée",
    d: "Cédants, acquéreurs et investisseurs, sous alias.",
  },
  {
    t: "Due diligence",
    d: "Espace documentaire pour faire certifier un dossier.",
  },
  {
    t: "Transaction sécurisée",
    d: `Offres scellées, abonnement pour le détail, dépôt ${INTEREST_DEPOSIT_LABEL} pour l’identité, séquestre.`,
  },
  {
    t: "Opportunités d’investissement",
    d: "Ticket, zones et type d’intervention, sans donnée client final.",
  },
];

const FAQ = [
  {
    q: "Qui peut publier ou acheter ?",
    a: "Uniquement des courtiers immatriculés ORIAS. L’inscription est vérifiée avant l’espace membre.",
  },
  {
    q: "Mon nom apparaît-il sur l’annonce ?",
    a: `Non. L’annonce reste sous alias Portefeuille #NNNNN. Ni raison sociale, ni commune. Le vendeur reste anonyme jusqu’au dépôt de ${INTEREST_DEPOSIT_LABEL} du prix.`,
  },
  {
    q: "Quand payez-vous des honoraires ?",
    a: `Publier est gratuit. L’abonnement, à ${GROWTH_PLAN_ANNUAL_EUR.toLocaleString("fr-FR")} € HT par an, ouvre le détail de l’offre (contact, messages). L’option simple est à ${SIMPLE_FEE_LABEL} de commission. L’option vérifiée est à ${VERIFIED_FEE_RANGE_LABEL}.`,
  },
];

export default async function HomePage() {
  const listings = await loadPublicListingCards();
  const latest = listings.slice(0, 6);
  const preview = listings.slice(0, 9);

  return (
    <main>
      <section className="overflow-hidden bg-page">
        <div className="mx-auto grid max-w-6xl items-center gap-12 px-4 py-14 lg:grid-cols-2 lg:py-20 lg:pb-28">
          <div>
            <p className="inline-flex rounded-full border border-indigo-line bg-indigo-soft px-3 py-1 text-[12px] font-semibold text-indigo">
              Réservé aux courtiers ORIAS
            </p>
            <h1 className="mt-5 text-4xl font-bold leading-[1.15] tracking-tight text-ink sm:text-5xl">
              Achetez ou vendez votre portefeuille simplement.
            </h1>
            <p className="mt-5 max-w-lg text-[16px] leading-relaxed text-muted">
              {BRAND_NAME} met en relation les professionnels qui souhaitent céder
              leur portefeuille avec ceux qui souhaitent en acquérir un, et avec
              les investisseurs.
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              <Button asChild variant="primary" size="lg">
                <Link href="/ceder">Déposer une annonce</Link>
              </Button>
              <Button asChild variant="outline" size="lg">
                <Link href="/annonces">Voir les annonces</Link>
              </Button>
              <Button asChild variant="ghost" size="lg">
                <Link href="/investisseurs">Je suis investisseur</Link>
              </Button>
            </div>
            <form
              action="/annonces"
              method="get"
              className="mt-8 flex max-w-xl overflow-hidden rounded-full border border-line bg-surface shadow-sm"
            >
              <label htmlFor="home-zone" className="sr-only">
                Rechercher une zone
              </label>
              <input
                id="home-zone"
                name="zone"
                placeholder="Département, région…"
                className="h-12 flex-1 bg-transparent px-5 text-[15px] text-ink outline-none"
              />
              <Button type="submit" variant="primary" className="m-1 h-10 rounded-full px-5">
                Rechercher
              </Button>
            </form>
          </div>
          <HomeHeroVisual listings={latest} />
        </div>
      </section>

      <section className="bg-surface">
        <div className="mx-auto max-w-6xl px-4 py-16">
          <div className="text-center">
            <h2 className="text-3xl font-bold tracking-tight text-ink">Nos dernières annonces</h2>
            <p className="mt-2 text-[15px] text-muted">
              Fiches anonymes. Ni raison sociale, ni commune.
            </p>
          </div>
          {preview.length === 0 ? (
            <p className="mt-8 rounded-2xl border border-line bg-page p-8 text-center text-[15px] text-muted">
              Aucun dossier publié pour le moment. Déposez une annonce pour apparaître ici.
            </p>
          ) : (
            <ul className="mt-10 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
              {preview.map((item) => (
                <ListingAdCard key={item.id} item={item} />
              ))}
            </ul>
          )}
          <div className="mt-8 text-center">
            <Button asChild variant="outline">
              <Link href="/annonces">Voir les annonces</Link>
            </Button>
          </div>
        </div>
      </section>

      <section className="border-t border-line bg-page">
        <div className="mx-auto max-w-6xl px-4 py-16">
          <h2 className="text-center text-3xl font-bold tracking-tight text-ink">
            Services pour céder ou acquérir
          </h2>
          <p className="mx-auto mt-3 max-w-2xl text-center text-[15px] leading-relaxed text-muted">
            Annonce simple ou portefeuille certifié, recherche ciblée, et accès
            investisseurs, toujours sous alias.
          </p>
          <div className="mt-10 grid gap-6 lg:grid-cols-3">
            <article className="rounded-3xl border border-line bg-surface p-8 shadow-sm">
              <h3 className="text-xl font-bold text-ink">Vous vendez votre portefeuille ?</h3>
              <p className="mt-3 text-[15px] leading-relaxed text-muted">
                Déposez une annonce détaillée. Publication sous alias, fourchette
                justifiée, offres visibles à la clôture.
              </p>
              <Button asChild variant="primary" className="mt-6">
                <Link href="/ceder">Déposer une annonce</Link>
              </Button>
            </article>
            <article className="rounded-3xl border border-line bg-surface p-8 shadow-sm">
              <h3 className="text-xl font-bold text-ink">Vous recherchez un portefeuille ?</h3>
              <p className="mt-3 text-[15px] leading-relaxed text-muted">
                Consultez les fiches, filtrez par zone et branche. Un abonnement
                de {GROWTH_PLAN_ANNUAL_EUR.toLocaleString("fr-FR")} € HT par an
                ouvre le contact. Le vendeur reste anonyme jusqu’au dépôt de{" "}
                {INTEREST_DEPOSIT_LABEL}.
              </p>
              <Button asChild variant="outline" className="mt-6">
                <Link href="/annonces">Consulter les annonces</Link>
              </Button>
            </article>
            <article className="rounded-3xl border border-line bg-surface p-8 shadow-sm">
              <h3 className="text-xl font-bold text-ink">Vous êtes investisseur ?</h3>
              <p className="mt-3 text-[15px] leading-relaxed text-muted">
                Indiquez votre ticket et vos zones. Nous vous présentons les dossiers
                correspondants, toujours sous alias.
              </p>
              <Button asChild variant="outline" className="mt-6">
                <Link href="/investisseurs">Je suis investisseur</Link>
              </Button>
            </article>
          </div>
        </div>
      </section>

      <section className="bg-surface">
        <div className="mx-auto max-w-6xl px-4 py-16">
          <h2 className="text-center text-3xl font-bold tracking-tight text-ink">
            Pourquoi {BRAND_NAME} ?
          </h2>
          <p className="mx-auto mt-3 max-w-2xl text-center text-[15px] text-muted">
            Du dépôt d’annonce à la mise en relation, tout reste sous alias. Le détail de l’offre passe par l’abonnement. L’identité du vendeur, par le dépôt de {INTEREST_DEPOSIT_LABEL}.
          </p>
          <div className="mt-10 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {ADVANTAGES.map((item, i) => (
              <article key={item.t} className="rounded-3xl border border-line bg-page p-6">
                <span className="inline-flex h-9 w-9 items-center justify-center rounded-full bg-indigo text-sm font-semibold text-white">
                  {i + 1}
                </span>
                <h3 className="mt-4 text-[16px] font-semibold text-ink">{item.t}</h3>
                <p className="mt-2 text-[14px] leading-relaxed text-muted">{item.d}</p>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section className="border-y border-line bg-page">
        <div className="mx-auto max-w-6xl px-4 py-16">
          <h2 className="text-center text-3xl font-bold tracking-tight text-ink">Comment ça se passe</h2>
          <ol className="mt-10 grid gap-6 md:grid-cols-3">
            {[
              {
                n: "1",
                t: "Vous publiez",
                b: "Bordereau anonymisé, alias Portefeuille #NNNNN, fourchette de prix.",
              },
              {
                n: "2",
                t: "Les offres restent masquées",
                b: `${OFFER_WINDOW_DAYS} jours d’offres scellées. Tout s’ouvre en même temps.`,
              },
              {
                n: "3",
                t: "Vous choisissez",
                b: `Abonnement pour le détail de l’offre, dépôt de ${INTEREST_DEPOSIT_LABEL} pour l’identité, puis séquestre et ORIAS.`,
              },
            ].map((step) => (
              <li key={step.n} className="rounded-3xl border border-line bg-surface p-7">
                <span className="inline-flex h-9 w-9 items-center justify-center rounded-full bg-indigo text-sm font-semibold text-white">
                  {step.n}
                </span>
                <h3 className="mt-4 text-[17px] font-semibold text-ink">{step.t}</h3>
                <p className="mt-2 text-[15px] leading-relaxed text-muted">{step.b}</p>
              </li>
            ))}
          </ol>
        </div>
      </section>

      <section className="bg-surface">
        <div className="mx-auto grid max-w-6xl gap-10 px-4 py-16 lg:grid-cols-2 lg:items-center">
          <div>
            <h2 className="text-3xl font-bold tracking-tight text-ink">Des tarifs lisibles</h2>
            <p className="mt-4 max-w-lg text-[15px] leading-relaxed text-muted">
              Publier et consulter sont gratuits. L’abonnement, à{" "}
              {GROWTH_PLAN_ANNUAL_EUR.toLocaleString("fr-FR")} € HT par an, ouvre
              le détail de l’offre (contact, messages). Le vendeur reste anonyme
              jusqu’au dépôt de {INTEREST_DEPOSIT_LABEL}. Option simple sans
              commission, ou option vérifiée ({VERIFIED_FEE_RANGE_LABEL}).
            </p>
            <div className="mt-6 flex flex-wrap gap-3">
              <Button asChild variant="outline">
                <Link href="/tarifs">Voir les tarifs</Link>
              </Button>
              <Button asChild variant="ghost">
                <Link href="/certification">La certification</Link>
              </Button>
            </div>
          </div>
          <dl className="rounded-3xl border border-line bg-page p-6">
            {[
              { t: "Publier / consulter", v: "Gratuit" },
              { t: "Détail de l’offre", v: `${GROWTH_PLAN_ANNUAL_EUR.toLocaleString("fr-FR")} € HT / an` },
              { t: "Identité du vendeur", v: `Dépôt ${INTEREST_DEPOSIT_LABEL}` },
              { t: "Option vérifiée", v: VERIFIED_FEE_RANGE_LABEL },
            ].map((row) => (
              <div
                key={row.t}
                className="flex items-baseline justify-between gap-4 border-b border-line py-3 first:pt-0 last:border-0 last:pb-0"
              >
                <dt className="text-[15px] text-muted">{row.t}</dt>
                <dd className="tabular text-[15px] font-semibold text-ink">{row.v}</dd>
              </div>
            ))}
          </dl>
        </div>
      </section>

      <section className="border-t border-line bg-page">
        <div className="mx-auto max-w-6xl px-4 py-16">
          <h2 className="text-center text-3xl font-bold tracking-tight text-ink">
            Questions fréquentes
          </h2>
          <ul className="mx-auto mt-10 max-w-3xl divide-y divide-line overflow-hidden rounded-3xl border border-line bg-surface">
            {FAQ.map((item) => (
              <li key={item.q} className="px-6 py-5">
                <h3 className="text-[16px] font-semibold text-ink">{item.q}</h3>
                <p className="mt-2 text-[15px] leading-relaxed text-muted">{item.a}</p>
              </li>
            ))}
          </ul>
        </div>
      </section>

      <section className="bg-indigo px-4 py-14 text-white">
        <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-6">
          <div>
            <h2 className="text-3xl font-bold tracking-tight">
              Prêt à vendre ou à acheter un portefeuille ?
            </h2>
            <p className="mt-3 max-w-xl text-[15px] text-white/85">
              Compte ORIAS, annonce sous alias, catalogue en ligne. Aucun paiement
              réel en démo.
            </p>
          </div>
          <div className="flex flex-wrap gap-3">
            <Link
              href="/ceder"
              className="rounded-full bg-white px-6 py-3 text-[15px] font-semibold text-indigo hover:bg-surface-alt"
            >
              Déposer une annonce
            </Link>
            <Link
              href="/annonces"
              className="rounded-full border border-white/40 px-6 py-3 text-[15px] font-semibold text-white hover:bg-white/10"
            >
              Voir les annonces
            </Link>
          </div>
        </div>
      </section>
    </main>
  );
}
