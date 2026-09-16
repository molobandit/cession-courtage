import type { Metadata } from "next";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { PRICE_RULE, PRICE_RULE_SENTENCES, STUDY_SENTENCE } from "@/lib/copy/market";

export const metadata: Metadata = {
  title: "Étude de portefeuille",
  description:
    "Nous réalisons une étude du portefeuille afin de mettre en évidence ses différents éléments et caractéristiques.",
};

/**
 * L'étude du portefeuille, expliquée au public. Aucune estimation chiffrée :
 * c'est l'équipe qui détermine la valeur, à l'issue de l'étude.
 */
const ELEMENTS = [
  {
    title: "Ancienneté des contrats",
    body: "Un contrat ancien se renouvelle mieux qu’un contrat récent. Nous regardons l’ancienneté moyenne du portefeuille.",
  },
  {
    title: "Résiliations",
    body: "Le taux de résiliation sur douze mois montre la fidélité de la clientèle. C’est l’un des points que les acquéreurs regardent en premier.",
  },
  {
    title: "Mode de distribution",
    body: "Une clientèle suivie en agence ne se transmet pas comme une clientèle gérée uniquement à distance.",
  },
  {
    title: "Composition",
    body: "Compagnies, branches, types de clientèle et zones géographiques : la répartition du portefeuille intéresse directement les acquéreurs.",
  },
  {
    title: "Accompagnement après la cession",
    body: "Quelques mois de présence auprès de l’acquéreur facilitent la reprise de la clientèle.",
  },
  {
    title: "Conformité",
    body: "Un dossier complet et à jour rassure l’acquéreur et accélère les vérifications.",
  },
];

const ETAPES = [
  { title: "Vous déposez votre bordereau", body: "Un fichier CSV ou XLSX de votre portefeuille." },
  { title: "Nous réalisons l’étude", body: STUDY_SENTENCE },
  { title: "Nous déterminons la valeur", body: PRICE_RULE_SENTENCES[0] },
  { title: "L’annonce est mise en ligne", body: PRICE_RULE_SENTENCES[2] },
];

export default function EtudePortefeuillePage() {
  return (
    <main>
      <section className="border-y border-line bg-indigo-soft text-ink">
        <div className="mx-auto max-w-6xl px-4 py-14">
          <p className="text-[13px] font-medium uppercase tracking-[0.18em] text-indigo-dark">Étude de portefeuille</p>
          <h1 className="mt-4 max-w-3xl font-serif text-4xl font-semibold leading-tight">
            Nous étudions votre portefeuille avant sa mise en ligne
          </h1>
          <p className="mt-5 max-w-2xl text-lg text-muted">
            {STUDY_SENTENCE} {PRICE_RULE}
          </p>
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-4 py-12">
        <h2 className="font-serif text-3xl font-semibold text-ink">Comment ça se passe</h2>
        <ol className="mt-8 grid gap-5 md:grid-cols-4">
          {ETAPES.map((etape, i) => (
            <li key={etape.title} className="rounded-3xl border border-line bg-paper p-6">
              <p className="tabular text-[13px] font-semibold text-indigo-dark">{String(i + 1).padStart(2, "0")}</p>
              <h3 className="mt-2 text-lg font-semibold text-ink">{etape.title}</h3>
              <p className="mt-2 text-[15px] leading-relaxed text-muted">{etape.body}</p>
            </li>
          ))}
        </ol>
      </section>

      <section className="bg-paper">
        <div className="mx-auto max-w-6xl px-4 py-16">
          <h2 className="font-serif text-3xl font-semibold text-ink">Ce que nous regardons</h2>
          <ul className="mt-8 grid gap-5 md:grid-cols-2 lg:grid-cols-3">
            {ELEMENTS.map((element) => (
              <li key={element.title} className="rounded-3xl border border-line bg-page p-6">
                <h3 className="text-lg font-semibold text-ink">{element.title}</h3>
                <p className="mt-2 text-[15px] leading-relaxed text-muted">{element.body}</p>
              </li>
            ))}
          </ul>
          <div className="mt-10 flex flex-wrap gap-3">
            <Button asChild variant="primary">
              <Link href="/inscription">Créer un compte</Link>
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
