-- Suivi du transfert des codes de courtage, compagnie par compagnie.
-- Le refus d'une compagnie coupe la continuite des commissions apres signature :
-- c'est le premier motif d'echec d'une cession en France.
CREATE TABLE "CarrierCode" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "portfolioId" TEXT NOT NULL,
    "carrier" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "notifiedAt" DATETIME,
    "decidedAt" DATETIME,
    "note" TEXT,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "CarrierCode_portfolioId_fkey" FOREIGN KEY ("portfolioId")
      REFERENCES "Portfolio" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
CREATE UNIQUE INDEX "CarrierCode_portfolioId_carrier_key" ON "CarrierCode"("portfolioId", "carrier");
CREATE INDEX "CarrierCode_portfolioId_status_idx" ON "CarrierCode"("portfolioId", "status");

-- Bordereau des pieces reclamees en verification prealable.
CREATE TABLE "DueDiligenceItem" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "dealId" TEXT NOT NULL,
    "category" TEXT NOT NULL,
    "label" TEXT NOT NULL,
    "required" BOOLEAN NOT NULL DEFAULT true,
    "providedAt" DATETIME,
    "note" TEXT,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "DueDiligenceItem_dealId_fkey" FOREIGN KEY ("dealId")
      REFERENCES "Deal" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
CREATE UNIQUE INDEX "DueDiligenceItem_dealId_label_key" ON "DueDiligenceItem"("dealId", "label");
CREATE INDEX "DueDiligenceItem_dealId_category_idx" ON "DueDiligenceItem"("dealId", "category");
