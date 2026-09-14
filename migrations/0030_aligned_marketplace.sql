-- Place de marché alignée : engagements signés une fois par cycle ORIAS,
-- justificatif de financement, dépôt par carte ou prélèvement, annonces
-- relues avant publication, profil du cabinet.

-- Engagement de confidentialité et contrat d'intermédiation, signés une fois
-- et valables tant que l'immatriculation ORIAS signée reste celle du compte.
CREATE TABLE "UserAgreement" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "userId" TEXT NOT NULL,
    "kind" TEXT NOT NULL,
    "version" TEXT NOT NULL,
    "oriasNumber" TEXT NOT NULL,
    "contentHash" TEXT NOT NULL,
    "signatureName" TEXT NOT NULL,
    "ipAddress" TEXT,
    "signedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "UserAgreement_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE CASCADE
);
CREATE UNIQUE INDEX "UserAgreement_userId_kind_version_oriasNumber_key" ON "UserAgreement"("userId", "kind", "version", "oriasNumber");

-- Mode de financement déclaré avec la capacité d'acquisition.
ALTER TABLE "User" ADD COLUMN "financingMode" TEXT;

-- Paiement du dépôt de garantie.
CREATE TABLE "DepositCheckout" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "listingId" TEXT NOT NULL,
    "buyerId" TEXT NOT NULL,
    "method" TEXT NOT NULL,
    "amountCents" INTEGER NOT NULL,
    "sessionId" TEXT,
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "pendingOffer" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "DepositCheckout_listingId_fkey" FOREIGN KEY ("listingId") REFERENCES "Listing" ("id") ON DELETE CASCADE,
    CONSTRAINT "DepositCheckout_buyerId_fkey" FOREIGN KEY ("buyerId") REFERENCES "User" ("id") ON DELETE CASCADE
);
CREATE INDEX "DepositCheckout_buyerId_idx" ON "DepositCheckout"("buyerId");
CREATE INDEX "DepositCheckout_sessionId_idx" ON "DepositCheckout"("sessionId");

ALTER TABLE "InterestDeposit" ADD COLUMN "paymentMethod" TEXT;
ALTER TABLE "InterestDeposit" ADD COLUMN "paymentRef" TEXT;
ALTER TABLE "InterestDeposit" ADD COLUMN "paymentStatus" TEXT NOT NULL DEFAULT 'RECORDED';

-- Relecture des annonces avant publication.
ALTER TABLE "Listing" ADD COLUMN "submittedForReviewAt" DATETIME;
ALTER TABLE "Listing" ADD COLUMN "reviewedAt" DATETIME;
ALTER TABLE "Listing" ADD COLUMN "reviewNote" TEXT;

-- Profil du cabinet : positionnement, organisation, conformité, stratégie.
ALTER TABLE "Firm" ADD COLUMN "profileJson" TEXT NOT NULL DEFAULT '{}';
