-- Marque d'effacement d'un compte.
-- Sans elle, la session ouverte au moment de la suppression restait valable :
-- le jeton porte l'identifiant, la ligne existe toujours en base, et la garde
-- ne verifiait pas qu'elle avait ete effacee. Une session JWT ne se revoque pas
-- cote serveur, c'est donc la lecture de l'acteur qui doit refuser.

ALTER TABLE "User" ADD COLUMN "erasedAt" DATETIME;
