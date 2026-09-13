-- Cession rapide en cinq étapes : offre acceptée, vérifications, signature,
-- paiement et transfert, solde.
--
-- Le compte se vérifie une seule fois : les pièces d'identification du cabinet
-- (Kbis, pièce d'identité, RC professionnelle, bénéficiaires effectifs) sont
-- déposées dans le profil et contrôlées par la plateforme, puis valent pour
-- toutes les cessions. La confidentialité est acceptée par l'acquéreur à son
-- dépôt, par le cédant quand il retient l'offre ; l'offre porte la date d'effet
-- et vaut lettre d'intention.

CREATE TABLE "AccountDocument" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "userId" TEXT NOT NULL,
    "kind" TEXT NOT NULL,
    "fileName" TEXT NOT NULL,
    "storageKey" TEXT NOT NULL,
    "sha256" TEXT NOT NULL,
    "contentType" TEXT,
    "sizeBytes" INTEGER,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AccountDocument_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE CASCADE
);
CREATE INDEX "AccountDocument_userId_idx" ON "AccountDocument"("userId");

ALTER TABLE "User" ADD COLUMN "kycReviewedAt" DATETIME;
ALTER TABLE "User" ADD COLUMN "kycReviewNote" TEXT;
ALTER TABLE "Offer" ADD COLUMN "effectiveDate" DATETIME;
ALTER TABLE "InterestDeposit" ADD COLUMN "ndaAcceptedAt" DATETIME;
ALTER TABLE "Deal" ADD COLUMN "fundsOrigin" TEXT;

-- Les étapes intermédiaires sont regroupées.
UPDATE "Deal" SET "stage" = 'DATA_ROOM' WHERE "stage" IN ('NDA', 'LOI', 'KYC');
UPDATE "Deal" SET "stage" = 'SIGNATURE' WHERE "stage" = 'DEED';
UPDATE "Deal" SET "stage" = 'TRANSFER' WHERE "stage" = 'ESCROW';
