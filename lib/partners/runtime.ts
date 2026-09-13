import "server-only";
import {
  mockDirectEscrowHold,
  mockDirectEscrowRelease,
  mockDirectSignDeed,
  mockEscrowHold,
  mockEscrowRelease,
  mockSignDocument,
  mockVerifyKyc,
} from "@/lib/integrations/mocks";
import { identityRailLive, partnerIsLive, signatureProvider, signatureRailLive } from "@/lib/partners/status";

/**
 * Point unique à brancher quand les contrats seront validés et l’adaptateur
 * livré. Tant que partnerIsLive reste faux, le dossier avance sans mouvement
 * d’argent et sans envoi de pièce à un tiers.
 */

export async function holdEscrowFunds(dealId: string) {
  if (partnerIsLive("trustap")) {
    // Brancher ici l’API Trustap (création de transaction).
    return mockEscrowHold(dealId);
  }
  return mockEscrowHold(dealId);
}

export async function releaseEscrowFunds(dealId: string) {
  if (partnerIsLive("trustap")) {
    return mockEscrowRelease(dealId);
  }
  return mockEscrowRelease(dealId);
}

export async function signDealDocument(documentId: string) {
  if (signatureRailLive()) {
    void signatureProvider();
    return mockSignDocument(documentId);
  }
  return mockSignDocument(documentId);
}

export async function verifyPartyIdentity(userId: string) {
  if (identityRailLive()) {
    return mockVerifyKyc(userId);
  }
  return mockVerifyKyc(userId);
}

/*
 * Dossiers de gré à gré.
 *
 * Mêmes rails, mêmes conditions d'activation que le tunnel intermédié : quand
 * l'adaptateur Trustap ou de signature sera livré, les deux parcours en
 * profiteront d'un seul branchement. Seul l'enregistrement local diffère, parce
 * qu'un dossier de gré à gré vit dans sa propre table.
 */

export async function holdDirectEscrow(directDealId: string) {
  if (partnerIsLive("trustap")) {
    // Brancher ici l'API Trustap, comme pour holdEscrowFunds.
    return mockDirectEscrowHold(directDealId);
  }
  return mockDirectEscrowHold(directDealId);
}

export async function releaseDirectEscrow(directDealId: string) {
  if (partnerIsLive("trustap")) {
    return mockDirectEscrowRelease(directDealId);
  }
  return mockDirectEscrowRelease(directDealId);
}

export async function signDirectDeed(directDealId: string) {
  if (signatureRailLive()) {
    void signatureProvider();
    return mockDirectSignDeed(directDealId);
  }
  return mockDirectSignDeed(directDealId);
}
