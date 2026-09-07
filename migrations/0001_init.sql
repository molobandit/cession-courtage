-- D1 enforce les FK : désactiver pendant la création des tables.
PRAGMA foreign_keys = OFF;

-- CreateTable
CREATE TABLE "VerificationToken" (
    "identifier" TEXT NOT NULL,
    "token" TEXT NOT NULL,
    "expires" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "email" TEXT NOT NULL,
    "phone" TEXT,
    "passwordHash" TEXT,
    "role" TEXT NOT NULL,
    "oriasNumber" TEXT NOT NULL,
    "oriasVerifiedAt" DATETIME,
    "firmId" TEXT,
    "kycStatus" TEXT NOT NULL DEFAULT 'NONE',
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "fullName" TEXT,
    "emailVerified" DATETIME,
    "publicAlias" TEXT NOT NULL,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "User_firmId_fkey" FOREIGN KEY ("firmId") REFERENCES "Firm" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Firm" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "legalName" TEXT NOT NULL,
    "siren" TEXT NOT NULL,
    "legalForm" TEXT NOT NULL,
    "address" TEXT NOT NULL,
    "postalCode" TEXT NOT NULL,
    "city" TEXT NOT NULL,
    "department" TEXT NOT NULL,
    "region" TEXT NOT NULL,
    "foundedAt" DATETIME,
    "headcount" INTEGER,
    "annualRevenue" DECIMAL,
    "distributionMode" TEXT NOT NULL,
    "complianceScore" INTEGER NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- CreateTable
CREATE TABLE "Portfolio" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "firmId" TEXT NOT NULL,
    "label" TEXT NOT NULL,
    "contractCount" INTEGER NOT NULL,
    "clientCount" INTEGER NOT NULL,
    "annualCommissions" DECIMAL NOT NULL,
    "averageAgeMonths" INTEGER NOT NULL,
    "churnRate12m" DECIMAL NOT NULL,
    "importedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "sourceFileName" TEXT,
    "sourceStorageKey" TEXT,
    "sourceSha256" TEXT,
    CONSTRAINT "Portfolio_firmId_fkey" FOREIGN KEY ("firmId") REFERENCES "Firm" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "ContractLine" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "portfolioId" TEXT NOT NULL,
    "carrier" TEXT NOT NULL,
    "riskType" TEXT NOT NULL,
    "premium" DECIMAL NOT NULL,
    "commissionRate" DECIMAL NOT NULL,
    "annualCommission" DECIMAL NOT NULL,
    "effectiveDate" DATETIME NOT NULL,
    "renewalDate" DATETIME NOT NULL,
    "clientSegment" TEXT NOT NULL,
    "postalCode" TEXT NOT NULL,
    "commissionType" TEXT NOT NULL,
    "clientKey" TEXT NOT NULL,
    "department" TEXT NOT NULL,
    CONSTRAINT "ContractLine_portfolioId_fkey" FOREIGN KEY ("portfolioId") REFERENCES "Portfolio" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "PortfolioImport" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "userId" TEXT NOT NULL,
    "portfolioId" TEXT,
    "originalFileName" TEXT NOT NULL,
    "storageKey" TEXT NOT NULL,
    "sha256" TEXT NOT NULL,
    "mimeType" TEXT NOT NULL,
    "status" TEXT NOT NULL,
    "rejectionReason" TEXT,
    "columnMapping" JSONB,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "completedAt" DATETIME,
    CONSTRAINT "PortfolioImport_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "PortfolioImport_portfolioId_fkey" FOREIGN KEY ("portfolioId") REFERENCES "Portfolio" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "ValuationMultiple" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "riskType" TEXT NOT NULL,
    "multiple" DECIMAL NOT NULL,
    "updatedAt" DATETIME NOT NULL,
    "updatedById" TEXT,
    CONSTRAINT "ValuationMultiple_updatedById_fkey" FOREIGN KEY ("updatedById") REFERENCES "User" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Valuation" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "portfolioId" TEXT NOT NULL,
    "computedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "grossValue" DECIMAL NOT NULL,
    "lowValue" DECIMAL NOT NULL,
    "midValue" DECIMAL NOT NULL,
    "highValue" DECIMAL NOT NULL,
    "qualityScore" INTEGER NOT NULL,
    "breakdown" JSONB NOT NULL,
    "algorithmVersion" TEXT NOT NULL,
    "listingId" TEXT,
    CONSTRAINT "Valuation_portfolioId_fkey" FOREIGN KEY ("portfolioId") REFERENCES "Portfolio" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "Valuation_listingId_fkey" FOREIGN KEY ("listingId") REFERENCES "Listing" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Listing" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "portfolioId" TEXT NOT NULL,
    "askingPrice" DECIMAL NOT NULL,
    "displayedZone" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'DRAFT',
    "isPartial" BOOLEAN NOT NULL DEFAULT false,
    "publishedAt" DATETIME,
    "offerWindowClosesAt" DATETIME,
    "publicNumber" INTEGER NOT NULL,
    "sellerSupportMonths" INTEGER NOT NULL DEFAULT 0,
    "departments" JSONB NOT NULL DEFAULT [],
    "regions" JSONB NOT NULL DEFAULT [],
    "isNationwide" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "Listing_portfolioId_fkey" FOREIGN KEY ("portfolioId") REFERENCES "Portfolio" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "ListingLine" (
    "listingId" TEXT NOT NULL,
    "contractLineId" TEXT NOT NULL,

    PRIMARY KEY ("listingId", "contractLineId"),
    CONSTRAINT "ListingLine_listingId_fkey" FOREIGN KEY ("listingId") REFERENCES "Listing" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "ListingLine_contractLineId_fkey" FOREIGN KEY ("contractLineId") REFERENCES "ContractLine" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "BuyerMandate" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "buyerId" TEXT NOT NULL,
    "maxBudget" DECIMAL NOT NULL,
    "minCommissions" DECIMAL NOT NULL,
    "maxCommissions" DECIMAL NOT NULL,
    "riskTypes" JSONB NOT NULL,
    "carriers" JSONB NOT NULL,
    "zones" JSONB NOT NULL,
    "clientSegments" JSONB NOT NULL,
    "financingMode" TEXT NOT NULL,
    "alertsEnabled" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    CONSTRAINT "BuyerMandate_buyerId_fkey" FOREIGN KEY ("buyerId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Match" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "listingId" TEXT NOT NULL,
    "mandateId" TEXT NOT NULL,
    "score" INTEGER NOT NULL,
    "criteriaBreakdown" JSONB NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'SUGGESTED',
    "notifiedAt" DATETIME,
    CONSTRAINT "Match_listingId_fkey" FOREIGN KEY ("listingId") REFERENCES "Listing" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "Match_mandateId_fkey" FOREIGN KEY ("mandateId") REFERENCES "BuyerMandate" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Offer" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "listingId" TEXT NOT NULL,
    "buyerId" TEXT NOT NULL,
    "amount" DECIMAL NOT NULL,
    "upfrontPercent" DECIMAL NOT NULL,
    "message" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'SUBMITTED',
    "submittedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "Offer_listingId_fkey" FOREIGN KEY ("listingId") REFERENCES "Listing" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "Offer_buyerId_fkey" FOREIGN KEY ("buyerId") REFERENCES "User" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Deal" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "listingId" TEXT NOT NULL,
    "sellerId" TEXT NOT NULL,
    "buyerId" TEXT NOT NULL,
    "agreedPrice" DECIMAL NOT NULL,
    "upfrontAmount" DECIMAL NOT NULL,
    "deferredAmount" DECIMAL NOT NULL,
    "stage" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "sellerAlias" TEXT NOT NULL,
    "buyerAlias" TEXT NOT NULL,
    "ndaAcceptedAt" DATETIME,
    "adjustedDeferredAmount" DECIMAL,
    "retentionTargetRate" DECIMAL NOT NULL DEFAULT 0.90,
    "escrowStage" TEXT NOT NULL DEFAULT 'NONE',
    "escrowProviderRef" TEXT,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "Deal_listingId_fkey" FOREIGN KEY ("listingId") REFERENCES "Listing" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "Deal_sellerId_fkey" FOREIGN KEY ("sellerId") REFERENCES "User" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "Deal_buyerId_fkey" FOREIGN KEY ("buyerId") REFERENCES "User" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Document" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "dealId" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "fileName" TEXT NOT NULL,
    "storageKey" TEXT NOT NULL,
    "sha256" TEXT NOT NULL,
    "uploadedById" TEXT NOT NULL,
    "signedAt" DATETIME,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "Document_dealId_fkey" FOREIGN KEY ("dealId") REFERENCES "Deal" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "Document_uploadedById_fkey" FOREIGN KEY ("uploadedById") REFERENCES "User" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "RetentionReport" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "dealId" TEXT NOT NULL,
    "monthIndex" INTEGER NOT NULL,
    "contractsRetained" INTEGER NOT NULL,
    "contractsTransferred" INTEGER NOT NULL,
    "actualCommissions" DECIMAL NOT NULL,
    "retentionRate" DECIMAL NOT NULL,
    "reportedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "RetentionReport_dealId_fkey" FOREIGN KEY ("dealId") REFERENCES "Deal" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Message" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "dealId" TEXT,
    "listingId" TEXT,
    "senderId" TEXT NOT NULL,
    "recipientId" TEXT,
    "body" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "Message_dealId_fkey" FOREIGN KEY ("dealId") REFERENCES "Deal" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "Message_listingId_fkey" FOREIGN KEY ("listingId") REFERENCES "Listing" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "Message_senderId_fkey" FOREIGN KEY ("senderId") REFERENCES "User" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "Message_recipientId_fkey" FOREIGN KEY ("recipientId") REFERENCES "User" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Subscription" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "userId" TEXT NOT NULL,
    "plan" TEXT NOT NULL,
    "feeRate" DECIMAL NOT NULL,
    "dealQuota" INTEGER,
    "dealsUsed" INTEGER NOT NULL DEFAULT 0,
    "status" TEXT NOT NULL DEFAULT 'ACTIVE',
    "renewsAt" DATETIME,
    CONSTRAINT "Subscription_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Notification" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "userId" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "body" TEXT NOT NULL,
    "href" TEXT,
    "readAt" DATETIME,
    "matchId" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "Notification_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "Notification_matchId_fkey" FOREIGN KEY ("matchId") REFERENCES "Match" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "AuditLog" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "actorId" TEXT,
    "action" TEXT NOT NULL,
    "entityType" TEXT NOT NULL,
    "entityId" TEXT NOT NULL,
    "metadata" JSONB,
    "ipAddress" TEXT,
    "userAgent" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "AuditLog_actorId_fkey" FOREIGN KEY ("actorId") REFERENCES "User" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "DataRoomView" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "dealId" TEXT NOT NULL,
    "viewerId" TEXT NOT NULL,
    "documentId" TEXT,
    "viewedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "DataRoomView_dealId_fkey" FOREIGN KEY ("dealId") REFERENCES "Deal" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "DataRoomView_viewerId_fkey" FOREIGN KEY ("viewerId") REFERENCES "User" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "DataRequest" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "userId" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "storageKey" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "completedAt" DATETIME,
    CONSTRAINT "DataRequest_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "OutboundEmail" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "to" TEXT NOT NULL,
    "subject" TEXT NOT NULL,
    "bodyText" TEXT NOT NULL,
    "purpose" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
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
CREATE INDEX "Message_recipientId_idx" ON "Message"("recipientId");

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

-- CreateIndex
CREATE INDEX "OutboundEmail_to_createdAt_idx" ON "OutboundEmail"("to", "createdAt");

PRAGMA foreign_keys = ON;

