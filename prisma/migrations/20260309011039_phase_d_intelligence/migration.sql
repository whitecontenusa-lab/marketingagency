-- CreateTable
CREATE TABLE "MarketIntelligence" (
    "id" TEXT NOT NULL,
    "sessionId" TEXT NOT NULL,
    "industry" TEXT NOT NULL,
    "country" TEXT NOT NULL,
    "competitors" TEXT NOT NULL DEFAULT '',
    "trends" TEXT NOT NULL DEFAULT '',
    "positioning" TEXT NOT NULL DEFAULT '',
    "keywords" TEXT NOT NULL DEFAULT '',
    "rawSummary" TEXT NOT NULL DEFAULT '',
    "generatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "MarketIntelligence_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AgencyLearning" (
    "id" TEXT NOT NULL,
    "industry" TEXT NOT NULL,
    "funnelType" INTEGER NOT NULL,
    "archetype" TEXT NOT NULL,
    "insight" TEXT NOT NULL,
    "sourceId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AgencyLearning_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "MarketIntelligence_sessionId_key" ON "MarketIntelligence"("sessionId");

-- AddForeignKey
ALTER TABLE "MarketIntelligence" ADD CONSTRAINT "MarketIntelligence_sessionId_fkey" FOREIGN KEY ("sessionId") REFERENCES "OnboardingSession"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
