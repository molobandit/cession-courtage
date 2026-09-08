import type { Metadata } from "next";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { GROWTH_PLAN_ANNUAL_EUR, SUCCESS_FEE_RATE } from "@/lib/billing/rates";
import { OFFER_WINDOW_DAYS } from "@/lib/listing/constants";

export const metadata: Metadata = {
  title: "Céder ou acquérir un portefeuille de courtage d'assurance",
  description:
    "Place de marché B2B réservée aux courtiers ORIAS. Valorisation en cascade, annonce sous alias, offres scellées sur 21 jours et part différée ajustée sur la rétention constatée.",
  alternates: { canonical: "/" },
};

const FEE_LABEL = `${(SUCCESS_FEE_RATE * 100).toLocaleString("fr-FR")} % HT`;

const PROBLEMS = [
  {
    title: "Vous ne savez pas ce que vaut votre portefeuille",
    body: "Le marché raisonne en multiple unique de commissions. Ce chiffre ne dit ni pourquoi, ni comment le faire monter. Vous signez sans pouvoir vérifier.",
  },
  {
    title: "Vous ne pouvez pas prospecter sans que cela se sache",
    body: "Dès qu’un confrère apprend que vous cédez, vos mandants s’inquiètent et vos collaborateurs partent. La discrétion n’est pas un confort, c’est la condition de l’opération.",
  },
  {
    title: "La première offre fixe le prix",
    body: "Quand les propositions arrivent les unes après les autres, la première sert d’ancrage et les suivantes s’y alignent. Vous ne saurez jamais ce que le marché était prêt à payer.",
  },
];

const STEPS = [
  {
    n: "01",
    title: "Vous importez votre portefeuille",
    body: "Un bordereau CSV ou XLSX. Toute colonne nominative est refusée à l’import : nom, courriel, adresse, téléphone. Le grain maximal conservé est le code postal.",
  },
  {
    n: "02",
    title: "Vous obtenez une fourchette, pas un prix",
    body: "Une valorisation en cascade détaille chaque correctif et son impact en euros : concentration compagnies, concentration client, ancienneté, résiliation, accompagnement, conformité.",
  },
  {
    n: "03",
    title: "Vous publiez sous alias",
    body: "Votre annonce paraît sous la forme « Portefeuille #10001 ». Ni raison sociale, ni localisation fine. Vous pouvez ne céder qu’une partie de votre portefeuille.",
  },
  {
    n: "04",
    title: "Vous recevez des offres scellées",
    body: `Pendant ${OFFER_WINDOW_DAYS} jours, aucun candidat ne voit les propositions des autres, et vous ne voyez ni les montants ni les identités. À la clôture, tout s’ouvre en même temps.`,
  },
  {
    n: "05",
    title: "Vous décidez seul",
    body: "Vous restez libre de refuser la meilleure proposition sans vous justifier. La plateforme recueille, elle n’adjuge pas.",
  },
  {
    n: "06",
    title: "Le dossier se déroule par paliers",
    body: "Accord de confidentialité, mémorandum, salle de données, lettre d’intention, protocole, signature, séquestre, transfert ORIAS. Votre identité n’est révélée qu’à la lettre d’intention.",
  },
];

const DIFFERENTIATORS = [
  {
    tag: "Personne d’autre ne le fait",
    title: "Le prix différé s’ajuste sur la rétention réelle",
    body: "Aujourd’hui le cédant encaisse et l’acquéreur porte seul le risque que la clientèle parte. Nous mesurons la rétention à trois, six et douze mois, et la part différée est recalculée sur le taux observé, avec un plancher à 50 %. Le risque est partagé par contrat, pas par confiance.",
  },
  {
    tag: "Valorisation",
    title: "Une cascade que vous pouvez contredire",
    body: "Chaque étage est affiché avec son coefficient et son impact chiffré. Vous voyez ce que votre dépendance à une compagnie vous coûte, et de combien un accompagnement de six mois relèverait la valeur. Un acquéreur peut vérifier le raisonnement ligne à ligne.",
  },
  {
    tag: "Anonymat",
    title: "Rien ne filtre avant la lettre d’intention",
    body: "L’anonymat n’est pas un affichage : les droits s’appliquent au niveau des requêtes. Un utilisateur qui devine un identifiant n’obtient rien. Chaque accès à la salle de données est journalisé, et vous voyez qui a consulté quoi.",
  },
  {
    tag: "Mise en relation",
    title: "Les acquéreurs se déclarent avant de voir",
    body: "Un acquéreur dépose un mandat : compagnies, branches, zone, fourchette de commissions, budget. Les dossiers lui sont présentés par score d’adéquation, avec le détail des critères qui ont joué. Vous savez à qui vous parlez.",
  },
];

const FACTS = [
  { value: "2 000 à 200 000 €", label: "Tickets traités" },
  { value: `${OFFER_WINDOW_DAYS} jours`, label: "Durée de la fenêtre d’offres" },
  { value: "Code postal", label: "Grain maximal conservé" },
  { value: "ORIAS", label: "Immatriculation vérifiée à l’inscription" },
];

export default function HomePage() {
  return (
    <main>
      <section className="bg-charcoal text-cream">
        <div className="mx-auto max-w-6xl px-4 py-16 sm:py-24">
          <p className="text-[13px] font-medium uppercase tracking-[0.18em] text-gold">
            Place de marché réservée aux courtiers immatriculés ORIAS
          </p>
          <h1 className="mt-4 max-w-4xl font-serif text-4xl font-semibold leading-[1.1] sm:text-5xl">
            Cédez votre portefeuille sans que personne ne l’apprenne, et à un prix
            que vous pouvez <span className="text-gold">justifier</span>.
          </h1>
          <p className="mt-6 max-w-2xl text-lg text-cream/80">
            Valorisation en cascade détaillée poste par poste, annonce sous alias,
            offres scellées pendant {OFFER_WINDOW_DAYS} jours, et une part différée
            ajustée sur la rétention réellement constatée après la cession.
          </p>
          <div className="mt-8 flex flex-wrap gap-3">
            <Button asChild variant="gold" size="lg">
              <Link href="/valoriser">Estimer mon portefeuille</Link>
            </Button>
            <Button
              asChild
              size="lg"
              className="border border-cream/25 bg-transparent text-cream hover:bg-cream/10"
            >
              <Link href="/annonces">Voir les annonces</Link>
            </Button>
          </div>
          <p className="mt-6 text-[15px] text-cream/60">
            Gratuit jusqu’à la vente. Honoraires de {FEE_LABEL} au succès, et rien
            si vous ne cédez pas.
          </p>
        </div>
      </section>

      <section className="border-b border-line bg-paper">
        <div className="mx-auto grid max-w-6xl grid-cols-2 gap-x-6 gap-y-6 px-4 py-8 lg:grid-cols-4">
          {FACTS.map((fact) => (
            <div key={fact.label}>
              <p className="tabular font-serif text-xl font-semibold text-ink">{fact.value}</p>
              <p className="mt-1 text-sm text-muted">{fact.label}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-4 py-16">
        <h2 className="font-serif text-3xl font-semibold text-ink">
          Trois obstacles bloquent la cession d’un portefeuille
        </h2>
        <div className="mt-8 grid gap-5 lg:grid-cols-3">
          {PROBLEMS.map((item) => (
            <article key={item.title} className="rounded-3xl border border-line bg-paper p-6">
              <h3 className="font-serif text-xl font-semibold text-ink">{item.title}</h3>
              <p className="mt-3 text-[15px] leading-relaxed text-muted">{item.body}</p>
            </article>
          ))}
        </div>
      </section>

      <section className="bg-paper">
        <div className="mx-auto max-w-6xl px-4 py-16">
          <h2 className="font-serif text-3xl font-semibold text-ink">
            Comment se déroule une cession
          </h2>
          <p className="mt-3 max-w-2xl text-[15px] text-muted">
            Six étapes. Vous gardez la main à chacune, et vous pouvez vous arrêter
            à tout moment.
          </p>
          <ol className="mt-10 grid gap-5 lg:grid-cols-3">
            {STEPS.map((step) => (
              <li key={step.n} className="rounded-3xl border border-line bg-cream p-6">
                <p className="tabular font-serif text-2xl font-semibold text-gold-deep">
                  {step.n}
                </p>
                <h3 className="mt-2 font-serif text-lg font-semibold text-ink">{step.title}</h3>
                <p className="mt-2 text-[15px] leading-relaxed text-muted">{step.body}</p>
              </li>
            ))}
          </ol>
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-4 py-16">
        <h2 className="font-serif text-3xl font-semibold text-ink">
          Ce que vous ne trouverez pas ailleurs
        </h2>
        <div className="mt-8 grid gap-5 lg:grid-cols-2">
          {DIFFERENTIATORS.map((item) => (
            <article key={item.title} className="rounded-3xl border border-line bg-paper p-7">
              <p className="text-[13px] font-medium uppercase tracking-[0.14em] text-gold-deep">
                {item.tag}
              </p>
              <h3 className="mt-3 font-serif text-xl font-semibold text-ink">{item.title}</h3>
              <p className="mt-3 text-[15px] leading-relaxed text-muted">{item.body}</p>
            </article>
          ))}
        </div>
      </section>

      <section className="bg-charcoal text-cream">
        <div className="mx-auto max-w-6xl px-4 py-16">
          <div className="grid gap-10 lg:grid-cols-2 lg:items-center">
            <div>
              <h2 className="font-serif text-3xl font-semibold">
                Vous ne payez que si vous cédez
              </h2>
              <p className="mt-4 text-[15px] leading-relaxed text-cream/80">
                La valorisation, la publication de l’annonce, la mise en relation et
                la salle de données ne coûtent rien. Les honoraires de {FEE_LABEL}
                {" "}
                ne sont dus qu’à la vente conclue. L’abonnement Croissance, à{" "}
                {GROWTH_PLAN_ANNUAL_EUR} € HT par an, s’adresse aux acquéreurs qui
                suivent plusieurs dossiers en parallèle.
              </p>
              <div className="mt-7 flex flex-wrap gap-3">
                <Button asChild variant="gold" size="lg">
                  <Link href="/inscription">Créer un compte</Link>
                </Button>
                <Button
                  asChild
                  size="lg"
                  className="border border-cream/25 bg-transparent text-cream hover:bg-cream/10"
                >
                  <Link href="/tarifs">Voir le détail des tarifs</Link>
                </Button>
              </div>
            </div>
            <dl className="rounded-3xl border border-cream/15 bg-charcoal-muted p-7">
              <div className="flex items-baseline justify-between gap-4 border-b border-cream/10 pb-4">
                <dt className="text-[15px] text-cream/75">Valorisation et annonce</dt>
                <dd className="tabular font-serif text-xl font-semibold text-gold">Gratuit</dd>
              </div>
              <div className="flex items-baseline justify-between gap-4 border-b border-cream/10 py-4">
                <dt className="text-[15px] text-cream/75">Honoraires à la vente</dt>
                <dd className="tabular font-serif text-xl font-semibold text-gold">{FEE_LABEL}</dd>
              </div>
              <div className="flex items-baseline justify-between gap-4 pt-4">
                <dt className="text-[15px] text-cream/75">Abonnement acquéreur</dt>
                <dd className="tabular font-serif text-xl font-semibold text-gold">
                  {GROWTH_PLAN_ANNUAL_EUR} € HT
                </dd>
              </div>
            </dl>
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-4 py-16 text-center">
        <h2 className="font-serif text-3xl font-semibold text-ink">
          Commencez par savoir ce que vaut votre portefeuille
        </h2>
        <p className="mx-auto mt-4 max-w-xl text-[15px] text-muted">
          L’estimation ne demande aucune inscription et ne vous engage à rien.
          Elle vous donne une fourchette et le raisonnement qui la produit.
        </p>
        <div className="mt-7 flex flex-wrap justify-center gap-3">
          <Button asChild variant="gold" size="lg">
            <Link href="/valoriser">Estimer mon portefeuille</Link>
          </Button>
          <Button asChild variant="outline" size="lg">
            <Link href="/ceder">Comprendre le parcours cédant</Link>
          </Button>
        </div>
      </section>
    </main>
  );
}
