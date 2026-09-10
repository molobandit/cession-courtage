-- Champs du brief Le Bon Portefeuille (cabinet, annonce, certification, investisseurs).
-- Pas de PII de client final : societe et contact pro uniquement.

ALTER TABLE "Firm" ADD COLUMN "website" TEXT;
ALTER TABLE "Firm" ADD COLUMN "activityType" TEXT;

ALTER TABLE "User" ADD COLUMN "jobTitle" TEXT;

ALTER TABLE "Listing" ADD COLUMN "presentation" TEXT;
ALTER TABLE "Listing" ADD COLUMN "cessionMotive" TEXT;
ALTER TABLE "Listing" ADD COLUMN "negotiable" INTEGER NOT NULL DEFAULT 1;
ALTER TABLE "Listing" ADD COLUMN "certificationRequested" INTEGER NOT NULL DEFAULT 0;
ALTER TABLE "Listing" ADD COLUMN "portfolioKind" TEXT;
ALTER TABLE "Listing" ADD COLUMN "branchActivity" TEXT;
ALTER TABLE "Listing" ADD COLUMN "desiredCessionDate" TEXT;
ALTER TABLE "Listing" ADD COLUMN "precompte" INTEGER;
ALTER TABLE "Listing" ADD COLUMN "precompteAmount" TEXT;

ALTER TABLE "InvestorInquiry" ADD COLUMN "jobTitle" TEXT;
ALTER TABLE "InvestorInquiry" ADD COLUMN "sectors" TEXT;
ALTER TABLE "InvestorInquiry" ADD COLUMN "listingId" TEXT;

CREATE TABLE "CertificationDocument" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "listingId" TEXT NOT NULL,
    "category" TEXT NOT NULL,
    "label" TEXT NOT NULL,
    "required" INTEGER NOT NULL DEFAULT 0,
    "status" TEXT NOT NULL DEFAULT 'MISSING',
    "fileName" TEXT,
    "storageKey" TEXT,
    "teamComment" TEXT,
    "uploadedAt" DATETIME,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX "CertificationDocument_listingId_idx" ON "CertificationDocument"("listingId");
