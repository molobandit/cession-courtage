export type PartnerId =
  | "stripe"
  | "trustap"
  | "yousign"
  | "docusign"
  | "identity"
  | "financing";

export type PartnerCopy = {
  id: PartnerId;
  name: string;
  role: string;
  purpose: string;
  detail: string;
  termsUrl: string | null;
  envKey: string;
};

/**
 * Circuit de confiance. Les contrats se valident plus tard ; les textes
 * restent ceux du site. Aucun tiret dans les phrases publiques.
 */
export const PARTNERS: PartnerCopy[] = [
  {
    id: "stripe",
    name: "Stripe",
    role: "Accès au marché",
    envKey: "STRIPE_SECRET_KEY",
    purpose:
      "Règlement de l’abonnement annuel et des dépôts d’intérêt inférieurs à 999 euros, par carte. Le prix de cession ne passe jamais par ce canal.",
    detail:
      "Stripe encaisse ce que La bourse du portefeuille facture pour l’accès au détail des offres et à la messagerie. Un dépôt d’intérêt sous 999 euros emprunte le même rail carte. Un plafond carte trop bas pourra passer par un prélèvement SEPA une fois ce moyen ouvert au contrat. La plateforme ne voit pas le numéro complet de la carte.",
    termsUrl: "https://stripe.com/fr/legal/ssa",
  },
  {
    id: "trustap",
    name: "Trustap",
    role: "Séquestre du prix",
    envKey: "TRUSTAP_API_KEY",
    purpose:
      "Conservation du prix de vente et des dépôts à partir de 999 euros, hors des comptes de La bourse du portefeuille, puis libération par étapes.",
    detail:
      "Trustap est prévu pour le séquestre, certifié PCI DSS de niveau 1, avec les contrôles d’identité et de lutte contre le blanchiment exigés pour ce métier. L’acquéreur verse d’abord la part comptant, soit quatre cinquièmes du prix convenu. La libération suit la signature, le transfert auprès des compagnies et de l’ORIAS, puis la période de vérification pour le cinquième restant. Un litige reste chez Trustap, pas chez l’éditeur. Si la cession s’arrête, le solde consigné revient à l’acquéreur.",
    termsUrl: "https://www.trustap.com/terms/",
  },
  {
    id: "yousign",
    name: "Yousign",
    role: "Signature électronique",
    envKey: "YOUSIGN_API_KEY",
    purpose:
      "Signature de l’accord de confidentialité, de la lettre d’intention et de l’acte, avec une preuve opposable.",
    detail:
      "Yousign porte le parcours de signature prévu pour la France, conforme au règlement européen sur l’identification électronique. Chaque partie reçoit un exemplaire numérique. Seul le représentant habilité signe. Tant que la clé n’est pas validée, l’étape est enregistrée sur le dossier sans valeur de signature qualifiée.",
    termsUrl: "https://yousign.com/fr-fr/conditions-generales",
  },
  {
    id: "docusign",
    name: "DocuSign",
    role: "Signature électronique de secours",
    envKey: "DOCUSIGN_API_KEY",
    purpose:
      "Autre rail de signature, prêt si le contrat Yousign n’est pas retenu.",
    detail:
      "DocuSign reste disponible comme prestataire alternatif, dans le même cadre eIDAS. Un seul rail de signature sera actif à la fois. Cela évite deux originaux contradictoires sur le même acte.",
    termsUrl: "https://www.docusign.com/fr-fr/company/terms-and-conditions",
  },
  {
    id: "identity",
    name: "Ondorse",
    role: "Vérification d’identité",
    envKey: "ONDORSE_API_KEY",
    purpose:
      "Contrôle KYC et KYB des cabinets avant l’acte, exigé pour ouvrir un séquestre.",
    detail:
      "Ondorse est le prestataire de conformité visé pour l’identité du courtier et de sa société, y compris le filtrage contre le blanchiment. Jusqu’à la validation du contrat, le dossier enregistre l’étape sans transmettre de pièce à un tiers. Aucune donnée nominative de client final n’entre dans ce contrôle.",
    termsUrl: "https://www.ondorse.co/fr",
  },
  {
    id: "financing",
    name: "CrediPro",
    role: "Prêt professionnel",
    envKey: "CREDIPRO_LIVE",
    purpose:
      "Aide à financer l’acquisition, ou à refinancer un achat déjà payé comptant. Ce n’est pas un séquestre.",
    detail:
      "CrediPro est le courtier en financement professionnel visé. Deux usages : monter le prêt pour acheter, et le post-financement si l’acquéreur a déjà payé comptant et veut dégager de la trésorerie. L’étude de faisabilité sera gratuite dès validation du contrat. Le prêt, une fois obtenu, alimente Trustap. La bourse du portefeuille ne prête pas.",
    termsUrl: "https://www.credipro.com",
  },
];

export const TRUST_PILLARS: { title: string; body: string }[] = [
  {
    title: "Aucun fonds sur nos comptes",
    body: "La bourse du portefeuille n’encaisse pas le prix de cession. L’abonnement passe par Stripe. Le prix passe par le séquestre Trustap, une fois le contrat validé.",
  },
  {
    title: "Libération conditionnée",
    body: "Quatre cinquièmes du prix sont consignés à la signature. Le cinquième restant sort après le transfert et le contrôle de conservation du portefeuille.",
  },
  {
    title: "Preuve de signature",
    body: "Les actes suivent un prestataire de signature électronique. Tant que le contrat n’est pas validé, l’étape est tracée sur le dossier sans se faire passer pour une signature qualifiée.",
  },
  {
    title: "Identités professionnelles",
    body: "ORIAS à l’entrée, puis Ondorse pour l’identité des parties avant l’acte. Les assurés du portefeuille restent hors de ce périmètre.",
  },
];

export const STRIPE_CARD_DEPOSIT_CEILING_EUR = 999;

export function depositPaymentRail(amountEur: number): "stripe" | "trustap" {
  return amountEur < STRIPE_CARD_DEPOSIT_CEILING_EUR ? "stripe" : "trustap";
}

export const LIVE_BADGE = "Circuit actif";
export const READY_BADGE = "Prêt. Contrat à valider";

/** Phrase unique pour les écrans qui parlent encore d’encaissement. */
export const CESSION_FUNDS_DISCLAIMER =
  "La bourse du portefeuille n’encaisse pas le prix de cession. Tant que Trustap n’est pas activé, dépôt et séquestre s’enregistrent sans mouvement d’argent.";

export function hasForbiddenDash(text: string): boolean {
  return /[—–]/.test(text) || / - /.test(text);
}
