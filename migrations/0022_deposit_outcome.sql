-- Sort du dépôt de garantie.
--
-- Le dépôt n'est pas un droit d'entrée mais un engagement : il protège le
-- cédant d'une rétractation d'opportunité, une fois qu'il a ouvert ses pièces
-- et cessé de chercher d'autres repreneurs.
--
-- Deux issues, et deux seulement. Cession close : le dépôt vient en déduction
-- du prix, jamais remboursé à part. Acquéreur qui se retire : il reste acquis
-- au cédant à titre indemnitaire. Tant que rien n'est tranché, PENDING.

ALTER TABLE "InterestDeposit" ADD COLUMN "outcome" TEXT NOT NULL DEFAULT 'PENDING';
ALTER TABLE "InterestDeposit" ADD COLUMN "settledAt" DATETIME;
