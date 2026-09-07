-- CreateEnum
CREATE TYPE "UserRole" AS ENUM ('SELLER', 'BUYER', 'BOTH', 'ADMIN');

-- CreateEnum
CREATE TYPE "KycStatus" AS ENUM ('NONE', 'PENDING', 'VERIFIED', 'REJECTED');

-- CreateEnum
CREATE TYPE "DistributionMode" AS ENUM ('OFFICE', 'AGENCY', 'REMOTE', 'MIXED');

-- CreateEnum
CREATE TYPE "RiskType" AS ENUM ('HEALTH_INDIVIDUAL', 'HEALTH_SENIOR', 'HEALTH_GROUP', 'PROVIDENT', 'LOAN_INSURANCE', 'AUTO', 'HOME', 'MOTORCYCLE', 'PROFESSIONAL_MULTIRISK', 'PROFESSIONAL_LIABILITY', 'DECENNIAL', 'LEGAL_PROTECTION', 'FUNERAL', 'SAVINGS', 'RETIREMENT', 'FLEET', 'LANDLORD', 'OTHER');

-- CreateEnum
CREATE TYPE "ClientSegment" AS ENUM ('INDIVIDUAL', 'PROFESSIONAL', 'COMPANY');

-- CreateEnum
CREATE TYPE "CommissionType" AS ENUM ('LINEAR', 'ADVANCED');

-- CreateEnum
CREATE TYPE "ListingStatus" AS ENUM ('DRAFT', 'PUBLISHED', 'OFFERS_OPEN', 'UNDER_NEGOTIATION', 'SOLD', 'WITHDRAWN');

-- CreateEnum
CREATE TYPE "FinancingMode" AS ENUM ('CASH', 'CREDIT', 'BOTH');

-- CreateEnum
CREATE TYPE "MatchStatus" AS ENUM ('SUGGESTED', 'VIEWED', 'CONTACTED', 'REJECTED');

-- CreateEnum
CREATE TYPE "OfferStatus" AS ENUM ('SUBMITTED', 'WITHDRAWN', 'ACCEPTED', 'DECLINED');

-- CreateEnum
CREATE TYPE "DealStage" AS ENUM ('NDA', 'DATA_ROOM', 'LOI', 'KYC', 'DEED', 'SIGNATURE', 'ESCROW', 'TRANSFER', 'RETENTION', 'CLOSED');

-- CreateEnum
CREATE TYPE "DocumentType" AS ENUM ('NDA', 'LOI', 'DEED', 'TRANSFER_CERTIFICATE', 'OTHER');

-- CreateEnum
CREATE TYPE "SubscriptionPlan" AS ENUM ('FREE', 'GROWTH');

-- CreateEnum
CREATE TYPE "SubscriptionStatus" AS ENUM ('ACTIVE', 'CANCELLED', 'EXPIRED');

-- CreateEnum
CREATE TYPE "ImportStatus" AS ENUM ('UPLOADED', 'REJECTED_PII', 'MAPPED', 'COMPLETED');

-- CreateEnum
CREATE TYPE "EscrowStage" AS ENUM ('NONE', 'FUNDS_HELD', 'PARTIAL_RELEASE', 'RELEASED', 'REFUNDED');

-- CreateEnum
CREATE TYPE "DataRequestType" AS ENUM ('EXPORT', 'DELETION');

-- CreateEnum
CREATE TYPE "DataRequestStatus" AS ENUM ('PENDING', 'COMPLETED', 'REJECTED');

-- CreateEnum
CREATE TYPE "NotificationType" AS ENUM ('MATCH', 'OFFER_WINDOW_CLOSED', 'DEAL_STAGE_CHANGED', 'RETENTION_DUE', 'DATA_ROOM_DOCUMENT', 'MESSAGE');

-- CreateTable
CREATE TABLE "VerificationToken" (
    "identifier" TEXT NOT NULL,
    "token" TEXT NOT NULL,
    "expires" TIMESTAMP(3) NOT NULL
);

-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "phone" TEXT,
    "passwordHash" TEXT,
    "role" "UserRole" NOT NULL,
    "oriasNumber" TEXT NOT NULL,
    "oriasVerifiedAt" TIMESTAMP(3),
    "firmId" TEXT,
    "kycStatus" "KycStatus" NOT NULL DEFAULT 'NONE',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "fullName" TEXT,
    "emailVerified" TIMESTAMP(3),
    "publicAlias" TEXT NOT NULL,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Firm" (
    "id" TEXT NOT NULL,
    "legalName" TEXT NOT NULL,
    "siren" TEXT NOT NULL,
    "legalForm" TEXT NOT NULL,
    "address" TEXT NOT NULL,
    "postalCode" TEXT NOT NULL,
    "city" TEXT NOT NULL,
    "department" TEXT NOT NULL,
    "region" TEXT NOT NULL,
    "foundedAt" TIMESTAMP(3),
    "headcount" INTEGER,
    "annualRevenue" DECIMAL(14,2),
    "distributionMode" "DistributionMode" NOT NULL,
    "complianceScore" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Firm_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Portfolio" (
    "id" TEXT NOT NULL,
    "firmId" TEXT NOT NULL,
    "label" TEXT NOT NULL,
    "contractCount" INTEGER NOT NULL,
    "clientCount" INTEGER NOT NULL,
    "annualCommissions" DECIMAL(14,2) NOT NULL,
    "averageAgeMonths" INTEGER NOT NULL,
    "churnRate12m" DECIMAL(5,4) NOT NULL,
    "importedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "sourceFileName" TEXT,
    "sourceStorageKey" TEXT,
    "sourceSha256" TEXT,

    CONSTRAINT "Portfolio_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ContractLine" (
    "id" TEXT NOT NULL,
    "portfolioId" TEXT NOT NULL,
    "carrier" TEXT NOT NULL,
    "riskType" "RiskType" NOT NULL,
    "premium" DECIMAL(14,2) NOT NULL,
    "commissionRate" DECIMAL(6,4) NOT NULL,
    "annualCommission" DECIMAL(14,2) NOT NULL,
    "effectiveDate" TIMESTAMP(3) NOT NULL,
    "renewalDate" TIMESTAMP(3) NOT NULL,
    "clientSegment" "ClientSegment" NOT NULL,
    "postalCode" TEXT NOT NULL,
    "commissionType" "CommissionType" NOT NULL,
    "clientKey" TEXT NOT NULL,
    "department" TEXT NOT NULL,

    CONSTRAINT "ContractLine_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PortfolioImport" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "portfolioId" TEXT,
    "originalFileName" TEXT NOT NULL,
    "storageKey" TEXT NOT NULL,
    "sha256" TEXT NOT NULL,
    "mimeType" TEXT NOT NULL,
    "status" "ImportStatus" NOT NULL,
    "rejectionReason" TEXT,
    "columnMapping" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "completedAt" TIMESTAMP(3),

    CONSTRAINT "PortfolioImport_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ValuationMultiple" (
    "id" TEXT NOT NULL,
    "riskType" "RiskType" NOT NULL,
    "multiple" DECIMAL(4,2) NOT NULL,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "updatedById" TEXT,

    CONSTRAINT "ValuationMultiple_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Valuation" (
    "id" TEXT NOT NULL,
    "portfolioId" TEXT NOT NULL,
    "computedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "grossValue" DECIMAL(14,2) NOT NULL,
    "lowValue" DECIMAL(14,2) NOT NULL,
    "midValue" DECIMAL(14,2) NOT NULL,
    "highValue" DECIMAL(14,2) NOT NULL,
    "qualityScore" INTEGER NOT NULL,
    "breakdown" JSONB NOT NULL,
    "algorithmVersion" TEXT NOT NULL,
    "listingId" TEXT,

    CONSTRAINT "Valuation_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Listing" (
    "id" TEXT NOT NULL,
    "portfolioId" TEXT NOT NULL,
    "askingPrice" DECIMAL(14,2) NOT NULL,
    "displayedZone" TEXT NOT NULL,
    "status" "ListingStatus" NOT NULL DEFAULT 'DRAFT',
    "isPartial" BOOLEAN NOT NULL DEFAULT false,
    "publishedAt" TIMESTAMP(3),
    "offerWindowClosesAt" TIMESTAMP(3),
    "publicNumber" SERIAL NOT NULL,
    "sellerSupportMonths" INTEGER NOT NULL DEFAULT 0,
    "departments" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "regions" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "isNationwide" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Listing_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ListingLine" (
    "listingId" TEXT NOT NULL,
    "contractLineId" TEXT NOT NULL,

    CONSTRAINT "ListingLine_pkey" PRIMARY KEY ("listingId","contractLineId")
);

-- CreateTable
CREATE TABLE "BuyerMandate" (
    "id" TEXT NOT NULL,
    "buyerId" TEXT NOT NULL,
    "maxBudget" DECIMAL(14,2) NOT NULL,
    "minCommissions" DECIMAL(14,2) NOT NULL,
    "maxCommissions" DECIMAL(14,2) NOT NULL,
    "riskTypes" "RiskType"[],
    "carriers" TEXT[],
    "zones" TEXT[],
    "clientSegments" "ClientSegment"[],
    "financingMode" "FinancingMode" NOT NULL,
    "alertsEnabled" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "BuyerMandate_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Match" (
    "id" TEXT NOT NULL,
    "listingId" TEXT NOT NULL,
    "mandateId" TEXT NOT NULL,
    "score" INTEGER NOT NULL,
    "criteriaBreakdown" JSONB NOT NULL,
    "status" "MatchStatus" NOT NULL DEFAULT 'SUGGESTED',
    "notifiedAt" TIMESTAMP(3),

    CONSTRAINT "Match_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Offer" (
    "id" TEXT NOT NULL,
    "listingId" TEXT NOT NULL,
    "buyerId" TEXT NOT NULL,
    "amount" DECIMAL(14,2) NOT NULL,
    "upfrontPercent" DECIMAL(5,2) NOT NULL,
    "message" TEXT NOT NULL,
    "status" "OfferStatus" NOT NULL DEFAULT 'SUBMITTED',
    "submittedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Offer_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Deal" (
    "id" TEXT NOT NULL,
    "listingId" TEXT NOT NULL,
    "sellerId" TEXT NOT NULL,
    "buyerId" TEXT NOT NULL,
    "agreedPrice" DECIMAL(14,2) NOT NULL,
    "upfrontAmount" DECIMAL(14,2) NOT NULL,
    "deferredAmount" DECIMAL(14,2) NOT NULL,
    "stage" "DealStage" NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "sellerAlias" TEXT NOT NULL,
    "buyerAlias" TEXT NOT NULL,
    "ndaAcceptedAt" TIMESTAMP(3),
    "adjustedDeferredAmount" DECIMAL(14,2),
    "retentionTargetRate" DECIMAL(4,2) NOT NULL DEFAULT 0.90,
    "escrowStage" "EscrowStage" NOT NULL DEFAULT 'NONE',
    "escrowProviderRef" TEXT,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Deal_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Document" (
    "id" TEXT NOT NULL,
    "dealId" TEXT NOT NULL,
    "type" "DocumentType" NOT NULL,
    "fileName" TEXT NOT NULL,
    "storageKey" TEXT NOT NULL,
    "sha256" TEXT NOT NULL,
    "uploadedById" TEXT NOT NULL,
    "signedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Document_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "RetentionReport" (
    "id" TEXT NOT NULL,
    "dealId" TEXT NOT NULL,
    "monthIndex" INTEGER NOT NULL,
    "contractsRetained" INTEGER NOT NULL,
    "contractsTransferred" INTEGER NOT NULL,
    "actualCommissions" DECIMAL(14,2) NOT NULL,
    "retentionRate" DECIMAL(5,4) NOT NULL,
    "reportedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "RetentionReport_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Message" (
    "id" TEXT NOT NULL,
    "dealId" TEXT,
    "listingId" TEXT,
    "senderId" TEXT NOT NULL,
    "body" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Message_pkey" PRIMARY KEY ("id")
);

-- Exactly one parent: a message belongs to a deal XOR a listing.
ALTER TABLE "Message" ADD CONSTRAINT "Message_parent_xor" CHECK (
  ("dealId" IS NULL) <> ("listingId" IS NULL)
);

-- CreateTable
CREATE TABLE "Subscription" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "plan" "SubscriptionPlan" NOT NULL,
    "feeRate" DECIMAL(5,4) NOT NULL,
    "dealQuota" INTEGER,
    "dealsUsed" INTEGER NOT NULL DEFAULT 0,
    "status" "SubscriptionStatus" NOT NULL DEFAULT 'ACTIVE',
    "renewsAt" TIMESTAMP(3),

    CONSTRAINT "Subscription_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Notification" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "type" "NotificationType" NOT NULL,
    "title" TEXT NOT NULL,
    "body" TEXT NOT NULL,
    "href" TEXT,
    "readAt" TIMESTAMP(3),
    "matchId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Notification_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AuditLog" (
    "id" TEXT NOT NULL,
    "actorId" TEXT,
    "action" TEXT NOT NULL,
    "entityType" TEXT NOT NULL,
    "entityId" TEXT NOT NULL,
    "metadata" JSONB,
    "ipAddress" TEXT,
    "userAgent" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AuditLog_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DataRoomView" (
    "id" TEXT NOT NULL,
    "dealId" TEXT NOT NULL,
    "viewerId" TEXT NOT NULL,
    "documentId" TEXT,
    "viewedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "DataRoomView_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DataRequest" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "type" "DataRequestType" NOT NULL,
    "status" "DataRequestStatus" NOT NULL DEFAULT 'PENDING',
    "storageKey" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "completedAt" TIMESTAMP(3),

    CONSTRAINT "DataRequest_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "VerificationToken_token_key" ON "VerificationToken"("token");

-- CreateIndex
CREATE UNIQUE INDEX "VerificationToken_identifier_token_key" ON "VerificationToken"("identifier", "token");

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

-- CreateIndex
CREATE UNIQUE INDEX "User_oriasNumber_key" ON "User"("oriasNumber");

-- CreateIndex
CREATE UNIQUE INDEX "User_publicAlias_key" ON "User"("publicAlias");

-- CreateIndex
CREATE INDEX "User_firmId_idx" ON "User"("firmId");

-- CreateIndex
CREATE INDEX "User_role_idx" ON "User"("role");

-- CreateIndex
CREATE UNIQUE INDEX "Firm_siren_key" ON "Firm"("siren");

-- CreateIndex
CREATE INDEX "Firm_department_idx" ON "Firm"("department");

-- CreateIndex
CREATE INDEX "Firm_region_idx" ON "Firm"("region");

-- CreateIndex
CREATE INDEX "Portfolio_firmId_idx" ON "Portfolio"("firmId");

-- CreateIndex
CREATE INDEX "ContractLine_portfolioId_idx" ON "ContractLine"("portfolioId");

-- CreateIndex
CREATE INDEX "ContractLine_carrier_idx" ON "ContractLine"("carrier");

-- CreateIndex
CREATE INDEX "ContractLine_riskType_idx" ON "ContractLine"("riskType");

-- CreateIndex
CREATE INDEX "ContractLine_department_idx" ON "ContractLine"("department");

-- CreateIndex
CREATE INDEX "ContractLine_portfolioId_clientKey_idx" ON "ContractLine"("portfolioId", "clientKey");

-- CreateIndex
CREATE INDEX "PortfolioImport_userId_idx" ON "PortfolioImport"("userId");

-- CreateIndex
CREATE INDEX "PortfolioImport_sha256_idx" ON "PortfolioImport"("sha256");

-- CreateIndex
CREATE UNIQUE INDEX "ValuationMultiple_riskType_key" ON "ValuationMultiple"("riskType");

-- CreateIndex
CREATE INDEX "Valuation_portfolioId_computedAt_idx" ON "Valuation"("portfolioId", "computedAt");

-- CreateIndex
CREATE INDEX "Valuation_listingId_idx" ON "Valuation"("listingId");

-- CreateIndex
CREATE UNIQUE INDEX "Listing_publicNumber_key" ON "Listing"("publicNumber");

-- CreateIndex
CREATE INDEX "Listing_status_publishedAt_idx" ON "Listing"("status", "publishedAt");

-- CreateIndex
CREATE INDEX "Listing_portfolioId_idx" ON "Listing"("portfolioId");

-- CreateIndex
CREATE INDEX "ListingLine_contractLineId_idx" ON "ListingLine"("contractLineId");

-- CreateIndex
CREATE INDEX "BuyerMandate_buyerId_idx" ON "BuyerMandate"("buyerId");

-- CreateIndex
CREATE INDEX "Match_mandateId_score_idx" ON "Match"("mandateId", "score");

-- CreateIndex
CREATE INDEX "Match_listingId_idx" ON "Match"("listingId");

-- CreateIndex
CREATE UNIQUE INDEX "Match_listingId_mandateId_key" ON "Match"("listingId", "mandateId");

-- CreateIndex
CREATE INDEX "Offer_listingId_status_idx" ON "Offer"("listingId", "status");

-- CreateIndex
CREATE INDEX "Offer_buyerId_idx" ON "Offer"("buyerId");

-- CreateIndex
CREATE UNIQUE INDEX "Offer_listingId_buyerId_key" ON "Offer"("listingId", "buyerId");

-- CreateIndex
CREATE INDEX "Deal_sellerId_idx" ON "Deal"("sellerId");

-- CreateIndex
CREATE INDEX "Deal_buyerId_idx" ON "Deal"("buyerId");

-- CreateIndex
CREATE INDEX "Deal_listingId_idx" ON "Deal"("listingId");

-- CreateIndex
CREATE INDEX "Deal_stage_idx" ON "Deal"("stage");

-- CreateIndex
CREATE INDEX "Document_dealId_idx" ON "Document"("dealId");

-- CreateIndex
CREATE INDEX "Document_sha256_idx" ON "Document"("sha256");

-- CreateIndex
CREATE UNIQUE INDEX "RetentionReport_dealId_monthIndex_key" ON "RetentionReport"("dealId", "monthIndex");

-- CreateIndex
CREATE INDEX "Message_dealId_createdAt_idx" ON "Message"("dealId", "createdAt");

-- CreateIndex
CREATE INDEX "Message_listingId_createdAt_idx" ON "Message"("listingId", "createdAt");

-- CreateIndex
CREATE INDEX "Message_senderId_idx" ON "Message"("senderId");

-- CreateIndex
CREATE INDEX "Subscription_userId_status_idx" ON "Subscription"("userId", "status");

-- CreateIndex
CREATE UNIQUE INDEX "Notification_matchId_key" ON "Notification"("matchId");

-- CreateIndex
CREATE INDEX "Notification_userId_createdAt_idx" ON "Notification"("userId", "createdAt");

-- CreateIndex
CREATE INDEX "AuditLog_actorId_createdAt_idx" ON "AuditLog"("actorId", "createdAt");

-- CreateIndex
CREATE INDEX "AuditLog_entityType_entityId_idx" ON "AuditLog"("entityType", "entityId");

-- CreateIndex
CREATE INDEX "AuditLog_action_createdAt_idx" ON "AuditLog"("action", "createdAt");

-- CreateIndex
CREATE INDEX "DataRoomView_dealId_viewedAt_idx" ON "DataRoomView"("dealId", "viewedAt");

-- CreateIndex
CREATE INDEX "DataRoomView_viewerId_idx" ON "DataRoomView"("viewerId");

-- CreateIndex
CREATE INDEX "DataRequest_userId_type_idx" ON "DataRequest"("userId", "type");

-- AddForeignKey
ALTER TABLE "User" ADD CONSTRAINT "User_firmId_fkey" FOREIGN KEY ("firmId") REFERENCES "Firm"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Portfolio" ADD CONSTRAINT "Portfolio_firmId_fkey" FOREIGN KEY ("firmId") REFERENCES "Firm"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ContractLine" ADD CONSTRAINT "ContractLine_portfolioId_fkey" FOREIGN KEY ("portfolioId") REFERENCES "Portfolio"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PortfolioImport" ADD CONSTRAINT "PortfolioImport_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PortfolioImport" ADD CONSTRAINT "PortfolioImport_portfolioId_fkey" FOREIGN KEY ("portfolioId") REFERENCES "Portfolio"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ValuationMultiple" ADD CONSTRAINT "ValuationMultiple_updatedById_fkey" FOREIGN KEY ("updatedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Valuation" ADD CONSTRAINT "Valuation_portfolioId_fkey" FOREIGN KEY ("portfolioId") REFERENCES "Portfolio"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Valuation" ADD CONSTRAINT "Valuation_listingId_fkey" FOREIGN KEY ("listingId") REFERENCES "Listing"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Listing" ADD CONSTRAINT "Listing_portfolioId_fkey" FOREIGN KEY ("portfolioId") REFERENCES "Portfolio"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ListingLine" ADD CONSTRAINT "ListingLine_listingId_fkey" FOREIGN KEY ("listingId") REFERENCES "Listing"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ListingLine" ADD CONSTRAINT "ListingLine_contractLineId_fkey" FOREIGN KEY ("contractLineId") REFERENCES "ContractLine"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BuyerMandate" ADD CONSTRAINT "BuyerMandate_buyerId_fkey" FOREIGN KEY ("buyerId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Match" ADD CONSTRAINT "Match_listingId_fkey" FOREIGN KEY ("listingId") REFERENCES "Listing"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Match" ADD CONSTRAINT "Match_mandateId_fkey" FOREIGN KEY ("mandateId") REFERENCES "BuyerMandate"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Offer" ADD CONSTRAINT "Offer_listingId_fkey" FOREIGN KEY ("listingId") REFERENCES "Listing"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Offer" ADD CONSTRAINT "Offer_buyerId_fkey" FOREIGN KEY ("buyerId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Deal" ADD CONSTRAINT "Deal_listingId_fkey" FOREIGN KEY ("listingId") REFERENCES "Listing"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Deal" ADD CONSTRAINT "Deal_sellerId_fkey" FOREIGN KEY ("sellerId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Deal" ADD CONSTRAINT "Deal_buyerId_fkey" FOREIGN KEY ("buyerId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Document" ADD CONSTRAINT "Document_dealId_fkey" FOREIGN KEY ("dealId") REFERENCES "Deal"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Document" ADD CONSTRAINT "Document_uploadedById_fkey" FOREIGN KEY ("uploadedById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RetentionReport" ADD CONSTRAINT "RetentionReport_dealId_fkey" FOREIGN KEY ("dealId") REFERENCES "Deal"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Message" ADD CONSTRAINT "Message_dealId_fkey" FOREIGN KEY ("dealId") REFERENCES "Deal"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Message" ADD CONSTRAINT "Message_listingId_fkey" FOREIGN KEY ("listingId") REFERENCES "Listing"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Message" ADD CONSTRAINT "Message_senderId_fkey" FOREIGN KEY ("senderId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Subscription" ADD CONSTRAINT "Subscription_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Notification" ADD CONSTRAINT "Notification_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Notification" ADD CONSTRAINT "Notification_matchId_fkey" FOREIGN KEY ("matchId") REFERENCES "Match"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AuditLog" ADD CONSTRAINT "AuditLog_actorId_fkey" FOREIGN KEY ("actorId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DataRoomView" ADD CONSTRAINT "DataRoomView_dealId_fkey" FOREIGN KEY ("dealId") REFERENCES "Deal"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DataRoomView" ADD CONSTRAINT "DataRoomView_viewerId_fkey" FOREIGN KEY ("viewerId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DataRequest" ADD CONSTRAINT "DataRequest_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
