-- Cession de gré à gré : les parties se sont trouvées seules et ne viennent
-- chercher que la formalisation.
--
-- Trois services indépendants — kit contractuel, séquestre, attestations —
-- que l'on prend séparément ou ensemble. Le parcours s'adapte à ce qui a été
-- acheté : qui ne prend pas le séquestre ne doit pas buter sur une étape
-- « fonds bloqués » qu'il ne franchira jamais.
--
-- La contrepartie est désignée par son adresse : elle n'a pas forcément de
-- compte au moment où le dossier s'ouvre.

CREATE TABLE "DirectDeal" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "openedById" TEXT NOT NULL,
    "openerRole" TEXT NOT NULL,
    "counterpartyEmail" TEXT NOT NULL,
    "counterpartyUserId" TEXT,
    "portfolioLabel" TEXT NOT NULL,
    "salePrice" DECIMAL NOT NULL,
    "upfrontPercent" DECIMAL NOT NULL DEFAULT 100,
    "kit" BOOLEAN NOT NULL DEFAULT false,
    "escrow" BOOLEAN NOT NULL DEFAULT false,
    "attestations" BOOLEAN NOT NULL DEFAULT false,
    "stage" TEXT NOT NULL DEFAULT 'INVITED',
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "closedAt" DATETIME,

    CONSTRAINT "DirectDeal_openedById_fkey" FOREIGN KEY ("openedById") REFERENCES "User" ("id") ON DELETE RESTRICT,
    CONSTRAINT "DirectDeal_counterpartyUserId_fkey" FOREIGN KEY ("counterpartyUserId") REFERENCES "User" ("id") ON DELETE SET NULL
);

CREATE INDEX "DirectDeal_openedById_idx" ON "DirectDeal"("openedById");
CREATE INDEX "DirectDeal_counterpartyUserId_idx" ON "DirectDeal"("counterpartyUserId");
CREATE INDEX "DirectDeal_counterpartyEmail_idx" ON "DirectDeal"("counterpartyEmail");
CREATE INDEX "DirectDeal_stage_createdAt_idx" ON "DirectDeal"("stage", "createdAt");
