-- Services à la carte : ce qu'il faut pour produire les pièces et encaisser.
--
-- Les attestations de transfert se font compagnie par compagnie : sans la liste
-- des fournisseurs et une date d'effet, il n'y a rien à attester. Les
-- honoraires sont réglés par carte avant que le dossier n'engage un
-- prestataire ; la trace du règlement tient ici, avec la session Stripe qui
-- l'atteste.

ALTER TABLE "DirectDeal" ADD COLUMN "carriers" TEXT NOT NULL DEFAULT '[]';
ALTER TABLE "DirectDeal" ADD COLUMN "transferEffectiveDate" DATETIME;
ALTER TABLE "DirectDeal" ADD COLUMN "feesPaidAt" DATETIME;
ALTER TABLE "DirectDeal" ADD COLUMN "feesAmountCents" INTEGER;
ALTER TABLE "DirectDeal" ADD COLUMN "feesCheckoutSessionId" TEXT;
