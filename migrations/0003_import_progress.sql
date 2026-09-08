-- Avancement de l'insertion d'un import, pour permettre la reprise par lots.
ALTER TABLE "PortfolioImport" ADD COLUMN "totalRows" INTEGER NOT NULL DEFAULT 0;
ALTER TABLE "PortfolioImport" ADD COLUMN "processedRows" INTEGER NOT NULL DEFAULT 0;
