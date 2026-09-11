-- Verification de la capacite financiere des acquereurs.
-- Le site affirme publiquement que « la capacite financiere est verifiee » :
-- sans trace datee et opposable, l'allegation serait invérifiable.
-- Additif : les 24 comptes existants restent a NONE.

ALTER TABLE "User" ADD COLUMN "financialCapacityEur" DECIMAL;
ALTER TABLE "User" ADD COLUMN "financialCapacityStatus" TEXT NOT NULL DEFAULT 'NONE';
ALTER TABLE "User" ADD COLUMN "financialCapacityAt" DATETIME;
ALTER TABLE "User" ADD COLUMN "financialCapacityNote" TEXT;

CREATE INDEX "User_financialCapacityStatus_idx" ON "User"("financialCapacityStatus");
