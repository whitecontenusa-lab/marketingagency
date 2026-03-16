-- AlterTable
ALTER TABLE "ClientUser" ADD COLUMN     "stripeCustomerId" TEXT;

-- AlterTable
ALTER TABLE "ContentCycle" ADD COLUMN     "stripeSessionId" TEXT;

-- AlterTable
ALTER TABLE "ContentPiece" ADD COLUMN     "engagementRate" DOUBLE PRECISION NOT NULL DEFAULT 0,
ADD COLUMN     "impressions" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "metricsUpdatedAt" TIMESTAMP(3),
ADD COLUMN     "reach" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "saves" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "shares" INTEGER NOT NULL DEFAULT 0;
