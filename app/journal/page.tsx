import type { Metadata } from "next";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { OFFER_WINDOW_DAYS } from "@/lib/listing/constants";

export const metadata: Metadata = {
  title: "Journal",
  description:
    "Repères de méthode sur l’étude du portefeuille, la confidentialité et la cession d’un portefeuille de courtage d’assurance.",
  alternates: { canonical: "/journal" },
};

const ARTICLES = [
  {
    title: "Pourquoi nous étudions chaque portefeuille avant de fixer son prix",
    lede: "Un multiple lancé au téléphone ne dit rien d’un portefeuille.",
    body: "Deux portefeuilles aux mêmes commissions ne se valent pas : l’ancienneté des contrats, les résiliations, le mode de distribution et l’accompagnement proposé changent tout. C’est pourquoi notre équipe réalise d’abord une étude du portefeuille, qui met en évidence ses éléments et ses caractéristiques. La valeur est déterminée ensuite, et l’annonce est mise en ligne avec le prix correspondant.",
  },
  {
    title: "Les résiliations comptent plus que tout le reste",
    lede: "Un acquéreur achète des commissions futures, pas un stock de contrats.",
    body: "Un portefeuille qui perd beaucoup de contrats chaque année intéresse moins, parce que la perte se répète. Avant de mettre en vente, quelques mois de travail sur le renouvellement renforcent souvent davantage le dossier que de longues négociations.",
  },
  {
    title: "L’accompagnement rassure l’acquéreur",
    lede: "Quelques mois de présence auprès de l’acquéreur facilitent la reprise de la clientèle.",
    body: "Du point de vue de l’acquéreur, la présentation du cédant à ses clients est ce qui décide de leur fidélité dans les premiers mois. Proposer un accompagnement après la cession est l’un des moyens les plus simples de renforcer un dossier.",
  },
  {
    title: "Pourquoi la meilleure offre est affichée en séance",
    lede: `Un acquéreur qui ne sait pas où en est la cote propose au hasard ; un cédant qui ne voit rien décide à l’aveugle.`,
    body: `Pendant ${OFFER_WINDOW_DAYS} jours, la fiche affiche la meilleure offre et le nombre d’offres déposées, comme la cote d’un titre, sans jamais révéler qui a offert. Chaque acquéreur se positionne en connaissance de cause, et un portefeuille recherché trouve son prix. Le cédant suit la séance et retient une offre à la clôture ; la plateforme n’adjuge pas, il reste libre de préférer une offre mieux financée à la plus élevée.`,
  },
  {
    title: "La part différée, et comment elle s’ajuste",
    lede: "Le désaccord classique porte sur le risque que la clientèle parte après le départ du cédant.",
    body: "L’acquéreur veut différer une partie du prix, le cédant veut être payé. La sortie tient dans une règle écrite à l’avance : la rétention est mesurée à trois, six et douze mois, et la part différée est recalculée sur le taux constaté rapporté à une cible de 90 %, sans jamais descendre en dessous de la moitié du montant convenu. Le cédant connaît son plancher dès la signature. L’acquéreur, couvert, accepte une part comptant plus élevée. Les deux y gagnent par rapport à une négociation au jugé.",
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
            Ce que nous constatons dossier après dossier, sur l’étude du portefeuille,
            la confidentialité et la conduite d’une négociation.
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
            Faites étudier votre portefeuille
          </h2>
          <p className="mt-3 text-[15px] leading-relaxed text-muted">
            Notre équipe réalise l’étude, fixe le prix, puis met l’annonce en ligne.
            La mise en vente est gratuite.
          </p>
          <div className="mt-6 flex flex-wrap gap-3">
            <Button asChild variant="primary">
              <Link href="/etude-portefeuille">Découvrir l’étude</Link>
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
