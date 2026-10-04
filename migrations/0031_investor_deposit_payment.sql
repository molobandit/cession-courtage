-- Le positionnement investisseur suit le meme chemin que celui de l'acquereur.
--
-- Le dossier investisseurs dit la meme regle pour les deux : 2,5 % du montant,
-- verses dans un trust, et c'est ce depot qui leve l'anonymat du cedant. La
-- position investisseur s'enregistrait sans aucun paiement, et ouvrait
-- l'identite aussitot. Elle porte desormais l'etat de son reglement.
ALTER TABLE "InvestorPosition" ADD COLUMN "paymentMethod" TEXT;
ALTER TABLE "InvestorPosition" ADD COLUMN "paymentRef" TEXT;
ALTER TABLE "InvestorPosition" ADD COLUMN "paymentStatus" TEXT NOT NULL DEFAULT 'RECORDED';

-- La session de paiement dit de quel cote elle retombe.
ALTER TABLE "DepositCheckout" ADD COLUMN "investor" BOOLEAN NOT NULL DEFAULT false;
