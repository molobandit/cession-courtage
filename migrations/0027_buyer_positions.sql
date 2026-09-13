-- Prise de position d'un acquéreur sur une annonce.
--
-- « Prendre position » n'enregistrait rien : le cédant ne l'apprenait pas,
-- l'acquéreur ne retrouvait aucun dossier sur son tableau de bord, et la
-- candidature n'existait qu'à partir de l'offre. Une position est le point de
-- départ du dossier, suivi étape par étape jusqu'à la clôture.
--
-- `proposalId` rattache la position à la proposition d'un cédant, quand
-- l'acquéreur arrive depuis sa demande d'acquisition.

CREATE TABLE "BuyerPosition" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "listingId" TEXT NOT NULL,
    "buyerId" TEXT NOT NULL,
    "proposalId" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "BuyerPosition_listingId_fkey" FOREIGN KEY ("listingId") REFERENCES "Listing" ("id") ON DELETE CASCADE,
    CONSTRAINT "BuyerPosition_buyerId_fkey" FOREIGN KEY ("buyerId") REFERENCES "User" ("id") ON DELETE CASCADE,
    CONSTRAINT "BuyerPosition_proposalId_fkey" FOREIGN KEY ("proposalId") REFERENCES "MandateProposal" ("id") ON DELETE SET NULL
);

CREATE UNIQUE INDEX "BuyerPosition_listingId_buyerId_key" ON "BuyerPosition"("listingId", "buyerId");
CREATE INDEX "BuyerPosition_buyerId_idx" ON "BuyerPosition"("buyerId");

-- Les candidatures déjà engagées (dépôt ou offre) deviennent des positions.
INSERT OR IGNORE INTO "BuyerPosition" ("id", "listingId", "buyerId", "createdAt", "updatedAt")
SELECT 'pos_' || "id", "listingId", "buyerId", "submittedAt", "submittedAt" FROM "Offer";

INSERT OR IGNORE INTO "BuyerPosition" ("id", "listingId", "buyerId", "createdAt", "updatedAt")
SELECT 'pos_' || "id", "listingId", "buyerId", "placedAt", "placedAt" FROM "InterestDeposit";
