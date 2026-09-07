-- AlterEnum
ALTER TYPE "ListingStatus" ADD VALUE 'OFFERS_CLOSED';

-- AlterTable
ALTER TABLE "Message" ADD COLUMN "recipientId" TEXT;

-- AddForeignKey
ALTER TABLE "Message" ADD CONSTRAINT "Message_recipientId_fkey" FOREIGN KEY ("recipientId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- CreateIndex
CREATE INDEX "Message_recipientId_idx" ON "Message"("recipientId");
