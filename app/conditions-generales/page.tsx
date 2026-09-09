import type { Metadata } from "next";
import { LegalLayout, LegalSection } from "@/components/legal/legal-page";
import { SUCCESS_FEE_FLOOR_EUR, SUCCESS_FEE_RATE, GROWTH_PLAN_ANNUAL_EUR } from "@/lib/billing/rates";
import { ASKING_MAX, ASKING_MIN, OFFER_WINDOW_DAYS } from "@/lib/listing/constants";
import { formatEuroWhole } from "@/lib/format/number";

export const metadata: Metadata = {
  title: "Conditions générales",
  description:
    "Conditions d’utilisation et conditions de vente du service de mise en relation.",
  alternates: { canonical: "/conditions-generales" },
};

const FEE_LABEL = `${(SUCCESS_FEE_RATE * 100).toLocaleString("fr-FR")} % HT`;

export default function ConditionsGeneralesPage() {
  return (
    <LegalLayout
      eyebrow="Conditions générales"
      title="Conditions d’utilisation et de vente"
      intro="Règles applicables entre l’éditeur et les courtiers utilisateurs du service."
    >
      <LegalSection title="1. Objet et accès au service">
        <p>
          Le service met en relation des intermédiaires en assurance en vue de la
          cession ou de l’acquisition d’un portefeuille de courtage. Il est réservé
          aux professionnels immatriculés à l’ORIAS. L’immatriculation est vérifiée
          à l’inscription ; l’accès aux fonctions de cession et d’acquisition reste
          suspendu jusqu’à cette vérification.
        </p>
        <p>
          Le service s’adresse exclusivement à des professionnels. Les dispositions
          du code de la consommation relatives aux contrats conclus avec des
          consommateurs ne s’y appliquent pas.
        </p>
      </LegalSection>

      <LegalSection title="2. Rôle de la plateforme">
        <p>
          L’éditeur n’est pas partie à la cession. Il n’est mandataire d’aucune des
          parties, ne garantit ni la conclusion, ni le prix, ni l’exécution de la
          transaction, et n’exerce aucune activité d’intermédiation en assurance.
        </p>
        <p>
          La plateforme n’adjuge jamais. Elle recueille des propositions ; le cédant
          décide seul et demeure libre de refuser la proposition la plus élevée sans
          avoir à motiver sa décision. Aucun mécanisme de surenchère en direct ni de
          prolongation automatique n’est mis en œuvre.
        </p>
      </LegalSection>

      <LegalSection title="3. Obligations de l’utilisateur">
        <p>
          L’utilisateur garantit l’exactitude des informations qu’il dépose,
          notamment son numéro ORIAS et les données de son portefeuille. Il
          s’interdit de transmettre toute donnée nominative concernant un client
          final : nom, adresse électronique, adresse postale, téléphone ou
          identifiant bancaire.
        </p>
        <p>
          Il lui appartient de vérifier qu’il dispose du droit de céder le
          portefeuille présenté, et d’informer ses mandants et ses éventuels
          cocontractants dans les conditions prévues par ses propres engagements.
        </p>
      </LegalSection>

      <LegalSection title="4. Confidentialité et dévoilement par paliers">
        <p>
          Les annonces sont publiées sous alias. L’identité du cédant n’est révélée
          qu’à la signature de la lettre d’intention. Chaque palier de dévoilement
          est journalisé.
        </p>
        <p>
          L’acquéreur s’engage à n’utiliser les informations reçues qu’aux fins
          d’apprécier l’opération, et à ne pas démarcher directement la clientèle
          dont il aurait connaissance à cette occasion.
        </p>
      </LegalSection>

      <LegalSection title="5. Fenêtre d’offres">
        <p>
          Lorsque le cédant ouvre une fenêtre d’offres, celle-ci court pendant{" "}
          {OFFER_WINDOW_DAYS} jours à compter de la publication. Pendant cette
          période, aucun candidat n’a connaissance des propositions des autres, et
          le cédant n’a accès ni aux montants ni aux identités.
        </p>
        <p>
          Les propositions sont révélées simultanément à la clôture. Une offre peut
          être retirée par son auteur tant qu’elle n’a pas été retenue. Le prix
          demandé est compris entre {formatEuroWhole(ASKING_MIN)} et{" "}
          {formatEuroWhole(ASKING_MAX)}.
        </p>
      </LegalSection>

      <LegalSection title="6. Prix et honoraires">
        <p>
          La valorisation, la publication de l’annonce, la mise en relation et la
          salle de données sont fournies sans frais. Des honoraires de {FEE_LABEL}
          {" "}
          du prix de cession sont dus par le cédant, exclusivement en cas de cession
          conclue, avec un plancher de {formatEuroWhole(SUCCESS_FEE_FLOOR_EUR)}.
        </p>
        <p>
          Le forfait Croissance, à {GROWTH_PLAN_ANNUAL_EUR} € hors taxes par an,
          s’adresse aux acquéreurs suivant plusieurs dossiers en parallèle. Il est
          sans engagement de durée. Aucun paiement n’est traité sur la plateforme en
          l’état actuel du service.
        </p>
      </LegalSection>

      <LegalSection title="7. Ajustement du prix différé">
        <p>
          Lorsque les parties conviennent d’une part différée, celle-ci est
          recalculée en fonction du taux de rétention constaté à trois, six et douze
          mois, rapporté à une cible de 90 %, sans pouvoir descendre en dessous de
          la moitié du montant convenu ni excéder ce montant. Les relevés sont
          déposés contradictoirement par les parties.
        </p>
      </LegalSection>

      <LegalSection title="8. Responsabilité">
        <p>
          Les valorisations sont indicatives et reposent sur les données déposées par
          le cédant. Elles ne constituent ni une garantie de prix, ni un audit, ni
          une évaluation opposable aux tiers. Il appartient à l’acquéreur de conduire
          ses propres vérifications préalables.
        </p>
        <p>
          La responsabilité de l’éditeur ne saurait être engagée à raison des
          décisions prises par les parties, de l’inexactitude des données déposées,
          ni de l’issue d’une négociation.
        </p>
      </LegalSection>

      <LegalSection title="9. Suspension et résiliation">
        <p>
          L’éditeur peut suspendre un compte en cas de dépôt de données nominatives,
          de fausse déclaration d’immatriculation, de tentative de contournement des
          règles de confidentialité ou d’accès à des données d’autrui.
        </p>
        <p>
          L’utilisateur peut fermer son compte à tout moment. Les pièces d’une
          cession déjà conclue sont conservées selon les durées indiquées dans la
          politique de confidentialité.
        </p>
      </LegalSection>

      <LegalSection title="10. Droit applicable">
        <p>
          Les présentes conditions sont régies par le droit français. À défaut de
          résolution amiable, tout différend relève de la compétence des juridictions
          françaises, dans les conditions du droit commun applicable entre
          professionnels.
        </p>
      </LegalSection>
    </LegalLayout>
  );
}
