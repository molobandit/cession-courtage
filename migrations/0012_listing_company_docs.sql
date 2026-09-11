-- Brief réglementaire (JSON) et pièces cabinet mises à disposition des acquéreurs abonnés.

ALTER TABLE "Listing" ADD COLUMN "regulatoryJson" TEXT;

CREATE TABLE "ListingCompanyDocument" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "listingId" TEXT NOT NULL,
    "kind" TEXT NOT NULL,
    "fileName" TEXT NOT NULL,
    "storageKey" TEXT NOT NULL,
    "sha256" TEXT NOT NULL,
    "uploadedById" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX "ListingCompanyDocument_listingId_idx" ON "ListingCompanyDocument"("listingId");
