-- Propositions d'un cédant sur une demande d'acquisition.
--
-- Une demande publiée ne servait à rien tant qu'aucun cédant ne pouvait y
-- répondre : l'acquéreur attendait, le cédant lisait la demande et repartait.
-- Une proposition relie la demande à une annonce du cédant ; l'acquéreur la
-- reçoit et entre dans le parcours d'achat habituel depuis l'annonce.

CREATE TABLE "MandateProposal" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "mandateId" TEXT NOT NULL,
    "listingId" TEXT NOT NULL,
    "sellerId" TEXT NOT NULL,
    "message" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "MandateProposal_mandateId_fkey" FOREIGN KEY ("mandateId") REFERENCES "BuyerMandate" ("id") ON DELETE CASCADE,
    CONSTRAINT "MandateProposal_listingId_fkey" FOREIGN KEY ("listingId") REFERENCES "Listing" ("id") ON DELETE CASCADE,
    CONSTRAINT "MandateProposal_sellerId_fkey" FOREIGN KEY ("sellerId") REFERENCES "User" ("id") ON DELETE CASCADE
);

CREATE UNIQUE INDEX "MandateProposal_mandateId_listingId_key" ON "MandateProposal"("mandateId", "listingId");
CREATE INDEX "MandateProposal_sellerId_idx" ON "MandateProposal"("sellerId");
CREATE INDEX "MandateProposal_listingId_idx" ON "MandateProposal"("listingId");
