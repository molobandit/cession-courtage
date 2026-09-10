-- Compteur d'echecs de connexion, par e-mail vise.
-- Rien n'empechait jusqu'ici d'essayer des mots de passe en boucle sur un
-- compte connu. Le verrou est progressif et temporaire : un blocage definitif
-- permettrait a n'importe qui de fermer le compte d'un tiers.

CREATE TABLE "LoginAttempt" (
  "identifier"   TEXT PRIMARY KEY NOT NULL,
  "failedCount"  INTEGER NOT NULL DEFAULT 0,
  "lastFailedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "lockedUntil"  DATETIME
);

CREATE INDEX "LoginAttempt_lockedUntil_idx" ON "LoginAttempt"("lockedUntil");
