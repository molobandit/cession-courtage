import type { Metadata } from "next";
import { LegalLayout, LegalSection } from "@/components/legal/legal-page";
import { GROWTH_PLAN_ANNUAL_EUR, INTEREST_DEPOSIT_LABEL } from "@/lib/billing/rates";
import { ASKING_MAX, ASKING_MIN } from "@/lib/listing/constants";
import { formatEuroWhole } from "@/lib/format/number";

export const metadata: Metadata = {
  title: "Conditions générales",
  description:
    "Conditions d’utilisation et conditions de vente du service de mise en relation.",
  alternates: { canonical: "/conditions-generales" },
};

export default function ConditionsGeneralesPage() {
  return (
    <LegalLayout
      eyebrow="Conditions générales"
      title="Conditions d’utilisation et de vente"
      intro="Règles applicables entre l’éditeur, les courtiers et les investisseurs utilisateurs du service."
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
          parties, ne garantit ni la conclusion, ni le montant, ni l’exécution de la
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
          qu’au versement du dépôt de positionnement. Chaque palier de dévoilement
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
          Lorsque le cédant ouvre une fenêtre d’offres, celle-ci court à compter
          de la publication. Pendant cette période, aucun candidat n’a
          connaissance des propositions des autres, et le cédant n’a accès ni aux
          montants ni aux identités.
        </p>
        <p>
          Les propositions sont révélées simultanément à la clôture. Une offre peut
          être retirée par son auteur tant qu’elle n’a pas été retenue. Le montant
          demandé est compris entre {formatEuroWhole(ASKING_MIN)} et{" "}
          {formatEuroWhole(ASKING_MAX)}.
        </p>
      </LegalSection>

      <LegalSection title="6. Honoraires et transaction">
        <p>
          La consultation de la salle de marché et la mise en ligne d’une annonce
          sont fournies sans frais. Dès que l’acquéreur se positionne, il verse un
          dépôt de {INTEREST_DEPOSIT_LABEL} du montant de l’annonce dans un trust,
          pour lancer la procédure de cession.
          L’éditeur n’encaisse pas les fonds de la cession. Les
          modalités de transaction et de signature figurent à l’article 10.
        </p>
        <p>
          Deux options de cession coexistent. L’annonce simple n’est pas
          certifiée : les données du portefeuille ne sont pas vérifiées par
          l’éditeur, c’est à l’acquéreur d’effectuer ses propres vérifications.
          Le portefeuille certifié : tous les éléments sont contrôlés, y compris
          la société, sa réputation, les données et les bordereaux de commission. Les honoraires de chaque
          option sont fixés par le contrat d’intermédiation signé sur la
          plateforme et ne sont dus qu’en cas de cession conclue.
          Dans les deux cas, la transaction transite par un trust. Les fonds
          sont libérés via le trust uniquement après contrôle et vérification de
          l’ensemble des données.
          Tant que le contrat du trust n’est pas validé, l’étape est
          enregistrée sans mouvement de fonds, conformément à l’article 10.
        </p>
      </LegalSection>

      <LegalSection title="7. Séquestre de conservation">
        <p>
          Le trust séquestre 20 % du montant du portefeuille. Cette part est
          versée au prorata à l’acquéreur uniquement si la déperdition dépasse
          10 %.
        </p>
      </LegalSection>

      <LegalSection title="8. Responsabilité">
        <p>
          Les études de portefeuille et les montants des annonces sont indicatifs et
          reposent sur les données déposées par le cédant. Elles ne constituent ni une garantie de montant, ni un audit, ni
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

      <LegalSection title="10. Prestataires de transaction et de signature">
        <p>
          L’éditeur ne détient, ne reçoit ni ne conserve les fonds de la cession. Les
          opérations financières et les signatures électroniques sont conçues pour
          être réalisées par des prestataires indépendants. Stripe encaisse
          les dépôts de positionnement inférieurs à 999 euros.
          Trustap conserve les fonds de la cession et les versements à partir de 999
          euros. Yousign, ou DocuSign, porte la signature électronique. Ondorse
          porte la vérification d’identité professionnelle. CrediPro porte le
          financement de l’acquisition, sans se substituer au trust.
        </p>
        <p>
          Tant que le contrat d’un prestataire n’est pas validé, l’étape
          correspondante est enregistrée sur le dossier à titre de démonstration,
          sans mouvement de fonds et sans transmission de pièces d’identité à un
          tiers. Dès validation, les conditions de ce prestataire s’appliquent en
          sus des présentes.
        </p>
      </LegalSection>

      <LegalSection title="11. Droit applicable">
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
