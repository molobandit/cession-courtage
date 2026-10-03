import {
  ClientSegment,
  CommissionType,
  DealStage,
  EscrowStage,
  KycStatus,
  ListingStatus,
  MatchStatus,
  OfferStatus,
  RiskType,
  UserRole,
  type DistributionMode,
  type FinancingMode,
} from "@prisma/client";

export const RISK_TYPE_LABELS: Record<RiskType, string> = {
  HEALTH_INDIVIDUAL: "Santé individuelle",
  HEALTH_SENIOR: "Santé senior",
  HEALTH_GROUP: "Santé collective",
  PROVIDENT: "Prévoyance",
  LOAN_INSURANCE: "Emprunteur",
  AUTO: "Automobile",
  HOME: "Habitation",
  MOTORCYCLE: "Deux-roues",
  PROFESSIONAL_MULTIRISK: "Multirisque pro",
  PROFESSIONAL_LIABILITY: "RC professionnelle",
  DECENNIAL: "Décennale",
  LEGAL_PROTECTION: "Protection juridique",
  FUNERAL: "Obsèques",
  SAVINGS: "Épargne",
  RETIREMENT: "Retraite",
  FLEET: "Flotte",
  LANDLORD: "PNO",
  OTHER: "Autre",
};

export const SEGMENT_LABELS: Record<ClientSegment, string> = {
  INDIVIDUAL: "Particuliers",
  PROFESSIONAL: "Professionnels",
  COMPANY: "Entreprises",
};

export const COMMISSION_TYPE_LABELS: Record<CommissionType, string> = {
  LINEAR: "Linéaire",
  ADVANCED: "Précomptée",
};

/**
 * Vocabulaire de cotation, identique à `MARKET_STATUS_LABELS` : une annonce dont
 * la séance de 21 jours est terminée reçoit encore des offres, elle est donc
 * « ouverte », pas « close ».
 */
export const LISTING_STATUS_LABELS: Record<ListingStatus, string> = {
  DRAFT: "Dossier à envoyer",
  PENDING_REVIEW: "Étude en cours",
  PUBLISHED: "Disponible",
  OFFERS_OPEN: "Disponible",
  OFFERS_CLOSED: "Disponible",
  UNDER_NEGOTIATION: "Acquéreur positionné",
  SOLD: "Vendu",
  WITHDRAWN: "Retiré du marché",
};

export const DEAL_STAGE_LABELS: Record<DealStage, string> = {
  NDA: "Procédure ouverte",
  DATA_ROOM: "Vérifications",
  LOI: "Vérifications",
  KYC: "Vérifications",
  DEED: "Signature des contrats",
  SIGNATURE: "Signature des contrats",
  ESCROW: "Fonds dans le trust",
  TRANSFER: "Transfert des contrats",
  RETENTION: "Solde",
  CLOSED: "Clôturé",
};

export const OFFER_STATUS_LABELS: Record<OfferStatus, string> = {
  SUBMITTED: "Déposée",
  WITHDRAWN: "Retirée",
  ACCEPTED: "Acceptée",
  DECLINED: "Déclinée",
};

export const MATCH_STATUS_LABELS: Record<MatchStatus, string> = {
  SUGGESTED: "Suggérée",
  VIEWED: "Consultée",
  CONTACTED: "Contactée",
  REJECTED: "Écartée",
};

export const ESCROW_STAGE_LABELS: Record<EscrowStage, string> = {
  NONE: "Pas encore versé",
  FUNDS_HELD: "Sur le compte sécurisé",
  PARTIAL_RELEASE: "Versé en partie au cédant",
  RELEASED: "Versé au cédant",
  REFUNDED: "Remboursé",
};

export const DISTRIBUTION_LABELS: Record<DistributionMode, string> = {
  OFFICE: "Bureau",
  AGENCY: "Agence",
  REMOTE: "À distance",
  MIXED: "Mixte",
};

export const DOCUMENT_TYPE_LABELS: Record<string, string> = {
  NDA: "Engagement de confidentialité",
  /*
   * La lettre d'intention n'existe plus dans le modèle : l'engagement se
   * prend en versant le dépôt de positionnement. Les pièces déjà signées
   * sous ce type restent lisibles, sous le nom de ce qu'elles contiennent.
   */
  LOI: "Engagement de reprise",
  DEED: "Contrat de cession",
  TRANSFER_CERTIFICATE: "Attestation de transfert",
  OTHER: "Autre pièce",
};

export const DEAL_STAGE_ORDER: DealStage[] = [
  "NDA",
  "DATA_ROOM",
  "LOI",
  "KYC",
  "DEED",
  "SIGNATURE",
  "ESCROW",
  "TRANSFER",
  "RETENTION",
  "CLOSED",
];

export const FINANCING_LABELS: Record<FinancingMode, string> = {
  CASH: "Comptant",
  CREDIT: "Crédit",
  BOTH: "Comptant ou crédit",
};

export const ROLE_LABELS: Record<UserRole, string> = {
  SELLER: "Cédant",
  BUYER: "Acquéreur",
  BOTH: "Cédant et acquéreur",
  ADMIN: "Administrateur",
  INVESTOR: "Investisseur",
};

export const KYC_STATUS_LABELS: Record<KycStatus, string> = {
  NONE: "Non commencé",
  PENDING: "En cours",
  VERIFIED: "Vérifié",
  REJECTED: "Refusé",
};
