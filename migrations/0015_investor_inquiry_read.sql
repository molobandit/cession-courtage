-- Suivi lu / non lu des manifestations d'interet. Ne touche pas aux lignes existantes.
ALTER TABLE "InvestorInquiry" ADD COLUMN "readAt" DATETIME;
