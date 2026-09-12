-- Cession par lots : une offre, puis un dossier, peuvent ne porter que
-- certains fournisseurs du portefeuille plutôt que l'ensemble.
--
-- Le fournisseur est la maille retenue parce que c'est lui qui détient le code
-- de courtage et signe l'attestation de transfert. Un découpage par branche ou
-- par département produirait des lots qu'aucune compagnie ne saurait
-- transférer.
--
-- "[]" signifie « portefeuille entier » : c'est l'état de toutes les lignes
-- existantes, et la valeur par défaut d'une offre qui ne choisit rien.

ALTER TABLE "Offer" ADD COLUMN "carriers" TEXT NOT NULL DEFAULT '[]';
ALTER TABLE "Deal" ADD COLUMN "carriers" TEXT NOT NULL DEFAULT '[]';
