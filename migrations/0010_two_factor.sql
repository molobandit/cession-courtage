-- Second facteur par code temporaire (TOTP) et codes de secours.
-- Un mot de passe seul est leger pour une place de marche ou se negocient des
-- centaines de milliers d'euros.

CREATE TABLE "TwoFactor" (
  "userId"      TEXT PRIMARY KEY NOT NULL,
  "secret"      TEXT NOT NULL,
  "confirmedAt" DATETIME,
  "createdAt"   DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "TwoFactor_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE TABLE "RecoveryCode" (
  "id"       TEXT PRIMARY KEY NOT NULL,
  "userId"   TEXT NOT NULL,
  "codeHash" TEXT NOT NULL,
  "usedAt"   DATETIME,
  CONSTRAINT "RecoveryCode_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE UNIQUE INDEX "RecoveryCode_codeHash_key" ON "RecoveryCode"("codeHash");
CREATE INDEX "RecoveryCode_userId_usedAt_idx" ON "RecoveryCode"("userId", "usedAt");
