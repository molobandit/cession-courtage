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
