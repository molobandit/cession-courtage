import type { Metadata } from "next";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { SUCCESS_FEE_RATE } from "@/lib/billing/rates";
import { OFFER_WINDOW_DAYS } from "@/lib/listing/constants";
import { formatEuroWhole } from "@/lib/format/number";
import {
  PUBLIC_SEGMENT_MULTIPLES,
  estimatePublicRange,
} from "@/lib/valuation/public-estimate";

export const metadata: Metadata = {
  title: "Journal",
  description:
    "Repères de méthode sur la valorisation, la confidentialité et la cession d’un portefeuille de courtage d’assurance.",
  alternates: { canonical: "/journal" },
};

const FEE_LABEL = `${(SUCCESS_FEE_RATE * 100).toLocaleString("fr-FR")} % HT`;

// Exemple chiffré, calculé avec le même moteur que /valoriser.
const EXAMPLE_COMMISSIONS = 45000;
const example = estimatePublicRange(EXAMPLE_COMMISSIONS, "INDIVIDUAL");

const ARTICLES = [
  {
    title: "Pourquoi un multiple unique ne veut rien dire",
    lede: `Le marché annonce couramment « deux à trois fois les commissions ». Sur ${formatEuroWhole(EXAMPLE_COMMISSIONS)} de commissions annuelles en clientèle de particuliers, cet intervalle ouvre un écart de ${formatEuroWhole(EXAMPLE_COMMISSIONS)} entre la borne basse et la borne haute. Autant dire qu’il ne dit rien.`,
    body: `Ce qui déplace réellement la valeur tient en quelques postes mesurables : la concentration de vos compagnies, le poids de vos dix premiers clients, l’ancienneté moyenne des contrats, votre taux de résiliation sur douze mois, et la durée pendant laquelle vous acceptez d’accompagner l’acquéreur. Chacun se chiffre. Un portefeuille à ${formatEuroWhole(EXAMPLE_COMMISSIONS)} de commissions ressort ici entre ${formatEuroWhole(example.low)} et ${formatEuroWhole(example.high)}, avec un point médian à ${formatEuroWhole(example.mid)}, sur un multiple public de ${PUBLIC_SEGMENT_MULTIPLES.INDIVIDUAL.toLocaleString("fr-FR")}. La valorisation complète affine ensuite chaque poste et affiche son impact en euros.`,
  },
  {
    title: "Le taux de résiliation pèse plus lourd que tout le reste",
    lede: "C’est le seul poste capable d’amputer près d’un tiers de la valeur à lui seul.",
    body: "Au delà de 15 % de chute annuelle, un acquéreur applique un coefficient de 0,70. Entre 10 et 15 %, il descend à 0,85. En dessous de 5 %, il majore de 10 %. La raison est simple : il achète des commissions futures, pas un stock de contrats. Un portefeuille qui perd un contrat sur six chaque année ne vaut pas la moitié d’un portefeuille stable, il vaut structurellement moins, parce que la perte se répète. Avant de mettre en vente, douze mois de travail sur le renouvellement rapportent souvent davantage que six mois de négociation.",
  },
  {
    title: "L’accompagnement est le levier le plus rapide",
    lede: "Six mois de présence auprès de l’acquéreur valent une majoration nette, et ne coûtent rien d’autre que du temps.",
    body: "Sans accompagnement, la valorisation est minorée d’un dixième. À six mois, elle est majorée d’un cinquième. L’écart entre les deux situations dépasse souvent ce que rapporterait une année de prospection supplémentaire. C’est logique du point de vue de l’acquéreur : la présentation du cédant à ses mandants est ce qui détermine la rétention réelle des dix-huit premiers mois.",
  },
  {
    title: "Pourquoi nous pratiquons les offres scellées",
    lede: `Quand les propositions se découvrent les unes après les autres, la première fixe le prix de toutes les suivantes.`,
    body: `Sur une transaction unique, un cédant n’a aucun moyen de savoir si la proposition qu’il tient est bonne. Les offres scellées répondent à cela : pendant ${OFFER_WINDOW_DAYS} jours, aucun candidat ne voit ce que proposent les autres, et le cédant lui-même ne voit ni les montants ni les identités. Tout s’ouvre à la clôture, en même temps. Chacun propose ce que le dossier vaut pour lui, et non ce qu’il faut pour dépasser un concurrent. La plateforme n’adjuge pas : le cédant décide seul, et reste libre de refuser la mieux-disante sans se justifier.`,
  },
  {
    title: "La part différée, et comment elle s’ajuste",
    lede: "Le désaccord classique porte sur le risque que la clientèle parte après le départ du cédant.",
    body: "L’acquéreur veut différer une partie du prix, le cédant veut être payé. La sortie tient dans une règle écrite à l’avance : la rétention est mesurée à trois, six et douze mois, et la part différée est recalculée sur le taux constaté rapporté à une cible de 90 %, sans jamais descendre en dessous de la moitié du montant convenu. Le cédant connaît son plancher dès la signature. L’acquéreur, couvert, accepte une part comptant plus élevée. Les deux y gagnent par rapport à une négociation au jugé.",
  },
  {
    title: "Ce qui ne doit jamais entrer dans un bordereau de cession",
    lede: "Aucune donnée nominative de client final n’a sa place dans un dossier de cession.",
    body: "Nom, prénom, courriel, téléphone, adresse, identifiant bancaire : ces colonnes sont refusées à l’import, en analysant les en-têtes et le contenu des cellules. Ce qui reste suffit largement à valoriser : code postal, branche, type de contrat, prime, commission, dates et sinistres agrégés. Les clients sont regroupés par une clé irréversible, ce qui permet de mesurer la concentration sans jamais identifier quiconque. C’est une exigence réglementaire, et c’est aussi votre protection : un bordereau nominatif qui circule pendant une négociation qui échoue devient un incident.",
  },
];

export default function JournalPage() {
  return (
    <main>
      <section className="border-y border-line bg-indigo-soft text-ink">
        <div className="mx-auto max-w-6xl px-4 py-14">
          <p className="text-[13px] font-medium uppercase tracking-[0.18em] text-indigo-dark">
            Journal
          </p>
          <h1 className="mt-4 max-w-3xl font-serif text-4xl font-semibold leading-tight">
            Repères de méthode sur la cession de portefeuille
          </h1>
          <p className="mt-5 max-w-2xl text-lg text-muted">
            Ce que nous constatons dossier après dossier, sur la valorisation, la
            confidentialité et la conduite d’une négociation.
          </p>
        </div>
      </section>

      <section className="mx-auto max-w-3xl px-4 py-14">
        <div className="space-y-10">
          {ARTICLES.map((article, index) => (
            <article
              key={article.title}
              className={
                index === 0
                  ? "rounded-3xl border border-line bg-paper p-7"
                  : "rounded-3xl border border-line bg-paper p-7 lg:mt-0"
              }
            >
              <h2 className="font-serif text-2xl font-semibold leading-snug text-ink">
                {article.title}
              </h2>
              <p className="mt-3 text-[15px] font-medium leading-relaxed text-ink">
                {article.lede}
              </p>
              <p className="mt-3 text-[15px] leading-relaxed text-muted">{article.body}</p>
            </article>
          ))}
        </div>

        <div className="mt-12 rounded-3xl border border-indigo-line bg-indigo-soft p-7">
          <h2 className="font-serif text-xl font-semibold text-ink">
            Commencez par une estimation
          </h2>
          <p className="mt-3 text-[15px] leading-relaxed text-muted">
            L’estimation ne demande aucune inscription. Les honoraires de {FEE_LABEL}
            {" "}
            ne sont dus que si la cession se conclut.
          </p>
          <div className="mt-6 flex flex-wrap gap-3">
            <Button asChild variant="primary">
              <Link href="/valoriser">Estimer mon portefeuille</Link>
            </Button>
            <Button asChild variant="outline">
              <Link href="/ceder">Parcours cédant</Link>
            </Button>
          </div>
        </div>
      </section>
    </main>
  );
}
