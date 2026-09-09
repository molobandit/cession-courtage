import type { Metadata } from "next";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { ListingAdRow } from "@/components/listing/listing-ad-row";
import {
  GROWTH_PLAN_ANNUAL_EUR,
  INTEREST_DEPOSIT_LABEL,
  SUCCESS_FEE_RATE,
} from "@/lib/billing/rates";
import { OFFER_WINDOW_DAYS } from "@/lib/listing/constants";
import { loadPublicListingCards } from "@/lib/listing/load-public-cards";
import { BRAND_NAME } from "@/lib/site";

export const metadata: Metadata = {
  title: "Acheter ou vendre un portefeuille de courtage",
  description:
    "Place de marché B2B réservée aux courtiers ORIAS. Annonces anonymes, offres scellées, portefeuilles certifiés et honoraires de 8 % HT au succès.",
  alternates: { canonical: "/" },
};

const FEE_LABEL = `${(SUCCESS_FEE_RATE * 100).toLocaleString("fr-FR")} % HT`;

const AUDIENCES = [
  {
    href: "/ceder",
    title: "Je vends",
    body: "Déposez une annonce sous alias. Vous restez invisible jusqu’à la lettre d’intention.",
  },
  {
    href: "/annonces",
    title: "Je recherche",
    body: "Parcourez les portefeuilles publiés. Filtrez par zone, compagnie, branche et budget.",
  },
  {
    href: "/investisseurs",
    title: "Je suis investisseur",
    body: "Indiquez votre ticket et vos zones. Nous vous présentons les dossiers correspondants.",
  },
];

export default async function HomePage() {
  const listings = await loadPublicListingCards();
  const latest = listings.slice(0, 6);

  return (
    <main>
      <section className="border-b border-line bg-paper">
        <div className="mx-auto max-w-3xl px-4 py-16 text-center sm:py-20">
          <p className="text-[13px] font-medium uppercase tracking-[0.18em] text-indigo-dark">
            Réservé aux courtiers ORIAS
          </p>
          <h1 className="mt-4 font-serif text-4xl font-semibold leading-tight text-ink sm:text-5xl">
            Achetez ou vendez votre portefeuille simplement.
          </h1>
          <p className="mx-auto mt-5 max-w-xl text-lg leading-relaxed text-muted">
            {BRAND_NAME} met en relation cédants, acquéreurs et investisseurs.
            Annonce anonyme, offres scellées {OFFER_WINDOW_DAYS} jours, honoraires de{" "}
            {FEE_LABEL} au succès.
          </p>
          <div className="mt-8 flex flex-wrap justify-center gap-3">
            <Button asChild variant="primary" size="lg">
              <Link href="/ceder">Je vends</Link>
            </Button>
            <Button asChild variant="outline" size="lg">
              <Link href="/annonces">Je recherche</Link>
            </Button>
            <Button asChild variant="outline" size="lg">
              <Link href="/investisseurs">Je suis investisseur</Link>
            </Button>
          </div>

          <form action="/annonces" method="get" className="mx-auto mt-10 flex max-w-xl gap-2">
            <label htmlFor="home-zone" className="sr-only">
              Rechercher une zone
            </label>
            <input
              id="home-zone"
              name="zone"
              placeholder="Département, région, Île-de-France…"
              className="h-12 flex-1 rounded-full border border-line bg-surface-alt px-5 text-[15px] text-ink"
            />
            <Button type="submit" variant="primary" size="lg">
              Rechercher
            </Button>
          </form>
        </div>
      </section>

      <section className="mx-auto max-w-4xl px-4 py-12">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <h2 className="font-serif text-2xl font-semibold text-ink">Dernières annonces</h2>
            <p className="mt-1 text-[15px] text-muted">
              Fiches anonymes. Ni raison sociale, ni commune.
            </p>
          </div>
          <Link
            href="/annonces"
            className="text-[15px] font-medium text-indigo-dark underline-offset-4 hover:underline"
          >
            Voir toutes les annonces
          </Link>
        </div>
        {latest.length === 0 ? (
          <p className="mt-6 rounded-3xl border border-line bg-paper p-8 text-[15px] text-muted">
            Aucun dossier publié pour le moment. Déposez une annonce ou un mandat
            d’achat pour être prévenu dès qu’un portefeuille correspondant est en
            ligne.
          </p>
        ) : (
          <ul className="mt-6 overflow-hidden rounded-3xl border border-line bg-paper">
            {latest.map((item) => (
              <ListingAdRow key={item.id} item={item} />
            ))}
          </ul>
        )}
      </section>

      <section className="border-y border-line bg-surface-alt">
        <div className="mx-auto grid max-w-6xl gap-6 px-4 py-12 lg:grid-cols-3">
          {AUDIENCES.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className="rounded-3xl border border-line bg-paper p-7 transition-colors hover:border-indigo"
            >
              <h2 className="font-serif text-xl font-semibold text-ink">{item.title}</h2>
              <p className="mt-3 text-[15px] leading-relaxed text-muted">{item.body}</p>
            </Link>
          ))}
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-4 py-16">
        <h2 className="font-serif text-3xl font-semibold text-ink">Comment ça se passe</h2>
        <ol className="mt-8 grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
          {[
            {
              n: "1",
              t: "Vous publiez",
              b: "Import anonymisé, fourchette justifiée, alias Portefeuille #NNNNN.",
            },
            {
              n: "2",
              t: "Les offres restent masquées",
              b: `${OFFER_WINDOW_DAYS} jours d’offres scellées. Tout s’ouvre en même temps à la clôture.`,
            },
            {
              n: "3",
              t: "Vous choisissez",
              b: `Un dépôt de ${INTEREST_DEPOSIT_LABEL} du prix demandé dévoile les coordonnées. Aucun encaissement en démo.`,
            },
            {
              n: "4",
              t: "Le dossier se déroule",
              b: "Confidentialité, salle de données, lettre d’intention, séquestre, transfert ORIAS.",
            },
          ].map((step) => (
            <li key={step.n} className="rounded-3xl border border-line bg-paper p-6">
              <span className="tabular inline-flex h-9 w-9 items-center justify-center rounded-full bg-indigo text-sm font-semibold text-white">
                {step.n}
              </span>
              <h3 className="mt-4 font-serif text-lg font-semibold text-ink">{step.t}</h3>
              <p className="mt-2 text-[15px] leading-relaxed text-muted">{step.b}</p>
            </li>
          ))}
        </ol>
      </section>

      <section className="border-y border-line bg-indigo-soft">
        <div className="mx-auto grid max-w-6xl gap-10 px-4 py-14 lg:grid-cols-2 lg:items-center">
          <div>
            <h2 className="font-serif text-3xl font-semibold text-ink">
              Annonce simple ou portefeuille certifié
            </h2>
            <p className="mt-4 max-w-lg text-[15px] leading-relaxed text-muted">
              Une annonce simple se publie vite, sous alias. Un portefeuille
              certifié a fait l’objet d’une revue interne : mix, compagnies,
              commissions, précompte. Le badge est visible dans le catalogue.
            </p>
            <Button asChild variant="primary" className="mt-6">
              <Link href="/certification">Comprendre la certification</Link>
            </Button>
          </div>
          <dl className="rounded-3xl border border-line bg-paper p-7">
            {[
              { t: "Honoraires à la vente", v: FEE_LABEL },
              { t: "Dépôt pour les coordonnées", v: INTEREST_DEPOSIT_LABEL },
              { t: "Abonnement acquéreur", v: `${GROWTH_PLAN_ANNUAL_EUR} € HT / an` },
              { t: "Valorisation et annonce", v: "Gratuit" },
            ].map((row, index) => (
              <div
                key={row.t}
                className={
                  index === 0
                    ? "flex items-baseline justify-between gap-4 pb-3"
                    : "flex items-baseline justify-between gap-4 border-t border-line py-3 last:pb-0"
                }
              >
                <dt className="text-[15px] text-muted">{row.t}</dt>
                <dd className="tabular font-serif text-lg font-semibold text-ink">{row.v}</dd>
              </div>
            ))}
          </dl>
        </div>
      </section>
    </main>
  );
}
