-- Un seul dossier par couple annonce/acquereur.
-- Permet de rejouer l'acceptation d'une offre sans creer de doublon : D1
-- n'offre pas de transaction, la reprise s'appuie sur cette contrainte.
CREATE UNIQUE INDEX "Deal_listingId_buyerId_key" ON "Deal"("listingId", "buyerId");
