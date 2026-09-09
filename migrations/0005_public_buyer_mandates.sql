-- Demandes d'acquisition publiees au catalogue.
-- L'acquereur reste anonyme : seul son alias public apparait.
ALTER TABLE "BuyerMandate" ADD COLUMN "isPublic" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "BuyerMandate" ADD COLUMN "publicNumber" INTEGER;
CREATE UNIQUE INDEX "BuyerMandate_publicNumber_key" ON "BuyerMandate"("publicNumber");
