-- Séquestre et signature d'un dossier de gré à gré.
--
-- Le tunnel intermédié enregistre ces deux étapes sur `Deal` et `Document`. Un
-- dossier de gré à gré n'a ni l'un ni l'autre : sans colonnes propres, brancher
-- ses étapes sur la couche partenaires aurait écrit dans des tables où il
-- n'existe pas. Ces colonnes tiennent la trace de ce qui a été fait, par qui
-- (la référence du prestataire), et quand.

ALTER TABLE "DirectDeal" ADD COLUMN "escrowStage" TEXT NOT NULL DEFAULT 'NONE';
ALTER TABLE "DirectDeal" ADD COLUMN "escrowProviderRef" TEXT;
ALTER TABLE "DirectDeal" ADD COLUMN "deedSignedAt" DATETIME;
ALTER TABLE "DirectDeal" ADD COLUMN "signatureProviderRef" TEXT;
