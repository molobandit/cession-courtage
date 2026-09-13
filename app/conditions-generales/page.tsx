import type { Metadata } from "next";
import { LegalLayout, LegalSection } from "@/components/legal/legal-page";
import { GROWTH_PLAN_ANNUAL_EUR, INTEREST_DEPOSIT_LABEL, SIMPLE_FEE_LABEL, SUCCESS_FEE_FLOOR_EUR, VERIFIED_FEE_RANGE_LABEL } from "@/lib/billing/rates";
import { ASKING_MAX, ASKING_MIN, OFFER_WINDOW_DAYS } from "@/lib/listing/constants";
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
          La consultation du catalogue et la publication d’une annonce sont
          fournies sans frais. Pour accéder au détail d’une offre (contact,
          messages), l’acquéreur souscrit un abonnement de{" "}
          {GROWTH_PLAN_ANNUAL_EUR} € hors taxes par an. Le cédant demeure
          anonyme jusqu’au versement d’un dépôt de {INTEREST_DEPOSIT_LABEL} du
          prix demandé. L’éditeur n’encaisse pas le prix de cession. Les
          modalités de paiement et de signature figurent à l’article 10.
        </p>
        <p>
          Deux options de cession coexistent. L’option annonce simple n’emporte
          aucune commission ({SIMPLE_FEE_LABEL}) et ne comporte pas de
          vérification détaillée de la société.           L’option portefeuille vérifié
          emporte des honoraires de {VERIFIED_FEE_RANGE_LABEL} du prix de
          cession, dus par le cédant exclusivement en cas de cession conclue,
          avec un plancher de {formatEuroWhole(SUCCESS_FEE_FLOOR_EUR)}. Cette
          option comprend le contrôle du Kbis, de l’identité du représentant,
          du justificatif ORIAS du dossier et des documents du portefeuille.
          Dans les deux cas, le paiement transite par un séquestre, sans frais
          de séquestre supplémentaires. Les fonds sont libérés lorsque
          l’acquéreur a le portefeuille en sa possession. Si la cession
          n’aboutit pas, les fonds consignés sont restitués à l’acquéreur.
          Tant que le contrat du séquestre n’est pas validé, l’étape est
          enregistrée sans mouvement de fonds, conformément à l’article 10.
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

      <LegalSection title="10. Prestataires de paiement et de signature">
        <p>
          L’éditeur ne détient, ne reçoit ni ne conserve le prix de cession. Les
          opérations financières et les signatures électroniques sont conçues pour
          être réalisées par des prestataires indépendants. Stripe encaisse
          l’abonnement d’accès et les dépôts d’intérêt inférieurs à 999 euros.
          Trustap conserve le prix de cession et les versements à partir de 999
          euros. Yousign, ou DocuSign, porte la signature électronique. Ondorse
          porte la vérification d’identité professionnelle. CrediPro porte le
          financement de l’acquisition, sans se substituer au séquestre.
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
