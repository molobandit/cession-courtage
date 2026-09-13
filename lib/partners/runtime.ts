import "server-only";
import { mockEscrowHold, mockEscrowRelease, mockSignDocument, mockVerifyKyc } from "@/lib/integrations/mocks";
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
