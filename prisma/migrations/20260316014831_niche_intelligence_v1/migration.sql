-- AlterTable
ALTER TABLE "ContentPiece" ADD COLUMN     "funnelStage" TEXT NOT NULL DEFAULT '',
ADD COLUMN     "week" INTEGER NOT NULL DEFAULT 0;

-- CreateTable
CREATE TABLE "NicheIntelligence" (
    "id" TEXT NOT NULL,
    "sessionId" TEXT NOT NULL,
    "icpVocabulary" TEXT NOT NULL DEFAULT '',
    "icpObjections" TEXT NOT NULL DEFAULT '',
    "icpTriggerWords" TEXT NOT NULL DEFAULT '',
    "competitorDiffs" TEXT NOT NULL DEFAULT '',
    "dominantFormats" TEXT NOT NULL DEFAULT '',
    "hookTemplates" TEXT NOT NULL DEFAULT '',
    "positioningAngle" TEXT NOT NULL DEFAULT '',
    "generatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "NicheIntelligence_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "NicheIntelligence_sessionId_key" ON "NicheIntelligence"("sessionId");

-- AddForeignKey
ALTER TABLE "NicheIntelligence" ADD CONSTRAINT "NicheIntelligence_sessionId_fkey" FOREIGN KEY ("sessionId") REFERENCES "OnboardingSession"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
