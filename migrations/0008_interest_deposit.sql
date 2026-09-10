-- Depot d'interet de 2,5 % : c'est lui qui leve l'anonymat, sans attendre la LOI.
-- Simule, aucun encaissement reel. L'unicite du couple annonce/acquereur rend
-- un rejeu inoffensif, D1 n'ayant pas de transactions.

CREATE TABLE "InterestDeposit" (
  "id"        TEXT PRIMARY KEY NOT NULL,
  "listingId" TEXT NOT NULL,
  "buyerId"   TEXT NOT NULL,
  "amount"    DECIMAL NOT NULL,
  "rate"      DECIMAL NOT NULL,
  "placedAt"  DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "InterestDeposit_listingId_fkey" FOREIGN KEY ("listingId") REFERENCES "Listing"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT "InterestDeposit_buyerId_fkey" FOREIGN KEY ("buyerId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

CREATE UNIQUE INDEX "InterestDeposit_listingId_buyerId_key" ON "InterestDeposit"("listingId", "buyerId");
CREATE INDEX "InterestDeposit_buyerId_idx" ON "InterestDeposit"("buyerId");
