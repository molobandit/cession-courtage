-- Parcours de cession réel : pièces, doubles validations, signatures.
--
-- Le dossier avançait d'un clic, de n'importe quelle partie, sur des pièces
-- factices. Une étape n'est désormais franchie que lorsque ses conditions sont
-- remplies : pièces déposées, lettre d'intention proposée puis acceptée,
-- protocole approuvé et signé par les deux cabinets.
--
-- `DealSignoff` garde la trace de chaque engagement d'une partie (qui, quand,
-- sur quel contenu). `Document.slot` rattache un fichier à ce qu'il justifie :
-- une ligne du bordereau, une pièce d'identification, une attestation.

ALTER TABLE "Deal" ADD COLUMN "loiPrice" DECIMAL;
ALTER TABLE "Deal" ADD COLUMN "loiEffectiveDate" DATETIME;
ALTER TABLE "Deal" ADD COLUMN "loiConditions" TEXT;
ALTER TABLE "Deal" ADD COLUMN "loiProposedAt" DATETIME;
ALTER TABLE "Deal" ADD COLUMN "loiDeclinedAt" DATETIME;
ALTER TABLE "Deal" ADD COLUMN "loiDeclineReason" TEXT;
ALTER TABLE "Deal" ADD COLUMN "transferCarriers" TEXT NOT NULL DEFAULT '[]';

ALTER TABLE "Document" ADD COLUMN "slot" TEXT;
ALTER TABLE "Document" ADD COLUMN "contentType" TEXT;
ALTER TABLE "Document" ADD COLUMN "sizeBytes" INTEGER;
CREATE INDEX "Document_dealId_slot_idx" ON "Document"("dealId", "slot");

CREATE TABLE "DealSignoff" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "dealId" TEXT NOT NULL,
    "kind" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "contentHash" TEXT,
    "signatureName" TEXT,
    "ipAddress" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "DealSignoff_dealId_fkey" FOREIGN KEY ("dealId") REFERENCES "Deal" ("id") ON DELETE CASCADE,
    CONSTRAINT "DealSignoff_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE RESTRICT
);

CREATE UNIQUE INDEX "DealSignoff_dealId_kind_userId_key" ON "DealSignoff"("dealId", "kind", "userId");
CREATE INDEX "DealSignoff_dealId_idx" ON "DealSignoff"("dealId");

-- L'étape « LOI » voulait dire « lettre signée ». Elle veut dire désormais
-- « lettre en cours ». Un dossier dont la lettre était déjà signée passe à la
-- conformité, pour ne pas lui redemander ce qu'il a fait.
UPDATE "Deal" SET "stage" = 'KYC' WHERE "stage" = 'LOI';

-- Un séquestre ne se constitue qu'après la signature du protocole. Un dossier
-- de démonstration marqué « fonds séquestrés » avant cette étape bloquerait le
-- geste de l'acquéreur quand il y arrivera.
UPDATE "Deal" SET "escrowStage" = 'NONE', "escrowProviderRef" = NULL
WHERE "stage" IN ('NDA', 'DATA_ROOM', 'LOI', 'KYC', 'DEED', 'SIGNATURE');
