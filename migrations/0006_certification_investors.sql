-- Annonce simple vs portefeuille certifie (due diligence).
ALTER TABLE "Listing" ADD COLUMN "certificationStatus" TEXT NOT NULL DEFAULT 'NONE';

-- Manifestations d'interet investisseurs. Grain : societe / contact pro, jamais un client final.
CREATE TABLE "InvestorInquiry" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "organisation" TEXT NOT NULL,
    "fullName" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "phone" TEXT,
    "investorType" TEXT NOT NULL,
    "ticketMinEur" INTEGER,
    "ticketMaxEur" INTEGER,
    "zones" TEXT NOT NULL,
    "intervention" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX "InvestorInquiry_createdAt_idx" ON "InvestorInquiry"("createdAt");

-- Claire 10005 et Sofia 10007 : portefeuilles certifies pour le catalogue de demo.
UPDATE "Listing" SET "certificationStatus" = 'CERTIFIED' WHERE "publicNumber" IN (10005, 10007);
