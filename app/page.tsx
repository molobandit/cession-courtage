import type { Metadata } from "next";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { HomeHeroVisual } from "@/components/home/hero-visual";
import { ListingRecordCard } from "@/components/home/listing-record-card";
import { MandateRecordCard } from "@/components/home/mandate-record-card";
import { listPublicMandates } from "@/lib/authz";
import {
  GROWTH_PLAN_ANNUAL_EUR,
  INTEREST_DEPOSIT_LABEL,
  SIMPLE_FEE_LABEL,
  VERIFIED_FEE_RANGE_LABEL,
} from "@/lib/billing/rates";
import { asStringArray } from "@/lib/json-array";
import { FINANCING_LABELS, RISK_TYPE_LABELS, SEGMENT_LABELS } from "@/lib/labels";
import { OFFER_WINDOW_DAYS } from "@/lib/listing/constants";
import { loadPublicListingCards } from "@/lib/listing/load-public-cards";
import type { PublicMandateCard } from "@/lib/mandate/public";
import { SIGNUP_WHO_CAN } from "@/lib/copy/audience";
import { BRAND_NAME } from "@/lib/site";

export const metadata: Metadata = {
  title: "Achetez ou vendez votre portefeuille simplement",
  description:
    "Le Bon Portefeuille met en relation les professionnels qui souhaitent céder leur portefeuille avec ceux qui souhaitent en acquérir un, et avec les investisseurs.",
  alternates: { canonical: "/" },
};

const CHECKS = ["Courtiers ORIAS et investisseurs", "Alias jusqu’au dépôt", "Offres scellées 21 jours"];

const FAQ = [
  {
    q: "Qui peut publier ou acheter ?",
    a: SIGNUP_WHO_CAN,
  },
  {
    q: "Mon nom apparaît-il sur l’annonce ?",
    a: `Non. L’annonce reste sous la référence Dossier n° NNNNN. Ni raison sociale, ni commune. Le vendeur reste anonyme jusqu’au dépôt de ${INTEREST_DEPOSIT_LABEL} du prix.`,
  },
  {
    q: "Quand payez-vous des honoraires ?",
    a: `Publier est gratuit. L’abonnement, à ${GROWTH_PLAN_ANNUAL_EUR.toLocaleString("fr-FR")} € HT par an, ouvre le détail de l’offre (contact, messages). L’option simple est à ${SIMPLE_FEE_LABEL} de commission. L’option vérifiée est à ${VERIFIED_FEE_RANGE_LABEL}.`,
  },
];

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

export default async function HomePage() {
  const [listings, mandateRows] = await Promise.all([loadPublicListingCards(), listPublicMandates()]);
  const latest = listings.slice(0, 3);
  const preview = listings.slice(0, 8);
  const mandates: PublicMandateCard[] = mandateRows.slice(0, 3).map((m) => {
    const zones = asStringArray(m.zones);
    return {
      id: m.id,
      publicNumber: m.publicNumber ?? 0,
      buyerAlias: m.buyer.publicAlias,
      maxBudget: Number(m.maxBudget),
      minCommissions: Number(m.minCommissions),
      maxCommissions: Number(m.maxCommissions),
      riskTypes: asStringArray(m.riskTypes).map(
        (r) => RISK_TYPE_LABELS[r as keyof typeof RISK_TYPE_LABELS] ?? r,
      ),
      carriers: asStringArray(m.carriers),
      zones: zones.filter((z) => z !== "NATIONAL"),
      clientSegments: asStringArray(m.clientSegments).map(
        (s) => SEGMENT_LABELS[s as keyof typeof SEGMENT_LABELS] ?? s,
      ),
      financingLabel: FINANCING_LABELS[m.financingMode] ?? "Non précisé",
      isNationwide: zones.includes("NATIONAL"),
    };
  });

  return (
    <main>
      <section className="relative overflow-hidden bg-page">
        <div className="pointer-events-none absolute -left-24 top-10 h-56 w-56 rounded-full bg-indigo-soft" />
        <div className="pointer-events-none absolute -right-16 top-32 h-40 w-40 rounded-full bg-indigo-soft/80" />
        <div className="relative mx-auto grid max-w-6xl items-center gap-12 px-4 py-14 lg:grid-cols-[1.05fr_0.95fr] lg:py-20">
          <div>
            <p className="inline-flex items-center gap-1.5 rounded-full border border-indigo-line bg-indigo-soft px-3 py-1 text-[12px] font-semibold text-indigo">
              <CheckIcon />
              Courtiers ORIAS et investisseurs
            </p>
            <h1 className="mt-6 text-4xl font-bold leading-[1.12] tracking-tight text-ink sm:text-5xl">
              Achetez ou vendez votre portefeuille{" "}
              <span className="text-indigo">simplement.</span>
            </h1>
            <p className="mt-5 max-w-lg text-[16px] leading-relaxed text-muted">
              {BRAND_NAME} met en relation cédants, acquéreurs et investisseurs.
              Les dossiers restent sous alias. Aucune donnée nominative de client
              final.
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
                <Link href="/ceder">Je vends mon portefeuille</Link>
              </Button>
              <Button asChild variant="outline" size="lg">
                <Link href="/annonces">Je recherche un portefeuille</Link>
              </Button>
            </div>
            <p className="mt-3">
              <Link
                href="/investisseurs/opportunites"
                className="text-[14px] font-medium text-indigo underline-offset-2 hover:underline"
              >
                Je suis investisseur
              </Link>
            </p>
            <form
              action="/annonces"
              method="get"
              className="mt-8 flex max-w-xl overflow-hidden rounded-full border border-line bg-paper shadow-sm"
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

      <section className="border-y border-line bg-paper">
        <div className="mx-auto grid max-w-6xl gap-8 px-4 py-10 sm:grid-cols-3">
          {[
            { v: `${OFFER_WINDOW_DAYS} jours`, l: "d’offres scellées, ouvertes en même temps." },
            { v: INTEREST_DEPOSIT_LABEL, l: "pour ouvrir l’identité du cabinet cédant." },
            { v: "ORIAS", l: "vérifié avant l’espace membre. Alias jusqu’au dépôt." },
          ].map((row) => (
            <div key={row.v}>
              <p className="text-2xl font-bold tracking-tight text-indigo">{row.v}</p>
              <p className="mt-1 text-[14px] leading-relaxed text-muted">{row.l}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="bg-page">
        <div className="mx-auto max-w-6xl px-4 py-16">
          <div className="text-center">
            <p className="inline-flex rounded-full bg-indigo-soft px-3 py-1 text-[12px] font-semibold text-indigo">
              Catalogue
            </p>
            <h2 className="mt-4 text-3xl font-bold tracking-tight text-ink sm:text-4xl">
              Annonces de portefeuilles <span className="text-indigo">disponibles</span>
            </h2>
            <p className="mx-auto mt-3 max-w-2xl text-[15px] text-muted">
              Fiches anonymes de cédants et demandes d’acquéreurs. Ni raison sociale,
              ni commune.
            </p>
          </div>
          {preview.length === 0 && mandates.length === 0 ? (
            <p className="mt-10 rounded-3xl border border-line bg-paper p-8 text-center text-[15px] text-muted">
              Aucun dossier publié pour le moment. Déposez une annonce pour apparaître ici.
            </p>
          ) : (
            <div className="mt-10 -mx-4 overflow-x-auto px-4 pb-2">
              <ul className="flex gap-4">
                {preview.map((item) => (
                  <li key={item.id}>
                    <ListingRecordCard item={item} />
                  </li>
                ))}
                {mandates.map((item) => (
                  <li key={item.id}>
                    <MandateRecordCard item={item} />
                  </li>
                ))}
              </ul>
            </div>
          )}
          <div className="mt-8 flex flex-wrap justify-center gap-3">
            <Button asChild variant="primary">
              <Link href="/annonces">Voir toutes les annonces</Link>
            </Button>
            <Button asChild variant="outline">
              <Link href="/acquerir">Déposer une demande d’acquisition</Link>
            </Button>
          </div>
        </div>
      </section>

      <section className="bg-paper">
        <div className="mx-auto grid max-w-6xl gap-8 px-4 py-16 lg:grid-cols-2">
          <article className="rounded-[1.75rem] border border-line bg-page p-8 sm:p-10">
            <p className="text-[12px] font-semibold uppercase tracking-[0.14em] text-indigo">Vendre</p>
            <h2 className="mt-3 text-2xl font-bold tracking-tight text-ink sm:text-3xl">
              Cédez dans les meilleures conditions
            </h2>
            <p className="mt-4 text-[15px] leading-relaxed text-muted">
              Annonce sous alias, fourchette justifiée, fenêtre d’offres scellées.
              Vous comparez au même moment, sans course à l’identité.
            </p>
            <ul className="mt-6 space-y-2 text-[15px] text-ink">
              {["Publication gratuite", "Offres masquées 21 jours", "Séquestre après accord"].map(
                (item) => (
                  <li key={item} className="flex items-center gap-2">
                    <span className="text-indigo">
                      <CheckIcon />
                    </span>
                    {item}
                  </li>
                ),
              )}
            </ul>
            <Button asChild variant="primary" className="mt-8">
              <Link href="/ceder">Je vends mon portefeuille</Link>
            </Button>
          </article>
          <article className="rounded-[1.75rem] border border-line bg-page p-8 sm:p-10">
            <p className="text-[12px] font-semibold uppercase tracking-[0.14em] text-indigo">Acheter</p>
            <h2 className="mt-3 text-2xl font-bold tracking-tight text-ink sm:text-3xl">
              Recherchez un portefeuille en confiance
            </h2>
            <p className="mt-4 text-[15px] leading-relaxed text-muted">
              Filtrez par zone et branche. L’abonnement ouvre le contact. L’identité
              du cabinet cédant s’ouvre au dépôt de {INTEREST_DEPOSIT_LABEL}.
            </p>
            <ul className="mt-6 space-y-2 text-[15px] text-ink">
              {[
                `Abonnement ${GROWTH_PLAN_ANNUAL_EUR.toLocaleString("fr-FR")} € HT / an`,
                `Dépôt ${INTEREST_DEPOSIT_LABEL} pour le cabinet`,
                "Mandat d’acquisition visible au catalogue",
              ].map((item) => (
                <li key={item} className="flex items-center gap-2">
                  <span className="text-indigo">
                    <CheckIcon />
                  </span>
                  {item}
                </li>
              ))}
            </ul>
            <Button asChild variant="outline" className="mt-8">
              <Link href="/acquerir">Je recherche un portefeuille</Link>
            </Button>
          </article>
        </div>
      </section>

      <section className="bg-page">
        <div className="mx-auto max-w-6xl px-4 py-16">
          <div className="text-center">
            <h2 className="text-3xl font-bold tracking-tight text-ink">
              Des tarifs <span className="text-indigo">lisibles</span>
            </h2>
            <p className="mx-auto mt-3 max-w-2xl text-[15px] text-muted">
              Publier et consulter sont gratuits. Vous ne payez le détail de l’offre
              que si vous passez à l’abonnement.
            </p>
          </div>
          <div className="mx-auto mt-10 grid max-w-4xl gap-6 md:grid-cols-2">
            <article className="rounded-[1.75rem] border border-line bg-paper p-8">
              <h3 className="text-xl font-bold text-ink">Gratuit</h3>
              <p className="mt-1 text-[28px] font-bold tracking-tight text-ink">0 €</p>
              <ul className="mt-6 space-y-2 text-[15px] text-muted">
                <li>Publier une annonce sous alias</li>
                <li>Consulter le catalogue</li>
                <li>Option simple : {SIMPLE_FEE_LABEL} de commission</li>
              </ul>
            </article>
            <article className="rounded-[1.75rem] border border-indigo bg-indigo-soft/50 p-8">
              <h3 className="text-xl font-bold text-ink">Abonnement</h3>
              <p className="mt-1 text-[28px] font-bold tracking-tight text-indigo">
                {GROWTH_PLAN_ANNUAL_EUR.toLocaleString("fr-FR")} € HT
                <span className="text-[15px] font-medium text-muted"> / an</span>
              </p>
              <ul className="mt-6 space-y-2 text-[15px] text-ink">
                <li>Contact, messages, dépôt d’offre</li>
                <li>Identité du cédant après dépôt {INTEREST_DEPOSIT_LABEL}</li>
                <li>Option vérifiée : {VERIFIED_FEE_RANGE_LABEL}</li>
              </ul>
              <Button asChild variant="primary" className="mt-8">
                <Link href="/tarifs">Voir les tarifs</Link>
              </Button>
            </article>
          </div>
        </div>
      </section>

      <section className="border-t border-line bg-paper">
        <div className="mx-auto max-w-3xl px-4 py-16">
          <h2 className="text-center text-3xl font-bold tracking-tight text-ink">
            Questions fréquentes
          </h2>
          <ul className="mt-10 divide-y divide-line overflow-hidden rounded-[1.75rem] border border-line bg-page">
            {FAQ.map((item) => (
              <li key={item.q}>
                <details className="group px-6 py-4">
                  <summary className="cursor-pointer list-none text-[16px] font-semibold text-ink">
                    {item.q}
                  </summary>
                  <p className="mt-2 text-[15px] leading-relaxed text-muted">{item.a}</p>
                </details>
              </li>
            ))}
          </ul>
        </div>
      </section>

      <section className="bg-indigo px-4 py-16 text-white">
        <div className="mx-auto max-w-4xl text-center">
          <h2 className="text-3xl font-bold tracking-tight sm:text-4xl">
            Prêt à céder ou à acquérir un portefeuille ?
          </h2>
          <p className="mx-auto mt-4 max-w-xl text-[15px] text-white/85">
            Compte ORIAS, annonce sous alias, catalogue en ligne. Aucun paiement
            réel en démo.
          </p>
          <div className="mt-8 flex flex-wrap justify-center gap-3">
            <Link
              href="/ceder"
              className="rounded-full bg-white px-6 py-3 text-[15px] font-semibold text-indigo hover:bg-surface-alt"
            >
              Je vends mon portefeuille
            </Link>
            <Link
              href="/annonces"
              className="rounded-full border border-white/40 px-6 py-3 text-[15px] font-semibold text-white hover:bg-white/10"
            >
              Je recherche un portefeuille
            </Link>
          </div>
        </div>
      </section>
    </main>
  );
}
