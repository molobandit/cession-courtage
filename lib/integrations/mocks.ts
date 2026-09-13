import "server-only";
import { prisma } from "@/lib/prisma";

export async function mockVerifyKyc(userId: string): Promise<{ providerRef: string }> {
  const providerRef = `mock_kyc_${userId.slice(-6)}_${Date.now()}`;
  await prisma.user.update({
    where: { id: userId },
    data: { kycStatus: "VERIFIED" },
  });
  return { providerRef };
}

export async function mockSignDocument(documentId: string): Promise<{ providerRef: string; signedAt: Date }> {
  const signedAt = new Date();
  await prisma.document.update({
    where: { id: documentId },
    data: { signedAt },
  });
  return { providerRef: `mock_esign_${documentId.slice(-6)}`, signedAt };
}

export async function mockEscrowHold(dealId: string): Promise<{ providerRef: string }> {
  const providerRef = `mock_escrow_${dealId.slice(-6)}`;
  await prisma.deal.update({
    where: { id: dealId },
    data: { escrowStage: "FUNDS_HELD", escrowProviderRef: providerRef },
  });
  return { providerRef };
}

export async function mockEscrowRelease(dealId: string): Promise<void> {
  await prisma.deal.update({
    where: { id: dealId },
    data: { escrowStage: "RELEASED" },
  });
}

/*
 * Équivalents pour les dossiers de gré à gré. Ils écrivent sur `DirectDeal`,
 * qui porte ses propres colonnes : le gré à gré n'a de ligne ni dans `Deal` ni
 * dans `Document`, et les fonctions ci-dessus y échoueraient.
 */

export async function mockDirectEscrowHold(directDealId: string): Promise<{ providerRef: string }> {
  const providerRef = `mock_escrow_direct_${directDealId.slice(-6)}`;
  await prisma.directDeal.update({
    where: { id: directDealId },
    data: { escrowStage: "FUNDS_HELD", escrowProviderRef: providerRef },
  });
  return { providerRef };
}

export async function mockDirectEscrowRelease(directDealId: string): Promise<void> {
  await prisma.directDeal.update({
    where: { id: directDealId },
    data: { escrowStage: "RELEASED" },
  });
}

export async function mockDirectSignDeed(
  directDealId: string,
): Promise<{ providerRef: string; signedAt: Date }> {
  const signedAt = new Date();
  const providerRef = `mock_esign_direct_${directDealId.slice(-6)}`;
  await prisma.directDeal.update({
    where: { id: directDealId },
    data: { deedSignedAt: signedAt, signatureProviderRef: providerRef },
  });
  return { providerRef, signedAt };
}
