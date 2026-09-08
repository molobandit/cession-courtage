import type { Metadata } from "next";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { GROWTH_PLAN_ANNUAL_EUR, SUCCESS_FEE_RATE } from "@/lib/billing/rates";
import { OFFER_WINDOW_DAYS } from "@/lib/listing/constants";
import { formatEuroWhole } from "@/lib/format/number";
import { estimatePublicRange } from "@/lib/valuation/public-estimate";

export const metadata: Metadata = {
  title: "Céder ou acquérir un portefeuille de courtage d'assurance",
  description:
    "Place de marché B2B réservée aux courtiers ORIAS. Valorisation en cascade, annonce sous alias, offres scellées sur 21 jours et part différée ajustée sur la rétention constatée.",
  alternates: { canonical: "/" },
};

const FEE_LABEL = `${(SUCCESS_FEE_RATE * 100).toLocaleString("fr-FR")} % HT`;

// Exemple du hero, calculé avec le moteur de /valoriser pour rester cohérent.
const SAMPLE_COMMISSIONS = 45000;
const sample = estimatePublicRange(SAMPLE_COMMISSIONS, "INDIVIDUAL");

const PROBLEMS = [
  {
    number: "01",
    title: "Vous ignorez ce que vaut votre portefeuille",
    body: "Le marché parle en multiple unique de commissions. Ce chiffre ne dit ni pourquoi, ni comment le faire monter. Vous signez sans pouvoir vérifier.",
  },
  {
    number: "02",
    title: "Vous ne pouvez pas chercher sans que cela se sache",
    body: "Dès qu’un confrère apprend que vous cédez, vos mandants s’inquiètent et vos collaborateurs partent. La discrétion n’est pas un confort, c’est la condition de l’opération.",
  },
  {
    number: "03",
    title: "La première offre fixe le prix",
    body: "Quand les propositions arrivent l’une après l’autre, la première sert d’ancrage et les suivantes s’y alignent. Vous ne saurez jamais ce que le marché était prêt à payer.",
  },
];

const STEPS = [
  {
    n: "01",
    title: "Vous importez",
    body: "Un bordereau CSV ou XLSX. Toute colonne nominative est refusée. Le grain maximal conservé est le code postal.",
  },
  {
    n: "02",
    title: "Vous obtenez une fourchette",
    body: "Sept coefficients successifs, chacun affiché avec son impact en euros. Jamais un prix unique.",
  },
  {
    n: "03",
    title: "Vous publiez sous alias",
    body: "Ni raison sociale, ni commune. Vous pouvez ne céder qu’une partie de votre portefeuille.",
  },
  {
    n: "04",
    title: "Vous recevez des offres scellées",
    body: `Pendant ${OFFER_WINDOW_DAYS} jours, personne ne voit rien. Tout s’ouvre en même temps à la clôture.`,
  },
  {
    n: "05",
    title: "Vous décidez seul",
    body: "Vous restez libre de refuser la meilleure proposition sans vous justifier. La plateforme n’adjuge pas.",
  },
  {
    n: "06",
    title: "Le dossier se déroule",
    body: "Confidentialité, salle de données, lettre d’intention, protocole, séquestre, transfert ORIAS, rétention.",
  },
];

const COMPARISON = [
  { label: "Valorisation détaillée poste par poste", us: true, market: false },
  { label: "Annonce anonyme jusqu’à la lettre d’intention", us: true, market: false },
  { label: "Offres scellées sur une fenêtre fermée", us: true, market: false },
  { label: "Prix différé ajusté sur la rétention constatée", us: true, market: false },
  { label: "Journal des accès à la salle de données", us: true, market: false },
  { label: "Gratuit tant que la cession n’est pas conclue", us: true, market: false },
];

export default function HomePage() {
  return (
    <main>
      {/* Hero */}
      <section className="hero-charcoal text-cream">
        <div className="mx-auto grid max-w-6xl gap-14 px-4 py-20 lg:grid-cols-[1.25fr_1fr] lg:items-center lg:py-28">
          <div>
            <span className="inline-flex items-center gap-2 rounded-full border border-gold/30 bg-gold/10 px-4 py-1.5 text-[13px] font-medium text-indigo-soft">
              Réservé aux courtiers immatriculés ORIAS
            </span>

            <h1 className="mt-6 font-serif text-[2.6rem] font-semibold leading-[1.05] sm:text-6xl">
              Cédez votre portefeuille
              <span className="mt-2 block text-indigo-soft">sans que personne ne l’apprenne.</span>
            </h1>

            <p className="mt-7 max-w-xl text-lg leading-relaxed text-cream/75">
              Une valorisation que vous pouvez justifier ligne à ligne, une annonce
              anonyme, des offres scellées pendant {OFFER_WINDOW_DAYS} jours, et une
              part différée ajustée sur la rétention réellement constatée.
            </p>

            <div className="mt-9 flex flex-wrap items-center gap-3">
              <Button asChild variant="gold" size="lg">
                <Link href="/valoriser">Estimer mon portefeuille</Link>
              </Button>
              <Button
                asChild
                size="lg"
                className="border border-cream/25 bg-transparent text-cream hover:border-gold/50 hover:bg-cream/5"
              >
                <Link href="/annonces">Voir les annonces</Link>
              </Button>
            </div>

            <p className="mt-6 text-[15px] text-cream/65">
              Gratuit jusqu’à la vente. Honoraires de {FEE_LABEL} au succès, et rien
              si vous ne cédez pas.
            </p>
          </div>

          {/* Aperçu de la fourchette : montre le produit plutôt que de le décrire. */}
          <div className="rounded-3xl border border-cream/12 bg-charcoal-muted/80 p-7 shadow-2xl shadow-black/30">
            <p className="text-[13px] font-medium uppercase tracking-[0.14em] text-indigo-soft">
              Exemple de fourchette
            </p>
            <p className="mt-3 text-[15px] text-cream/65">
              {formatEuroWhole(SAMPLE_COMMISSIONS)} de commissions annuelles,
              clientèle de particuliers.
            </p>

            <div className="mt-7 space-y-3">
              <div className="flex items-baseline justify-between gap-4">
                <span className="text-[15px] text-cream/60">Basse</span>
                <span className="tabular font-serif text-xl text-cream/80">
                  {formatEuroWhole(sample.low)}
                </span>
              </div>
              <div className="rule-gold" />
              <div className="flex items-baseline justify-between gap-4">
                <span className="text-[15px] font-medium text-indigo-soft">Médiane</span>
                <span className="tabular font-serif text-3xl font-semibold text-indigo-soft">
                  {formatEuroWhole(sample.mid)}
                </span>
              </div>
              <div className="rule-gold" />
              <div className="flex items-baseline justify-between gap-4">
                <span className="text-[15px] text-cream/60">Haute</span>
                <span className="tabular font-serif text-xl text-cream/80">
                  {formatEuroWhole(sample.high)}
                </span>
              </div>
            </div>

            <p className="mt-7 border-t border-cream/10 pt-5 text-sm leading-relaxed text-cream/65">
              La valorisation complète corrige cette base par sept coefficients, et
              affiche l’impact en euros de chacun.
            </p>
          </div>
        </div>
      </section>

      {/* Bandeau de repères */}
      <section className="border-b border-line bg-paper">
        <div className="mx-auto grid max-w-6xl grid-cols-2 gap-x-6 gap-y-7 px-4 py-9 lg:grid-cols-4">
          {[
            { value: "2 000 à 200 000 €", label: "Tickets traités" },
            { value: `${OFFER_WINDOW_DAYS} jours`, label: "Fenêtre d’offres" },
            { value: "Code postal", label: "Grain maximal conservé" },
            { value: FEE_LABEL, label: "Honoraires, au succès seulement" },
          ].map((fact) => (
            <div key={fact.label}>
              <p className="tabular font-serif text-xl font-semibold text-ink">{fact.value}</p>
              <p className="mt-1.5 text-sm text-muted">{fact.label}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Problèmes */}
      <section className="mx-auto max-w-6xl px-4 py-20">
        <div className="max-w-2xl">
          <p className="text-[13px] font-medium uppercase tracking-[0.14em] text-gold-deep">
            Le point de départ
          </p>
          <h2 className="mt-3 font-serif text-4xl font-semibold leading-tight text-ink">
            Trois obstacles bloquent la cession d’un portefeuille
          </h2>
        </div>
        <div className="mt-12 grid gap-6 lg:grid-cols-3">
          {PROBLEMS.map((item) => (
            <article
              key={item.title}
              className="lift rounded-3xl border border-line bg-paper p-7"
            >
              <p className="tabular font-serif text-3xl font-semibold text-gold-deep/45">
                {item.number}
              </p>
              <h3 className="mt-4 font-serif text-xl font-semibold leading-snug text-ink">
                {item.title}
              </h3>
              <p className="mt-3 text-[15px] leading-relaxed text-muted">{item.body}</p>
            </article>
          ))}
        </div>
      </section>

      {/* Étapes */}
      <section className="bg-paper">
        <div className="mx-auto max-w-6xl px-4 py-20">
          <div className="max-w-2xl">
            <p className="text-[13px] font-medium uppercase tracking-[0.14em] text-gold-deep">
              Le déroulé
            </p>
            <h2 className="mt-3 font-serif text-4xl font-semibold leading-tight text-ink">
              Six étapes, et vous gardez la main à chacune
            </h2>
          </div>
          <ol className="mt-12 grid gap-6 lg:grid-cols-3">
            {STEPS.map((step) => (
              <li key={step.n} className="lift rounded-3xl border border-line bg-cream p-7">
                <span className="tabular inline-flex h-11 w-11 items-center justify-center rounded-full bg-charcoal font-serif text-[15px] font-semibold text-indigo-soft">
                  {step.n}
                </span>
                <h3 className="mt-5 font-serif text-lg font-semibold text-ink">{step.title}</h3>
                <p className="mt-2.5 text-[15px] leading-relaxed text-muted">{step.body}</p>
              </li>
            ))}
          </ol>
        </div>
      </section>

      {/* Différenciateur principal */}
      <section className="mx-auto max-w-6xl px-4 py-20">
        <div className="overflow-hidden rounded-3xl border border-gold-deep/30 bg-gold/10">
          <div className="grid gap-10 p-9 lg:grid-cols-[1.3fr_1fr] lg:items-center lg:p-12">
            <div>
              <span className="inline-flex rounded-full bg-charcoal px-4 py-1.5 text-[13px] font-medium text-indigo-soft">
                Personne d’autre ne le fait
              </span>
              <h2 className="mt-5 font-serif text-4xl font-semibold leading-tight text-ink">
                Le prix différé s’ajuste sur la rétention réelle
              </h2>
              <p className="mt-5 max-w-xl text-[15px] leading-relaxed text-ink/80">
                Aujourd’hui le cédant encaisse et l’acquéreur porte seul le risque
                que la clientèle parte. Nous mesurons la rétention à trois, six et
                douze mois, et la part différée est recalculée sur le taux observé,
                avec un plancher à 50 %. Le cédant connaît son pire cas dès la
                signature. L’acquéreur, couvert, accepte un comptant plus élevé.
              </p>
              <Button asChild variant="gold" className="mt-8">
                <Link href="/ceder">Comprendre le mécanisme</Link>
              </Button>
            </div>
            <dl className="rounded-3xl border border-gold-deep/25 bg-paper p-7">
              {[
                { t: "Cible de rétention", v: "90 %" },
                { t: "Relevés", v: "M+3, M+6, M+12" },
                { t: "Plancher du différé", v: "50 %" },
                { t: "Plafond du différé", v: "100 %" },
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
        </div>
      </section>

      {/* Comparaison */}
      <section className="bg-paper">
        <div className="mx-auto max-w-4xl px-4 py-20">
          <div className="max-w-2xl">
            <p className="text-[13px] font-medium uppercase tracking-[0.14em] text-gold-deep">
              Ce qui nous distingue
            </p>
            <h2 className="mt-3 font-serif text-4xl font-semibold leading-tight text-ink">
              Ce que vous ne trouverez pas ailleurs
            </h2>
          </div>
          <div className="mt-10 overflow-x-auto rounded-3xl border border-line bg-cream">
            <table className="w-full min-w-[34rem] border-collapse text-left">
              <thead>
                <tr className="border-b border-line">
                  <th scope="col" className="px-6 py-4 text-[15px] font-semibold text-ink">
                    Fonctionnement
                  </th>
                  <th scope="col" className="px-4 py-4 text-center text-[15px] font-semibold text-ink">
                    Ici
                  </th>
                  <th scope="col" className="px-4 py-4 text-center text-[15px] font-semibold text-muted">
                    Ailleurs
                  </th>
                </tr>
              </thead>
              <tbody>
                {COMPARISON.map((row) => (
                  <tr key={row.label} className="border-b border-line last:border-b-0">
                    <th scope="row" className="px-6 py-4 text-[15px] font-normal text-ink">
                      {row.label}
                    </th>
                    <td className="px-4 py-4 text-center">
                      <span className="sr-only">Disponible</span>
                      <span
                        aria-hidden="true"
                        className="inline-flex h-7 w-7 items-center justify-center rounded-full bg-gold text-[15px] font-semibold text-charcoal"
                      >
                        ✓
                      </span>
                    </td>
                    <td className="px-4 py-4 text-center text-[15px] text-muted">
                      <span className="sr-only">Non disponible</span>
                      <span aria-hidden="true">Non</span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </section>

      {/* Tarifs */}
      <section className="hero-charcoal text-cream">
        <div className="mx-auto max-w-6xl px-4 py-20">
          <div className="grid gap-12 lg:grid-cols-2 lg:items-center">
            <div>
              <p className="text-[13px] font-medium uppercase tracking-[0.14em] text-indigo-soft">
                Tarifs
              </p>
              <h2 className="mt-3 font-serif text-4xl font-semibold leading-tight">
                Vous ne payez que si vous cédez
              </h2>
              <p className="mt-5 max-w-lg text-[15px] leading-relaxed text-cream/75">
                La valorisation, l’annonce, la mise en relation et la salle de
                données ne coûtent rien. Si vous renoncez, si aucune offre ne vous
                convient, ou si vous retirez votre annonce, vous ne devez rien.
              </p>
              <div className="mt-8 flex flex-wrap gap-3">
                <Button asChild variant="gold" size="lg">
                  <Link href="/inscription">Créer un compte</Link>
                </Button>
                <Button
                  asChild
                  size="lg"
                  className="border border-cream/25 bg-transparent text-cream hover:border-gold/50 hover:bg-cream/5"
                >
                  <Link href="/tarifs">Détail des tarifs</Link>
                </Button>
              </div>
            </div>
            <dl className="rounded-3xl border border-cream/12 bg-charcoal-muted/80 p-8">
              {[
                { t: "Valorisation et annonce", v: "Gratuit" },
                { t: "Honoraires à la vente", v: FEE_LABEL },
                { t: "Abonnement acquéreur", v: `${GROWTH_PLAN_ANNUAL_EUR} € HT / an` },
              ].map((row, index) => (
                <div
                  key={row.t}
                  className={
                    index === 0
                      ? "flex items-baseline justify-between gap-4 pb-4"
                      : "flex items-baseline justify-between gap-4 border-t border-cream/10 py-4 last:pb-0"
                  }
                >
                  <dt className="text-[15px] text-cream/70">{row.t}</dt>
                  <dd className="tabular font-serif text-xl font-semibold text-indigo-soft">{row.v}</dd>
                </div>
              ))}
            </dl>
          </div>
        </div>
      </section>

      {/* Appel final */}
      <section className="mx-auto max-w-3xl px-4 py-20 text-center">
        <h2 className="font-serif text-4xl font-semibold leading-tight text-ink">
          Commencez par savoir ce que vaut votre portefeuille
        </h2>
        <p className="mx-auto mt-5 max-w-xl text-[15px] leading-relaxed text-muted">
          L’estimation ne demande aucune inscription et ne vous engage à rien. Elle
          vous donne une fourchette, et le raisonnement qui la produit.
        </p>
        <div className="mt-9 flex flex-wrap justify-center gap-3">
          <Button asChild variant="gold" size="lg">
            <Link href="/valoriser">Estimer mon portefeuille</Link>
          </Button>
          <Button asChild variant="outline" size="lg">
            <Link href="/faq">Lire les questions fréquentes</Link>
          </Button>
        </div>
      </section>
    </main>
  );
}
