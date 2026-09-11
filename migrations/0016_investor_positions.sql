-- Interet qualifie apres depot (2,5 % du prix de cession).
-- oriasNumber reste NOT NULL cote SQLite/D1 (reconstruction User impossible
-- tant que les cles etrangeres D1 restent actives). Les comptes investisseurs
-- recoivent un jeton unique interne, jamais affiche.

CREATE TABLE "InvestorPosition" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "listingId" TEXT NOT NULL,
    "investorId" TEXT NOT NULL,
    "depositAmount" DECIMAL NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "InvestorPosition_listingId_fkey" FOREIGN KEY ("listingId") REFERENCES "Listing" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "InvestorPosition_investorId_fkey" FOREIGN KEY ("investorId") REFERENCES "User" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);
CREATE UNIQUE INDEX "InvestorPosition_listingId_investorId_key" ON "InvestorPosition"("listingId", "investorId");
CREATE INDEX "InvestorPosition_investorId_idx" ON "InvestorPosition"("investorId");
