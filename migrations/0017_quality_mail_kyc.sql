-- Champs facultatifs cahier des charges §6, idempotence mail, KYC et lookup ORIAS.
-- Additive : les portefeuilles existants restent lisibles.

ALTER TABLE "Portfolio" ADD COLUMN "commissionsYear1" DECIMAL;
ALTER TABLE "Portfolio" ADD COLUMN "commissionsYear2" DECIMAL;
ALTER TABLE "Portfolio" ADD COLUMN "commissionsYear3" DECIMAL;
ALTER TABLE "Portfolio" ADD COLUMN "recurrentCommissionShare" DECIMAL;
ALTER TABLE "Portfolio" ADD COLUMN "managedAnnualPremium" DECIMAL;

ALTER TABLE "OutboundEmail" ADD COLUMN "dedupeKey" TEXT;
CREATE UNIQUE INDEX "OutboundEmail_dedupeKey_key" ON "OutboundEmail"("dedupeKey");

ALTER TABLE "User" ADD COLUMN "kycSubmittedAt" DATETIME;
ALTER TABLE "User" ADD COLUMN "oriasLookupStatus" TEXT;
ALTER TABLE "User" ADD COLUMN "oriasLookupAt" DATETIME;
ALTER TABLE "User" ADD COLUMN "oriasLookupName" TEXT;
ALTER TABLE "User" ADD COLUMN "oriasLookupSiren" TEXT;
ALTER TABLE "User" ADD COLUMN "oriasLookupDetail" TEXT;
