-- CreateTable
CREATE TABLE "PlatformIntelligence" (
    "id" TEXT NOT NULL,
    "platform" TEXT NOT NULL,
    "algorithmPriorities" TEXT NOT NULL DEFAULT '',
    "bestFormats" TEXT NOT NULL DEFAULT '',
    "bestFrequency" TEXT NOT NULL DEFAULT '',
    "optimalTiming" TEXT NOT NULL DEFAULT '',
    "currentTrends" TEXT NOT NULL DEFAULT '',
    "avoidList" TEXT NOT NULL DEFAULT '',
    "recentChanges" TEXT NOT NULL DEFAULT '',
    "emergingFeatures" TEXT NOT NULL DEFAULT '',
    "confidence" TEXT NOT NULL DEFAULT 'medium',
    "teamNotes" TEXT NOT NULL DEFAULT '',
    "status" TEXT NOT NULL DEFAULT 'draft',
    "generatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "approvedAt" TIMESTAMP(3),
    "approvedBy" TEXT,

    CONSTRAINT "PlatformIntelligence_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "PlatformIntelligence_platform_key" ON "PlatformIntelligence"("platform");
