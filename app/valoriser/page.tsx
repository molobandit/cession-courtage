import type { Metadata } from "next";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { PublicEstimator } from "@/components/valuation/public-estimator";

export const metadata: Metadata = {
  title: "Valoriser un portefeuille de courtage",
  description:
    "Estimation gratuite et sans inscription de la valeur d’un portefeuille de courtage d’assurance, présentée en fourchette et non en prix unique.",
};

const CASCADE_STAGES = [
  {
    title: "Concentration des compagnies",
    body: "Un portefeuille réparti sur deux compagnies seulement est plus fragile qu’un portefeuille diversifié. L’indice de concentration est calculé sur la part de commissions de chaque compagnie.",
    range: "0,80 à 1,00",
  },
  {
    title: "Concentration de la clientèle",
    body: "Si vos dix premiers clients pèsent plus de 40 % des commissions, le départ de l’un d’eux se voit immédiatement dans les comptes de l’acquéreur.",
    range: "0,85 à 1,00",
  },
  {
    title: "Ancienneté moyenne",
    body: "Un contrat ancien se renouvelle mieux qu’un contrat récent. Au delà de six ans de moyenne, la valorisation est majorée.",
    range: "0,88 à 1,15",
  },
  {
    title: "Taux de résiliation sur douze mois",
    body: "C’est le poste le plus lourd. Au delà de 15 % de chute annuelle, la valeur est amputée de près d’un tiers.",
    range: "0,70 à 1,10",
  },
  {
    title: "Mode de distribution",
    body: "Une clientèle suivie en agence se transfère mieux qu’une clientèle gérée uniquement à distance.",
    range: "0,85 à 1,05",
  },
  {
    title: "Accompagnement du cédant",
    body: "Six mois de présence auprès de l’acquéreur après la cession valent une majoration nette. C’est le levier le plus rapide à activer.",
    range: "0,90 à 1,20",
  },
  {
    title: "Score de conformité",
    body: "Les manquements documentaires se paient au moment de la vérification préalable. Un dossier propre évite la décote.",
    range: "0,75 à 1,00",
  },
];

export default function ValoriserPage() {
  return (
    <main>
      <section className="border-y border-line bg-indigo-soft text-ink">
        <div className="mx-auto max-w-6xl px-4 py-14">
          <p className="text-[13px] font-medium uppercase tracking-[0.18em] text-indigo-dark">
            Estimation gratuite, sans inscription
          </p>
          <h1 className="mt-4 max-w-3xl font-serif text-4xl font-semibold leading-tight">
            Ce que vaut votre portefeuille, et pourquoi
          </h1>
          <p className="mt-5 max-w-2xl text-lg text-muted">
            Nous ne donnons jamais un prix unique. Une cession se négocie dans une
            fourchette, et ce qui compte est de savoir quels postes la déplacent.
          </p>
        </div>
      </section>

      <section className="mx-auto max-w-4xl px-4 py-12">
        <PublicEstimator />
      </section>

      <section className="bg-paper">
        <div className="mx-auto max-w-6xl px-4 py-16">
          <h2 className="font-serif text-3xl font-semibold text-ink">
            La valorisation complète, étage par étage
          </h2>
          <p className="mt-3 max-w-3xl text-[15px] leading-relaxed text-muted">
            Après import de votre portefeuille, la valeur brute issue des multiples
            par branche est corrigée par sept coefficients successifs. Chacun est
            affiché avec son impact en euros, ce qui vous permet de voir combien
            vous coûte un point faible, et combien vous rapporterait de le corriger.
          </p>

          <div className="mt-8 overflow-x-auto">
            <table className="w-full min-w-[42rem] border-collapse text-left">
              <thead>
                <tr className="border-b border-line">
                  <th scope="col" className="py-3 pr-4 text-[15px] font-semibold text-ink">
                    Poste
                  </th>
                  <th scope="col" className="py-3 pr-4 text-[15px] font-semibold text-ink">
                    Ce qui est mesuré
                  </th>
                  <th
                    scope="col"
                    className="py-3 text-right text-[15px] font-semibold text-ink"
                  >
                    Coefficient
                  </th>
                </tr>
              </thead>
              <tbody>
                {CASCADE_STAGES.map((stage) => (
                  <tr key={stage.title} className="border-b border-line align-top">
                    <th
                      scope="row"
                      className="w-56 py-4 pr-4 text-[15px] font-medium text-ink"
                    >
                      {stage.title}
                    </th>
                    <td className="py-4 pr-4 text-[15px] leading-relaxed text-muted">
                      {stage.body}
                    </td>
                    <td className="tabular whitespace-nowrap py-4 text-right text-[15px] text-ink">
                      {stage.range}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <p className="mt-6 text-[15px] leading-relaxed text-muted">
            La fourchette finale est ensuite bornée à 15 % de part et d’autre du
            point médian. Chaque calcul est archivé avec sa version d’algorithme,
            ce qui permet de rejouer une valorisation ancienne à l’identique.
          </p>
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-4 py-16">
        <div className="rounded-3xl border border-line bg-paper p-8">
          <h2 className="font-serif text-2xl font-semibold text-ink">
            Vos données ne sortent pas de chez vous
          </h2>
          <p className="mt-4 max-w-3xl text-[15px] leading-relaxed text-muted">
            L’import refuse toute colonne nominative : nom, prénom, courriel,
            téléphone, adresse, identifiant bancaire. La détection porte sur les
            en-têtes et sur le contenu des cellules. Ce qui entre en base se limite
            au code postal, à la branche, au type de contrat, à la prime, à la
            commission et aux dates. Les clients sont regroupés par une clé
            irréversible qui permet de mesurer la concentration sans jamais
            identifier personne.
          </p>
          <div className="mt-7 flex flex-wrap gap-3">
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
