-- CreateEnum
CREATE TYPE "Role" AS ENUM ('USER', 'ADMIN');

-- CreateEnum
CREATE TYPE "Product" AS ENUM ('HOMES');

-- CreateEnum
CREATE TYPE "GameMode" AS ENUM ('QUICK', 'DAILY', 'CITY', 'COUNTRY');

-- CreateEnum
CREATE TYPE "GameStatus" AS ENUM ('ACTIVE', 'COMPLETED', 'ABANDONED');

-- CreateEnum
CREATE TYPE "LeaderboardScope" AS ENUM ('GLOBAL', 'DAILY', 'CITY', 'COUNTRY');

-- CreateEnum
CREATE TYPE "DailyChallengeStatus" AS ENUM ('DRAFT', 'PUBLISHED');

-- CreateEnum
CREATE TYPE "PropertyType" AS ENUM ('APARTMENT', 'STUDIO', 'PENTHOUSE', 'LOFT', 'HOUSE', 'TOWNHOUSE', 'VILLA');

-- CreateEnum
CREATE TYPE "SourceKind" AS ENUM ('DEMO', 'LISTING_PORTAL', 'MANUAL_CSV', 'MANUAL_JSON', 'OFFICIAL_API', 'LICENSED_DATASET');

-- CreateEnum
CREATE TYPE "EntitlementType" AS ENUM ('DAY_PASS', 'PRO');

-- CreateEnum
CREATE TYPE "SubscriptionStatus" AS ENUM ('PENDING', 'ACTIVE', 'EXPIRED', 'CANCELED', 'FAILED');

-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL,
    "name" TEXT,
    "email" TEXT,
    "emailVerified" TIMESTAMP(3),
    "image" TEXT,
    "username" TEXT,
    "role" "Role" NOT NULL DEFAULT 'USER',
    "isGuest" BOOLEAN NOT NULL DEFAULT false,
    "bannedAt" TIMESTAMP(3),
    "banReason" TEXT,
    "currentStreak" INTEGER NOT NULL DEFAULT 0,
    "longestStreak" INTEGER NOT NULL DEFAULT 0,
    "lastDailyDate" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Account" (
    "userId" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "provider" TEXT NOT NULL,
    "providerAccountId" TEXT NOT NULL,
    "refresh_token" TEXT,
    "access_token" TEXT,
    "expires_at" INTEGER,
    "token_type" TEXT,
    "scope" TEXT,
    "id_token" TEXT,
    "session_state" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Account_pkey" PRIMARY KEY ("provider","providerAccountId")
);

-- CreateTable
CREATE TABLE "Session" (
    "sessionToken" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "expires" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL
);

-- CreateTable
CREATE TABLE "VerificationToken" (
    "identifier" TEXT NOT NULL,
    "token" TEXT NOT NULL,
    "expires" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "VerificationToken_pkey" PRIMARY KEY ("identifier","token")
);

-- CreateTable
CREATE TABLE "City" (
    "id" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "country" TEXT NOT NULL,
    "countryCode" CHAR(2) NOT NULL,
    "region" TEXT,
    "heroImageUrl" TEXT,
    "blurb" TEXT,
    "featured" BOOLEAN NOT NULL DEFAULT false,
    "sortOrder" INTEGER NOT NULL DEFAULT 100,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "City_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PropertySource" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "kind" "SourceKind" NOT NULL,
    "description" TEXT,
    "license" TEXT,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PropertySource_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Property" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "country" TEXT NOT NULL,
    "countryCode" CHAR(2) NOT NULL,
    "city" TEXT NOT NULL,
    "cityId" TEXT NOT NULL,
    "region" TEXT,
    "neighborhood" TEXT,
    "latitude" DOUBLE PRECISION,
    "longitude" DOUBLE PRECISION,
    "price" INTEGER NOT NULL,
    "currency" CHAR(3) NOT NULL,
    "areaM2" DOUBLE PRECISION,
    "rooms" INTEGER,
    "bathrooms" INTEGER,
    "propertyType" "PropertyType" NOT NULL,
    "floor" INTEGER,
    "yearBuilt" INTEGER,
    "description" TEXT,
    "imageUrls" TEXT[],
    "sourceName" TEXT NOT NULL,
    "sourceUrl" TEXT,
    "sourceListingId" TEXT,
    "sourceId" TEXT,
    "difficulty" INTEGER NOT NULL DEFAULT 5,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "rightsVerified" BOOLEAN NOT NULL DEFAULT false,
    "imageUsageRights" TEXT,
    "isDemo" BOOLEAN NOT NULL DEFAULT false,
    "lastCheckedAt" TIMESTAMP(3),
    "brokenImageReports" INTEGER NOT NULL DEFAULT 0,
    "aiInsight" TEXT,
    "aiDifficulty" INTEGER,
    "aiGeneratedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Property_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Game" (
    "id" TEXT NOT NULL,
    "product" "Product" NOT NULL DEFAULT 'HOMES',
    "mode" "GameMode" NOT NULL,
    "status" "GameStatus" NOT NULL DEFAULT 'ACTIVE',
    "userId" TEXT NOT NULL,
    "scopeKey" TEXT,
    "dailyChallengeId" TEXT,
    "roundCount" INTEGER NOT NULL DEFAULT 5,
    "totalScore" INTEGER NOT NULL DEFAULT 0,
    "startedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "completedAt" TIMESTAMP(3),

    CONSTRAINT "Game_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "GameRound" (
    "id" TEXT NOT NULL,
    "gameId" TEXT NOT NULL,
    "index" INTEGER NOT NULL,
    "propertyId" TEXT NOT NULL,
    "shownAt" TIMESTAMP(3),

    CONSTRAINT "GameRound_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Guess" (
    "id" TEXT NOT NULL,
    "roundId" TEXT NOT NULL,
    "value" INTEGER NOT NULL,
    "currency" CHAR(3) NOT NULL,
    "actualValue" INTEGER NOT NULL,
    "errorPct" DOUBLE PRECISION NOT NULL,
    "accuracy" DOUBLE PRECISION NOT NULL,
    "score" INTEGER NOT NULL,
    "tier" TEXT NOT NULL,
    "timeTakenMs" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Guess_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DailyChallenge" (
    "id" TEXT NOT NULL,
    "product" "Product" NOT NULL DEFAULT 'HOMES',
    "date" TEXT NOT NULL,
    "status" "DailyChallengeStatus" NOT NULL DEFAULT 'PUBLISHED',
    "generated" BOOLEAN NOT NULL DEFAULT true,
    "publishedAt" TIMESTAMP(3),
    "createdById" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "DailyChallenge_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DailyChallengeRound" (
    "id" TEXT NOT NULL,
    "challengeId" TEXT NOT NULL,
    "index" INTEGER NOT NULL,
    "propertyId" TEXT NOT NULL,

    CONSTRAINT "DailyChallengeRound_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "LeaderboardEntry" (
    "id" TEXT NOT NULL,
    "product" "Product" NOT NULL DEFAULT 'HOMES',
    "scope" "LeaderboardScope" NOT NULL,
    "scopeKey" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "gameId" TEXT NOT NULL,
    "score" INTEGER NOT NULL,
    "accuracy" DOUBLE PRECISION NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "LeaderboardEntry_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Subscription" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "type" "EntitlementType" NOT NULL,
    "status" "SubscriptionStatus" NOT NULL DEFAULT 'PENDING',
    "provider" TEXT NOT NULL,
    "providerSessionId" TEXT,
    "providerSubscriptionId" TEXT,
    "amountCents" INTEGER,
    "currency" TEXT,
    "startsAt" TIMESTAMP(3),
    "expiresAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Subscription_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AdminAuditLog" (
    "id" TEXT NOT NULL,
    "actorId" TEXT,
    "action" TEXT NOT NULL,
    "entityType" TEXT NOT NULL,
    "entityId" TEXT,
    "details" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AdminAuditLog_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AnalyticsEvent" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "userId" TEXT,
    "props" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AnalyticsEvent_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SecurityEvent" (
    "id" TEXT NOT NULL,
    "kind" TEXT NOT NULL,
    "userId" TEXT,
    "ip" TEXT,
    "details" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "SecurityEvent_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

-- CreateIndex
CREATE UNIQUE INDEX "User_username_key" ON "User"("username");

-- CreateIndex
CREATE INDEX "User_isGuest_createdAt_idx" ON "User"("isGuest", "createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "Session_sessionToken_key" ON "Session"("sessionToken");

-- CreateIndex
CREATE UNIQUE INDEX "City_slug_key" ON "City"("slug");

-- CreateIndex
CREATE INDEX "City_countryCode_idx" ON "City"("countryCode");

-- CreateIndex
CREATE UNIQUE INDEX "PropertySource_name_key" ON "PropertySource"("name");

-- CreateIndex
CREATE INDEX "Property_active_rightsVerified_idx" ON "Property"("active", "rightsVerified");

-- CreateIndex
CREATE INDEX "Property_cityId_idx" ON "Property"("cityId");

-- CreateIndex
CREATE INDEX "Property_countryCode_idx" ON "Property"("countryCode");

-- CreateIndex
CREATE UNIQUE INDEX "Property_sourceName_sourceListingId_key" ON "Property"("sourceName", "sourceListingId");

-- CreateIndex
CREATE INDEX "Game_userId_startedAt_idx" ON "Game"("userId", "startedAt");

-- CreateIndex
CREATE INDEX "Game_mode_status_completedAt_idx" ON "Game"("mode", "status", "completedAt");

-- CreateIndex
CREATE UNIQUE INDEX "Game_userId_dailyChallengeId_key" ON "Game"("userId", "dailyChallengeId");

-- CreateIndex
CREATE INDEX "GameRound_propertyId_idx" ON "GameRound"("propertyId");

-- CreateIndex
CREATE UNIQUE INDEX "GameRound_gameId_index_key" ON "GameRound"("gameId", "index");

-- CreateIndex
CREATE UNIQUE INDEX "GameRound_gameId_propertyId_key" ON "GameRound"("gameId", "propertyId");

-- CreateIndex
CREATE UNIQUE INDEX "Guess_roundId_key" ON "Guess"("roundId");

-- CreateIndex
CREATE UNIQUE INDEX "DailyChallenge_product_date_key" ON "DailyChallenge"("product", "date");

-- CreateIndex
CREATE UNIQUE INDEX "DailyChallengeRound_challengeId_index_key" ON "DailyChallengeRound"("challengeId", "index");

-- CreateIndex
CREATE UNIQUE INDEX "DailyChallengeRound_challengeId_propertyId_key" ON "DailyChallengeRound"("challengeId", "propertyId");

-- CreateIndex
CREATE INDEX "LeaderboardEntry_product_scope_scopeKey_score_idx" ON "LeaderboardEntry"("product", "scope", "scopeKey", "score");

-- CreateIndex
CREATE UNIQUE INDEX "LeaderboardEntry_product_scope_scopeKey_userId_key" ON "LeaderboardEntry"("product", "scope", "scopeKey", "userId");

-- CreateIndex
CREATE UNIQUE INDEX "Subscription_providerSessionId_key" ON "Subscription"("providerSessionId");

-- CreateIndex
CREATE INDEX "Subscription_userId_status_expiresAt_idx" ON "Subscription"("userId", "status", "expiresAt");

-- CreateIndex
CREATE INDEX "AdminAuditLog_createdAt_idx" ON "AdminAuditLog"("createdAt");

-- CreateIndex
CREATE INDEX "AdminAuditLog_entityType_entityId_idx" ON "AdminAuditLog"("entityType", "entityId");

-- CreateIndex
CREATE INDEX "AnalyticsEvent_name_createdAt_idx" ON "AnalyticsEvent"("name", "createdAt");

-- CreateIndex
CREATE INDEX "AnalyticsEvent_createdAt_idx" ON "AnalyticsEvent"("createdAt");

-- CreateIndex
CREATE INDEX "SecurityEvent_kind_createdAt_idx" ON "SecurityEvent"("kind", "createdAt");

-- AddForeignKey
ALTER TABLE "Account" ADD CONSTRAINT "Account_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Session" ADD CONSTRAINT "Session_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Property" ADD CONSTRAINT "Property_cityId_fkey" FOREIGN KEY ("cityId") REFERENCES "City"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Property" ADD CONSTRAINT "Property_sourceId_fkey" FOREIGN KEY ("sourceId") REFERENCES "PropertySource"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Game" ADD CONSTRAINT "Game_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Game" ADD CONSTRAINT "Game_dailyChallengeId_fkey" FOREIGN KEY ("dailyChallengeId") REFERENCES "DailyChallenge"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "GameRound" ADD CONSTRAINT "GameRound_gameId_fkey" FOREIGN KEY ("gameId") REFERENCES "Game"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "GameRound" ADD CONSTRAINT "GameRound_propertyId_fkey" FOREIGN KEY ("propertyId") REFERENCES "Property"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Guess" ADD CONSTRAINT "Guess_roundId_fkey" FOREIGN KEY ("roundId") REFERENCES "GameRound"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DailyChallengeRound" ADD CONSTRAINT "DailyChallengeRound_challengeId_fkey" FOREIGN KEY ("challengeId") REFERENCES "DailyChallenge"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DailyChallengeRound" ADD CONSTRAINT "DailyChallengeRound_propertyId_fkey" FOREIGN KEY ("propertyId") REFERENCES "Property"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LeaderboardEntry" ADD CONSTRAINT "LeaderboardEntry_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LeaderboardEntry" ADD CONSTRAINT "LeaderboardEntry_gameId_fkey" FOREIGN KEY ("gameId") REFERENCES "Game"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Subscription" ADD CONSTRAINT "Subscription_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AdminAuditLog" ADD CONSTRAINT "AdminAuditLog_actorId_fkey" FOREIGN KEY ("actorId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
