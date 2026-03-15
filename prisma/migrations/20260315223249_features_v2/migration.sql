-- AlterTable
ALTER TABLE "ContentPiece" ADD COLUMN     "cycleId" TEXT,
ADD COLUMN     "releasedAt" TIMESTAMP(3);

-- AlterTable
ALTER TABLE "OnboardingSession" ADD COLUMN     "brandBriefGenerated" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "brandColors" TEXT NOT NULL DEFAULT '',
ADD COLUMN     "brandFonts" TEXT NOT NULL DEFAULT '',
ADD COLUMN     "brandLogoUrl" TEXT NOT NULL DEFAULT '',
ADD COLUMN     "contentPillars" TEXT NOT NULL DEFAULT '',
ADD COLUMN     "credentialHighlights" TEXT NOT NULL DEFAULT '',
ADD COLUMN     "expertise" TEXT NOT NULL DEFAULT '',
ADD COLUMN     "hasBranding" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "personalStory" TEXT NOT NULL DEFAULT '';

-- CreateTable
CREATE TABLE "ContentCycle" (
    "id" TEXT NOT NULL,
    "sessionId" TEXT NOT NULL,
    "cycleNumber" INTEGER NOT NULL DEFAULT 1,
    "status" TEXT NOT NULL DEFAULT 'locked',
    "billingOk" BOOLEAN NOT NULL DEFAULT false,
    "adminApprovedAt" TIMESTAMP(3),
    "generatedAt" TIMESTAMP(3),
    "deliveryDate" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ContentCycle_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ClientReport" (
    "id" TEXT NOT NULL,
    "sessionId" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "month" INTEGER NOT NULL,
    "year" INTEGER NOT NULL,
    "content" TEXT NOT NULL,
    "generatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "sentAt" TIMESTAMP(3),

    CONSTRAINT "ClientReport_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "ContentCycle_sessionId_cycleNumber_key" ON "ContentCycle"("sessionId", "cycleNumber");

-- CreateIndex
CREATE UNIQUE INDEX "ClientReport_sessionId_type_month_year_key" ON "ClientReport"("sessionId", "type", "month", "year");

-- AddForeignKey
ALTER TABLE "ContentPiece" ADD CONSTRAINT "ContentPiece_cycleId_fkey" FOREIGN KEY ("cycleId") REFERENCES "ContentCycle"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ContentCycle" ADD CONSTRAINT "ContentCycle_sessionId_fkey" FOREIGN KEY ("sessionId") REFERENCES "OnboardingSession"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ClientReport" ADD CONSTRAINT "ClientReport_sessionId_fkey" FOREIGN KEY ("sessionId") REFERENCES "OnboardingSession"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
