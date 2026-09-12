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
      "Règlement de l’abonnement annuel par carte. Le prix de cession ne passe jamais par ce canal.",
    detail:
      "Stripe encaisse uniquement ce que La bourse du portefeuille facture pour l’accès au détail des offres et à la messagerie. Un plafond carte trop bas peut se régler par un autre moyen une fois le contrat élargi. La plateforme ne voit pas le numéro complet de la carte.",
    termsUrl: "https://stripe.com/fr",
  },
  {
    id: "trustap",
    name: "Trustap",
    role: "Séquestre du prix",
    envKey: "TRUSTAP_API_KEY",
    purpose:
      "Conservation du prix de vente hors des comptes de La bourse du portefeuille, puis libération par étapes.",
    detail:
      "L’acquéreur verse d’abord la part comptant, soit quatre cinquièmes du prix convenu. Trustap conserve jusqu’à la signature et jusqu’au transfert auprès des compagnies et de l’ORIAS. Le cinquième restant sort après la période de vérification. Si la cession s’arrête, le solde consigné revient à l’acquéreur. Un dépôt d’intérêt déjà versé peut rester à titre d’engagement, selon les conditions du dossier.",
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
      "DocuSign reste disponible comme prestataire alternatif, dans le même cadre eIDAS. Un seul rail de signature sera actif à la fois, selon la variable SIGNATURE_PROVIDER. Cela évite deux originaux contradictoires sur le même acte.",
    termsUrl: "https://www.docusign.com/fr-fr/company/terms-and-conditions",
  },
  {
    id: "identity",
    name: "Conformité",
    role: "Vérification d’identité",
    envKey: "IDENTITY_API_KEY",
    purpose:
      "Contrôle KYC et KYB des cabinets avant l’acte, exigé pour ouvrir un séquestre.",
    detail:
      "Le prestataire de conformité sera désigné à la validation du contrat. Jusque-là le dossier enregistre l’étape sans transmettre de pièce d’identité à un tiers. Aucune donnée nominative de client final n’entre dans ce contrôle : il concerne le courtier et sa société.",
    termsUrl: null,
  },
  {
    id: "financing",
    name: "Financement",
    role: "Prêt professionnel",
    envKey: "FINANCING_PARTNER_LIVE",
    purpose:
      "Aide à financer l’acquisition lorsque le comptant ne suffit pas. Ce n’est pas un séquestre.",
    detail:
      "Le circuit prévoit un courtier en financement professionnel, du type de ceux qui montent un prêt d’acquisition de fonds de commerce. La mise en relation s’activera dès validation du contrat. En attendant, un entretien avec un conseiller oriente le projet sans engagement.",
    termsUrl: null,
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
    body: "ORIAS à l’entrée, puis vérification d’identité des parties avant l’acte. Les assurés du portefeuille restent hors de ce périmètre.",
  },
];

export const LIVE_BADGE = "Circuit actif";
export const READY_BADGE = "Prêt. Contrat à valider";

export function hasForbiddenDash(text: string): boolean {
  return /[—–]/.test(text) || / - /.test(text);
}
