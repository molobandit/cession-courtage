import type { Metadata } from "next";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import {
  GROWTH_PLAN_ANNUAL_EUR,
  INTEREST_DEPOSIT_LABEL,
} from "@/lib/billing/rates";
import { ASKING_MAX, ASKING_MIN } from "@/lib/listing/constants";
import { formatEuroWhole } from "@/lib/format/number";
import { PAYMENT_FAQ, PAYMENT_FAQ_ANCHOR } from "@/lib/partners/faq";
import { FAQ_PORTFOLIO_TRANSFER_A, FAQ_PORTFOLIO_TRANSFER_Q } from "@/lib/copy/market";

export const metadata: Metadata = {
  title: "Questions fréquentes",
  description:
    "Confidentialité, étude du portefeuille, séance d’offres, tarifs, transaction et transfert : les réponses aux questions que se posent les courtiers.",
  alternates: { canonical: "/faq" },
};

type Question = { q: string; a: string };
type Section = { id?: string; title: string; intro: string; questions: Question[] };

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
        a: `Dès que l’acquéreur se positionne, il verse un dépôt de ${INTEREST_DEPOSIT_LABEL} dans un trust, pour lancer la procédure de cession. C’est à ce moment que votre identité lui est ouverte, jamais avant. L’abonnement ouvre le contact et les messages, sans dévoiler votre nom.`,
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
    title: "Étude du portefeuille",
    intro: "Ce que nous regardons, et qui détermine le montant de l’annonce.",
    questions: [
      {
        q: "Qui détermine le montant de mon annonce ?",
        a: "Notre équipe. Après l’étude de votre portefeuille, nous déterminons sa valeur et nous mettons l’annonce en ligne avec le montant correspondant. Vous n’avez ni montant à fixer, ni annonce à publier.",
      },
      {
        q: "Que regarde l’étude ?",
        a: "Les éléments et les caractéristiques de votre portefeuille : ancienneté des contrats, résiliations, mode de distribution, composition, accompagnement après la cession et conformité.",
      },
      {
        q: "Comment renforcer mon dossier ?",
        a: "En maîtrisant les résiliations et en proposant à l’acquéreur un accompagnement de quelques mois après la cession.",
      },
      {
        q: "Le montant de l’annonce engage-t-il l’acquéreur ?",
        a: "Non. C’est le montant auquel l’annonce est mise en ligne. L’acquéreur fait son offre, et la vérification préalable reste indispensable.",
      },
    ],
  },
  {
    title: "Offres et négociation",
    intro: "Ce qui se passe pendant la séance, et après.",
    questions: [
      {
        q: "Comment fonctionne la séance d’offres ?",
        a: `La meilleure offre et le nombre d’offres s’affichent en direct sur la fiche, sans jamais l’identité des acquéreurs : chacun sait où en est la cote avant de s’engager. Le cédant suit les offres et en retient une à la clôture.`,
      },
      {
        q: "Pourquoi le cédant attend-il la clôture pour retenir une offre ?",
        a: "Pour laisser à chaque acquéreur le temps d’examiner le dossier et de se positionner. Retenir la première offre venue priverait le cédant d’une meilleure proposition arrivée le lendemain.",
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
        q: "Dans quelle fourchette les annonces sont-elles mises en ligne ?",
        a: `Notre équipe détermine un montant compris entre ${formatEuroWhole(ASKING_MIN)} et ${formatEuroWhole(ASKING_MAX)}.`,
      },
    ],
  },
  {
    title: "Déroulement d’un dossier",
    intro: "Du premier contact jusqu’au transfert.",
    questions: [
      {
        q: "Quelles sont les étapes ?",
        a: "Accord de confidentialité, salle de données, lettre d’intention, vérification d’identité, acte, signature, transaction sécurisée, transfert des contrats, puis période de rétention. Les étapes se suivent dans cet ordre et ne peuvent pas être sautées.",
      },
      {
        q: FAQ_PORTFOLIO_TRANSFER_Q,
        a: FAQ_PORTFOLIO_TRANSFER_A,
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
        q: "Quels sont les honoraires ?",
        a: "Ils sont précisés dans le contrat d’intermédiation que vous signez sur la plateforme, et ne sont dus que si la vente aboutit. Dans tous les cas, le numéro ORIAS est contrôlé à l’inscription et la transaction passe par un trust.",
      },
      {
        q: "Un acquéreur doit-il s’abonner ?",
        a: `Consulter le catalogue ne nécessite pas d’abonnement. Un abonnement de ${GROWTH_PLAN_ANNUAL_EUR.toLocaleString("fr-FR")} € HT par an est obligatoire pour accéder au détail de l’offre (contact, messages). Dès que l’acquéreur se positionne, il verse ${INTEREST_DEPOSIT_LABEL} dans un trust pour lancer la procédure de cession. L’abonnement passe par Stripe dès que ce rail est ouvert.`,
      },
    ],
  },
  {
    id: PAYMENT_FAQ_ANCHOR,
    title: "Transaction et signatures",
    intro: "Qui signe, qui vérifie, par où passent les fonds. Sans copier une autre place de marché.",
    questions: PAYMENT_FAQ,
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
        q: "Comment comptez-vous les clients sans les identifier ?",
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
      <section className="border-y border-line bg-indigo-soft text-ink">
        <div className="mx-auto max-w-6xl px-4 py-14">
          <p className="text-[13px] font-medium uppercase tracking-[0.18em] text-indigo-dark">
            Questions fréquentes
          </p>
          <h1 className="mt-4 max-w-3xl font-serif text-4xl font-semibold leading-tight">
            Tout ce qu’un courtier demande avant de se lancer
          </h1>
          <p className="mt-5 max-w-2xl text-lg text-muted">
            Si votre question n’y figure pas, elle mérite d’y être. Écrivez-nous.
          </p>
        </div>
      </section>

      <section className="mx-auto max-w-4xl px-4 py-12">
        <nav aria-label="Sommaire" className="rounded-3xl border border-line bg-paper p-6">
          <p className="text-[15px] font-medium text-ink">Sommaire</p>
          <ul className="mt-3 flex flex-wrap gap-2">
            {SECTIONS.map((section) => {
              const id = section.id ?? encodeURIComponent(section.title);
              return (
                <li key={section.title}>
                  <a
                    href={`#${id}`}
                    className="inline-block rounded-full border border-line bg-surface-alt px-4 py-2 text-[15px] text-ink hover:border-indigo"
                  >
                    {section.title}
                  </a>
                </li>
              );
            })}
          </ul>
        </nav>

        <div className="mt-10 space-y-12">
          {SECTIONS.map((section) => (
            <section key={section.title} id={section.id ?? encodeURIComponent(section.title)}>
              <h2 className="font-serif text-2xl font-semibold text-ink">{section.title}</h2>
              <p className="mt-2 text-[15px] text-muted">{section.intro}</p>
              <div className="mt-5 space-y-3">
                {section.questions.map((item) => (
                  <details
                    key={item.q}
                    className="group rounded-3xl border border-line bg-paper p-5 open:border-indigo-line"
                  >
                    <summary className="cursor-pointer list-none text-[15px] font-medium text-ink marker:content-none">
                      <span className="flex items-start justify-between gap-4">
                        {item.q}
                        <span
                          aria-hidden="true"
                          className="mt-0.5 shrink-0 text-xl leading-none text-indigo-dark group-open:hidden"
                        >
                          +
                        </span>
                        <span
                          aria-hidden="true"
                          className="mt-0.5 hidden shrink-0 text-xl leading-none text-indigo-dark group-open:inline"
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

        <div className="mt-12 rounded-3xl border border-indigo-line bg-indigo-soft p-7">
          <h2 className="font-serif text-xl font-semibold text-ink">
            Faites étudier votre portefeuille
          </h2>
          <p className="mt-3 text-[15px] leading-relaxed text-muted">
            Notre équipe réalise l’étude, puis détermine le montant de l’annonce.
          </p>
          <div className="mt-6 flex flex-wrap gap-3">
            <Button asChild variant="primary">
              <Link href="/etude-portefeuille">Découvrir l’étude</Link>
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
