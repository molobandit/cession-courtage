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
  DRAFT: "Brouillon",
  PENDING_REVIEW: "En cours de cotation",
  PUBLISHED: "Offres ouvertes",
  OFFERS_OPEN: "Séance en cours",
  OFFERS_CLOSED: "Offres ouvertes",
  UNDER_NEGOTIATION: "En négociation",
  SOLD: "Vendu",
  WITHDRAWN: "Retiré du marché",
};

export const DEAL_STAGE_LABELS: Record<DealStage, string> = {
  NDA: "Offre acceptée",
  DATA_ROOM: "Vérifications",
  LOI: "Vérifications",
  KYC: "Vérifications",
  DEED: "Signature",
  SIGNATURE: "Signature",
  ESCROW: "Paiement et transfert",
  TRANSFER: "Paiement et transfert",
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
  NONE: "Aucun",
  FUNDS_HELD: "Fonds séquestrés",
  PARTIAL_RELEASE: "Libération partielle",
  RELEASED: "Libérés",
  REFUNDED: "Remboursés",
};

export const DISTRIBUTION_LABELS: Record<DistributionMode, string> = {
  OFFICE: "Bureau",
  AGENCY: "Agence",
  REMOTE: "À distance",
  MIXED: "Mixte",
};

export const DOCUMENT_TYPE_LABELS: Record<string, string> = {
  NDA: "Accord de confidentialité",
  LOI: "Lettre d’intention",
  DEED: "Acte de cession",
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
