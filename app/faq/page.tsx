import type { Metadata } from "next";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import {
  FREE_PLAN_DEAL_QUOTA,
  GROWTH_PLAN_ANNUAL_EUR,
  SUCCESS_FEE_FLOOR_EUR,
  SUCCESS_FEE_RATE,
} from "@/lib/billing/rates";
import { ASKING_MAX, ASKING_MIN, OFFER_WINDOW_DAYS } from "@/lib/listing/constants";
import { formatEuroWhole } from "@/lib/format/number";

export const metadata: Metadata = {
  title: "Questions fréquentes",
  description:
    "Confidentialité, valorisation, offres scellées, tarifs, transfert ORIAS et rétention : les réponses aux questions que se posent les courtiers.",
  alternates: { canonical: "/faq" },
};

const FEE_LABEL = `${(SUCCESS_FEE_RATE * 100).toLocaleString("fr-FR")} % HT`;

type Question = { q: string; a: string };
type Section = { title: string; intro: string; questions: Question[] };

const SECTIONS: Section[] = [
  {
    title: "Confidentialité",
    intro: "La question qui vient toujours en premier chez un cédant.",
    questions: [
      {
        q: "Mes concurrents peuvent-ils savoir que je vends ?",
        a: "Non. Votre annonce paraît sous un numéro, sans raison sociale, sans commune et sans adresse. La zone affichée reste au niveau du département ou de la région. Rien dans la page publique ne permet de vous identifier.",
      },
      {
        q: "À quel moment mon identité est-elle révélée ?",
        a: "À la signature de la lettre d’intention, jamais avant. Avant ce palier, l’acquéreur ne connaît de vous qu’un alias. Le contrôle s’applique au niveau des requêtes, pas seulement de l’affichage : un utilisateur qui devine un identifiant n’obtient rien.",
      },
      {
        q: "Puis-je savoir qui a consulté mon dossier ?",
        a: "Oui. Chaque accès à la salle de données est journalisé avec son horodatage, et le journal est visible des deux parties.",
      },
      {
        q: "Mes collaborateurs peuvent-ils l’apprendre par la plateforme ?",
        a: "Non. Seuls les comptes que vous rattachez à votre cabinet voient vos portefeuilles et vos annonces. Aucune notification n’est envoyée à des tiers.",
      },
    ],
  },
  {
    title: "Valorisation",
    intro: "Comment le prix est construit, et ce qui le fait bouger.",
    questions: [
      {
        q: "Sur quoi repose la valorisation ?",
        a: "Sur une valeur brute calculée à partir des multiples par branche appliqués à vos commissions, puis corrigée par sept coefficients successifs : concentration des compagnies, concentration de la clientèle, ancienneté moyenne, taux de résiliation, mode de distribution, accompagnement du cédant et score de conformité.",
      },
      {
        q: "Pourquoi une fourchette et non un prix ?",
        a: "Parce qu’une cession se négocie. Un prix unique donne une fausse précision et vous prive d’argument. La fourchette est bornée à 15 % de part et d’autre du point médian, et chaque coefficient est affiché avec son impact en euros pour que vous puissiez le discuter.",
      },
      {
        q: "Quel poste pèse le plus lourd ?",
        a: "Le taux de résiliation sur douze mois. Au delà de 15 % de chute annuelle, la valeur est amputée de près d’un tiers. À l’inverse, l’accompagnement du cédant est le levier le plus rapide à activer : six mois de présence valent une majoration nette.",
      },
      {
        q: "La valorisation est-elle opposable à un acquéreur ?",
        a: "Non. Elle est indicative et repose sur les données que vous déposez. Elle ne remplace pas une vérification préalable. Sa force est d’être traçable : un acquéreur peut vérifier le raisonnement ligne à ligne plutôt que de contester un multiple global.",
      },
    ],
  },
  {
    title: "Offres et négociation",
    intro: "Ce qui se passe pendant la fenêtre, et après.",
    questions: [
      {
        q: "Comment fonctionnent les offres scellées ?",
        a: `La fenêtre dure ${OFFER_WINDOW_DAYS} jours à compter de la publication. Pendant cette période, aucun candidat ne voit les propositions des autres, et vous ne voyez ni les montants ni les identités. Tout s’ouvre en même temps à la clôture.`,
      },
      {
        q: "Pourquoi ne puis-je pas voir les offres au fur et à mesure ?",
        a: "Parce que la première proposition servirait d’ancrage et vous feriez un choix trop tôt. En masquant les montants jusqu’à la clôture, chaque candidat propose ce que le dossier vaut pour lui, et non ce qu’il faut pour dépasser un concurrent.",
      },
      {
        q: "Suis-je obligé d’accepter la meilleure offre ?",
        a: "Non. La plateforme n’adjuge jamais. Vous décidez seul et vous restez libre de refuser la proposition la plus élevée sans avoir à vous justifier. Vous pouvez aussi ne retenir aucune offre.",
      },
      {
        q: "Un acquéreur peut-il retirer son offre ?",
        a: "Oui, tant qu’elle n’a pas été retenue. Une fois l’offre acceptée, un dossier s’ouvre et le parcours contractuel commence.",
      },
      {
        q: "Quels montants puis-je demander ?",
        a: `Le prix demandé est compris entre ${formatEuroWhole(ASKING_MIN)} et ${formatEuroWhole(ASKING_MAX)}.`,
      },
    ],
  },
  {
    title: "Déroulement d’un dossier",
    intro: "Du premier contact jusqu’au transfert.",
    questions: [
      {
        q: "Quelles sont les étapes ?",
        a: "Accord de confidentialité, salle de données, lettre d’intention, vérification d’identité, acte, signature, séquestre, transfert ORIAS, puis période de rétention. Les étapes se suivent dans cet ordre et ne peuvent pas être sautées.",
      },
      {
        q: "Qu’est-ce que l’ajustement du prix différé ?",
        a: "Lorsqu’une partie du prix est différée, elle est recalculée sur le taux de rétention réellement constaté à trois, six et douze mois, rapporté à une cible de 90 %, avec un plancher à la moitié du montant convenu. Vous connaissez votre pire cas dès la signature, et l’acquéreur accepte un comptant plus élevé parce qu’il est couvert.",
      },
      {
        q: "Puis-je ne céder qu’une partie de mon portefeuille ?",
        a: "Oui. Vous sélectionnez les lignes concernées et la fourchette est recalculée sur ce sous-ensemble uniquement.",
      },
      {
        q: "Le transfert ORIAS est-il pris en charge ?",
        a: "Le suivi de l’étape est intégré au dossier. Les démarches d’immatriculation restent de la responsabilité de chaque partie : la plateforme n’exerce aucune activité d’intermédiation en assurance.",
      },
    ],
  },
  {
    title: "Tarifs",
    intro: "Ce que coûte le service, et à quel moment.",
    questions: [
      {
        q: "Combien coûte la mise en vente ?",
        a: "Rien. La valorisation, l’annonce, la mise en relation et la salle de données sont gratuites. Vous ne payez que si la cession se conclut.",
      },
      {
        q: "Quels sont les honoraires ?",
        a: `${FEE_LABEL} du prix de cession, dus par le cédant à la vente conclue, avec un plancher de ${formatEuroWhole(SUCCESS_FEE_FLOOR_EUR)} sur les très petits dossiers. Si vous renoncez, si aucune offre ne vous convient ou si vous retirez votre annonce, vous ne devez rien.`,
      },
      {
        q: "Un acquéreur doit-il payer ?",
        a: `La consultation des annonces, le dépôt d’un mandat et la mise en relation sont gratuits, dans la limite de ${FREE_PLAN_DEAL_QUOTA} dossiers suivis en parallèle. Le forfait Croissance, à ${GROWTH_PLAN_ANNUAL_EUR} € HT par an, lève cette limite et donne accès au mandat exclusif.`,
      },
      {
        q: "Y a-t-il des frais annexes ?",
        a: "Non. Aucun frais de dossier, aucun supplément pour la salle de données, l’accord de confidentialité ou le suivi des étapes.",
      },
    ],
  },
  {
    title: "Données et conformité",
    intro: "Ce qui entre en base, et ce qui n’y entre jamais.",
    questions: [
      {
        q: "Quelles données puis-je importer ?",
        a: "Code postal, ville, branche, type de contrat, prime, commission, dates de contrat et sinistres agrégés. Le format CSV et le format XLSX sont acceptés.",
      },
      {
        q: "Que se passe-t-il si mon fichier contient des noms de clients ?",
        a: "L’import le refuse et vous indique la colonne en cause. La détection porte sur les en-têtes et sur le contenu des cellules. Aucune donnée nominative de client final n’entre en base, quelle que soit la manœuvre.",
      },
      {
        q: "Comment mesurez-vous la concentration sans identifier les clients ?",
        a: "Les contrats d’un même client sont regroupés par une clé calculée de manière irréversible. Elle permet de compter et de comparer, jamais de remonter à une personne.",
      },
      {
        q: "Qui est responsable de l’information de mes mandants ?",
        a: "Vous. La plateforme n’est pas partie à la cession et n’intervient pas dans vos relations avec vos mandants ni avec vos compagnies.",
      },
    ],
  },
];

export default function FaqPage() {
  return (
    <main>
      <section className="bg-charcoal text-cream">
        <div className="mx-auto max-w-6xl px-4 py-14">
          <p className="text-[13px] font-medium uppercase tracking-[0.18em] text-gold">
            Questions fréquentes
          </p>
          <h1 className="mt-4 max-w-3xl font-serif text-4xl font-semibold leading-tight">
            Tout ce qu’un courtier demande avant de se lancer
          </h1>
          <p className="mt-5 max-w-2xl text-lg text-cream/80">
            Si votre question n’y figure pas, elle mérite d’y être. Écrivez-nous.
          </p>
        </div>
      </section>

      <section className="mx-auto max-w-4xl px-4 py-12">
        <nav aria-label="Sommaire" className="rounded-3xl border border-line bg-paper p-6">
          <p className="text-[15px] font-medium text-ink">Sommaire</p>
          <ul className="mt-3 flex flex-wrap gap-2">
            {SECTIONS.map((section) => (
              <li key={section.title}>
                <a
                  href={`#${encodeURIComponent(section.title)}`}
                  className="inline-block rounded-full border border-line bg-cream px-4 py-2 text-[15px] text-ink hover:border-gold-deep/50"
                >
                  {section.title}
                </a>
              </li>
            ))}
          </ul>
        </nav>

        <div className="mt-10 space-y-12">
          {SECTIONS.map((section) => (
            <section key={section.title} id={encodeURIComponent(section.title)}>
              <h2 className="font-serif text-2xl font-semibold text-ink">{section.title}</h2>
              <p className="mt-2 text-[15px] text-muted">{section.intro}</p>
              <div className="mt-5 space-y-3">
                {section.questions.map((item) => (
                  <details
                    key={item.q}
                    className="group rounded-3xl border border-line bg-paper p-5 open:border-gold-deep/40"
                  >
                    <summary className="cursor-pointer list-none text-[15px] font-medium text-ink marker:content-none">
                      <span className="flex items-start justify-between gap-4">
                        {item.q}
                        <span
                          aria-hidden="true"
                          className="mt-0.5 shrink-0 text-xl leading-none text-gold-deep group-open:hidden"
                        >
                          +
                        </span>
                        <span
                          aria-hidden="true"
                          className="mt-0.5 hidden shrink-0 text-xl leading-none text-gold-deep group-open:inline"
                        >
                          −
                        </span>
                      </span>
                    </summary>
                    <p className="mt-3 text-[15px] leading-relaxed text-muted">{item.a}</p>
                  </details>
                ))}
              </div>
            </section>
          ))}
        </div>

        <div className="mt-12 rounded-3xl border border-gold-deep/40 bg-gold/10 p-7">
          <h2 className="font-serif text-xl font-semibold text-ink">
            Commencez par une estimation
          </h2>
          <p className="mt-3 text-[15px] leading-relaxed text-muted">
            Sans inscription, sans engagement. Vous obtenez une fourchette et le
            raisonnement qui la produit.
          </p>
          <div className="mt-6 flex flex-wrap gap-3">
            <Button asChild variant="gold">
              <Link href="/valoriser">Estimer mon portefeuille</Link>
            </Button>
            <Button asChild variant="outline">
              <Link href="/tarifs">Voir les tarifs</Link>
            </Button>
          </div>
        </div>
      </section>
    </main>
  );
}
