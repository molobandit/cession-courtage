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

export const LISTING_STATUS_LABELS: Record<ListingStatus, string> = {
  DRAFT: "Brouillon",
  PUBLISHED: "Publiée",
  OFFERS_OPEN: "Offres ouvertes",
  OFFERS_CLOSED: "Fenêtre close",
  UNDER_NEGOTIATION: "En négociation",
  SOLD: "Cédée",
  WITHDRAWN: "Retirée",
};

export const DEAL_STAGE_LABELS: Record<DealStage, string> = {
  NDA: "Confidentialité",
  DATA_ROOM: "Salle de données",
  LOI: "Lettre d'intention",
  KYC: "Vérification KYC",
  DEED: "Acte",
  SIGNATURE: "Signature",
  ESCROW: "Séquestre",
  TRANSFER: "Transfert",
  RETENTION: "Rétention",
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
