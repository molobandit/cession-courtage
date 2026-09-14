import { describeParty, fill, formatLongDate, type DocumentParty, type GeneratedDocument } from "@/lib/direct/documents";

/**
 * Engagements d'un courtier envers la place de marché, signés une fois.
 *
 * L'engagement de confidentialité et le contrat d'intermédiation valent pour
 * toutes les annonces et toutes les cessions, tant que dure l'immatriculation
 * ORIAS sous laquelle ils ont été signés. Un nouveau numéro ORIAS, ou une
 * nouvelle version des textes, demande une nouvelle signature ; rien d'autre.
 *
 * Fonctions pures, testables sans base.
 */

export type AgreementKind = "NDA" | "INTERMEDIATION";

export const AGREEMENT_VERSION = "2026-09";

export const AGREEMENTS: { kind: AgreementKind; title: string; short: string }[] = [
  { kind: "NDA", title: "Engagement de confidentialité", short: "Confidentialité" },
  { kind: "INTERMEDIATION", title: "Contrat d’intermédiation", short: "Intermédiation" },
];

export type SignedAgreement = { kind: string; version: string; oriasNumber: string; signedAt: Date };

export type AgreementsStatus = {
  valid: boolean;
  signed: Partial<Record<AgreementKind, SignedAgreement>>;
  missing: AgreementKind[];
};

/** Les deux engagements sont-ils signés, dans la version en vigueur, sous l'ORIAS actuel ? */
export function agreementsStatus(rows: SignedAgreement[], oriasNumber: string | null): AgreementsStatus {
  const signed: Partial<Record<AgreementKind, SignedAgreement>> = {};
  for (const a of AGREEMENTS) {
    const row = rows
      .filter((r) => r.kind === a.kind && r.version === AGREEMENT_VERSION && oriasNumber && r.oriasNumber === oriasNumber)
      .sort((x, y) => y.signedAt.getTime() - x.signedAt.getTime())[0];
    if (row) signed[a.kind] = row;
  }
  const missing = AGREEMENTS.map((a) => a.kind).filter((k) => !signed[k]);
  return { valid: missing.length === 0, signed, missing };
}

const PLATEFORME = "La bourse du portefeuille, éditeur de la place de marché accessible à l’adresse du site";

const NOTICE =
  "Texte signé électroniquement sur la plateforme : nom du signataire, date, adresse IP et empreinte du texte sont conservés. Relisez-le avant de signer.";

function commun(party: DocumentParty, oriasNumber: string) {
  return {
    heading: "Entre les soussignés",
    paragraphs: [
      `${PLATEFORME}, ci-après « la plateforme » ;`,
      `${describeParty({ ...party, oriasNumber: oriasNumber || party.oriasNumber })}, ci-après « le courtier ».`,
    ],
  };
}

export function buildPlatformNda(party: DocumentParty, oriasNumber: string, issuedAt: Date): GeneratedDocument {
  return {
    key: "confidentialite",
    title: "Engagement de confidentialité",
    subtitle: "Valable pour toutes les annonces et cessions, pendant la durée de l’immatriculation ORIAS",
    reference: `NDA-${AGREEMENT_VERSION}`,
    sections: [
      commun(party, oriasNumber),
      {
        heading: "Article 1. Objet",
        paragraphs: [
          "Le courtier consulte, sur la plateforme, des informations sur des cabinets et des portefeuilles de contrats d’assurance proposés à la cession ou recherchés à l’acquisition. Le présent engagement encadre l’usage de ces informations, au bénéfice de la plateforme et de chaque cabinet qui les communique.",
        ],
      },
      {
        heading: "Article 2. Informations confidentielles",
        paragraphs: [
          "Sont confidentielles toutes les informations obtenues par la plateforme ou lors d’une mise en relation, quel qu’en soit le support : identité et coordonnées des cabinets, pièces déposées, présentation du cabinet, bordereaux de commissions, conditions conclues avec les compagnies, données financières, offres et échanges.",
          "Ne sont pas confidentielles les informations déjà publiques, ou que le courtier détenait légitimement avant leur communication.",
        ],
      },
      {
        heading: "Article 3. Engagements du courtier",
        paragraphs: [
          "Le courtier n’utilise ces informations que pour évaluer et réaliser une acquisition ou une cession sur la plateforme. Il ne les communique qu’à ses conseils, financeurs et collaborateurs tenus au secret, dont il répond.",
          "Il ne démarche aucun client, collaborateur ou partenaire d’un cabinet dont il a connu l’existence par la plateforme, sur le fondement de ces informations.",
          "Aucune donnée nominative de client final ne circule avant la signature d’un protocole de cession. Au-delà, ces données sont traitées conformément au règlement (UE) 2016/679.",
        ],
      },
      {
        heading: "Article 4. Durée",
        paragraphs: [
          `L’engagement prend effet le ${formatLongDate(issuedAt)}. Il vaut pour toutes les consultations faites sous l’immatriculation ORIAS n° ${fill(oriasNumber)}, et se poursuit trois ans après la dernière consultation, que la cession se réalise ou non. À la demande du cabinet concerné, le courtier restitue ou détruit les informations reçues dans les quinze jours.`,
        ],
      },
      {
        heading: "Article 5. Manquement et droit applicable",
        paragraphs: [
          "Un manquement peut entraîner la suspension du compte, sans préjudice des dommages et intérêts que le cabinet lésé pourrait réclamer. Le présent engagement est soumis au droit français.",
        ],
      },
    ],
    signatories: [{ label: "Le courtier", name: fill(party.legalName), capacity: `Représenté par ${fill(party.representative)}` }],
    notice: NOTICE,
    signedAt: null,
  };
}

export function buildIntermediationContract(party: DocumentParty, oriasNumber: string, issuedAt: Date): GeneratedDocument {
  return {
    key: "intermediation",
    title: "Contrat d’intermédiation",
    subtitle: "Mise en relation et accompagnement des cessions de portefeuilles de courtage",
    reference: `INT-${AGREEMENT_VERSION}`,
    sections: [
      commun(party, oriasNumber),
      {
        heading: "Article 1. Objet",
        paragraphs: [
          "La plateforme met en relation des courtiers qui cèdent ou acquièrent un portefeuille de contrats d’assurance, et met à leur disposition les outils de la transaction : annonce relue avant publication, séance d’offres, dossier de cession, pièces générées, signature électronique et séquestre du prix par un tiers habilité.",
        ],
      },
      {
        heading: "Article 2. Engagements de la plateforme",
        paragraphs: [
          "La plateforme relit chaque annonce avant publication, garde l’anonymat des cabinets jusqu’à l’offre retenue, vérifie l’identité des comptes et l’immatriculation ORIAS, et informe chaque partie des étapes du dossier.",
          "Elle ne détient jamais les fonds : le dépôt de garantie et le prix transitent par un prestataire de paiement ou de séquestre habilité. Elle n’est pas partie à la cession et ne garantit ni la valeur du portefeuille ni la conservation des contrats.",
        ],
      },
      {
        heading: "Article 3. Engagements du courtier",
        paragraphs: [
          "Le courtier déclare une immatriculation ORIAS valide et des informations exactes, les tient à jour, et répond de l’exactitude des pièces qu’il dépose.",
          "Acquéreur, il dépose une offre ferme, appuyée sur un accord de principe bancaire ou un justificatif de fonds, et un dépôt de garantie qui vient en déduction du prix si la cession aboutit et reste acquis au cédant à titre indemnitaire s’il se retire.",
          "Il s’interdit, pendant vingt-quatre mois après une mise en relation, de conclure hors de la plateforme une cession avec la contrepartie rencontrée par elle, sauf à régler les honoraires qui auraient été dus.",
        ],
      },
      {
        heading: "Article 4. Rémunération",
        paragraphs: [
          "La mise en vente est gratuite. Les honoraires et abonnements sont ceux des conditions tarifaires publiées sur la page Tarifs de la plateforme et acceptées à la souscription. Ils ne sont dus qu’aux conditions qui y sont prévues.",
        ],
      },
      {
        heading: "Article 5. Durée",
        paragraphs: [
          `Le contrat prend effet le ${formatLongDate(issuedAt)} et vaut pour toutes les annonces et cessions menées sous l’immatriculation ORIAS n° ${fill(oriasNumber)}. Il prend fin à la radiation de cette immatriculation ou à la clôture du compte ; les engagements de non-contournement et de confidentialité survivent pour leur durée propre.`,
        ],
      },
      {
        heading: "Article 6. Données personnelles et droit applicable",
        paragraphs: [
          "Les données du courtier sont traitées pour l’exécution du contrat et le respect des obligations de vigilance, conformément à la politique de confidentialité du site. Le contrat est soumis au droit français ; tout différend relève des juridictions compétentes du ressort du siège de la plateforme.",
        ],
      },
    ],
    signatories: [
      { label: "La plateforme", name: "La bourse du portefeuille", capacity: "Acceptation par la mise à disposition du service" },
      { label: "Le courtier", name: fill(party.legalName), capacity: `Représenté par ${fill(party.representative)}` },
    ],
    notice: NOTICE,
    signedAt: null,
  };
}

export function buildAgreement(kind: AgreementKind, party: DocumentParty, oriasNumber: string, issuedAt: Date) {
  return kind === "NDA" ? buildPlatformNda(party, oriasNumber, issuedAt) : buildIntermediationContract(party, oriasNumber, issuedAt);
}
