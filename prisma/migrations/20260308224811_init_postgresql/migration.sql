-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "passwordHash" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Session" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "token" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Session_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TeamMember" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "role" TEXT NOT NULL,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "TeamMember_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Client" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "brandName" TEXT,
    "email" TEXT,
    "whatsapp" TEXT,
    "channels" TEXT,
    "industry" TEXT NOT NULL,
    "country" TEXT NOT NULL,
    "language" TEXT NOT NULL DEFAULT 'es',
    "phase" INTEGER NOT NULL DEFAULT 1,
    "status" TEXT NOT NULL DEFAULT 'active',
    "onboardingDate" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "archivedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Client_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ClientProfile" (
    "id" TEXT NOT NULL,
    "clientId" TEXT NOT NULL,
    "purpose" TEXT NOT NULL DEFAULT '',
    "values" TEXT NOT NULL DEFAULT '',
    "neverList" TEXT NOT NULL DEFAULT '',
    "vision3Years" TEXT NOT NULL DEFAULT '',
    "icpDemographic" TEXT NOT NULL DEFAULT '',
    "icpPain" TEXT NOT NULL DEFAULT '',
    "icpDesire" TEXT NOT NULL DEFAULT '',
    "icpObjection" TEXT NOT NULL DEFAULT '',
    "icpMicrosegment" TEXT NOT NULL DEFAULT '',
    "icpInternalDialogue" TEXT NOT NULL DEFAULT '',
    "icpDeepPain" TEXT NOT NULL DEFAULT '',
    "icpDeepDesire" TEXT NOT NULL DEFAULT '',
    "icpCounterargument" TEXT NOT NULL DEFAULT '',
    "emotionalArchetype" TEXT NOT NULL DEFAULT '',
    "emotionalArchetypeDesc" TEXT NOT NULL DEFAULT '',
    "audienceArchetype" TEXT NOT NULL DEFAULT '',
    "audienceArchetypeDesc" TEXT NOT NULL DEFAULT '',
    "archetypeRelationship" TEXT NOT NULL DEFAULT '',
    "contentEmotion" TEXT NOT NULL DEFAULT '',
    "contentTransformation" TEXT NOT NULL DEFAULT '',
    "contentPillars" TEXT NOT NULL DEFAULT '',
    "voiceAdjectives" TEXT NOT NULL DEFAULT '',
    "voiceVocabulary" TEXT NOT NULL DEFAULT '',
    "voiceForbidden" TEXT NOT NULL DEFAULT '',
    "toneByContext" TEXT NOT NULL DEFAULT '',
    "channelFormats" TEXT NOT NULL DEFAULT '',
    "funnelType" INTEGER NOT NULL DEFAULT 0,
    "funnelReason" TEXT NOT NULL DEFAULT '',
    "pricingEntry" TEXT NOT NULL DEFAULT '',
    "pricingCore" TEXT NOT NULL DEFAULT '',
    "pricingPremium" TEXT NOT NULL DEFAULT '',
    "valuePromise" TEXT NOT NULL DEFAULT '',
    "gateCanDeliver" BOOLEAN NOT NULL DEFAULT false,
    "gateGenuinePurpose" BOOLEAN NOT NULL DEFAULT false,
    "gateAutoServesPurpose" BOOLEAN NOT NULL DEFAULT false,
    "gateMeasurableResults" BOOLEAN NOT NULL DEFAULT false,
    "gateResult" TEXT NOT NULL DEFAULT '',
    "gateDiagnosisNotes" TEXT NOT NULL DEFAULT '',
    "initialEmotionalState" INTEGER NOT NULL DEFAULT 3,
    "giteaFolderCreated" BOOLEAN NOT NULL DEFAULT false,
    "giteaFolderPath" TEXT NOT NULL DEFAULT '',

    CONSTRAINT "ClientProfile_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "EmotionalCheckin" (
    "id" TEXT NOT NULL,
    "clientId" TEXT NOT NULL,
    "level" INTEGER NOT NULL,
    "notes" TEXT NOT NULL DEFAULT '',
    "triggeredBy" TEXT NOT NULL DEFAULT 'manual',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "EmotionalCheckin_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ItrScore" (
    "id" TEXT NOT NULL,
    "clientId" TEXT NOT NULL,
    "month" INTEGER NOT NULL,
    "year" INTEGER NOT NULL,
    "emotional" INTEGER NOT NULL DEFAULT 0,
    "pedagogical" INTEGER NOT NULL DEFAULT 0,
    "strategic" INTEGER NOT NULL DEFAULT 0,
    "narrative" INTEGER NOT NULL DEFAULT 0,
    "technical" INTEGER NOT NULL DEFAULT 0,
    "perceptive" INTEGER NOT NULL DEFAULT 0,
    "total" INTEGER NOT NULL DEFAULT 0,
    "scorePct" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ItrScore_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "FunnelMetric" (
    "id" TEXT NOT NULL,
    "clientId" TEXT NOT NULL,
    "funnelType" INTEGER NOT NULL,
    "clarity" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "coherence" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "leads" INTEGER NOT NULL DEFAULT 0,
    "conversions" INTEGER NOT NULL DEFAULT 0,
    "revenue" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "measuredAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "FunnelMetric_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ContentMetric" (
    "id" TEXT NOT NULL,
    "clientId" TEXT NOT NULL,
    "channel" TEXT NOT NULL,
    "format" TEXT NOT NULL,
    "pillar" INTEGER NOT NULL,
    "engagement" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "reach" INTEGER NOT NULL DEFAULT 0,
    "publishedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ContentMetric_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "RingActivation" (
    "id" TEXT NOT NULL,
    "clientId" TEXT NOT NULL,
    "ringNumber" INTEGER NOT NULL,
    "ringName" TEXT NOT NULL,
    "phase" INTEGER NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "activatedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "RingActivation_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CapacityLog" (
    "id" TEXT NOT NULL,
    "date" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "activeClients" INTEGER NOT NULL,
    "teamSize" INTEGER NOT NULL,
    "capacityPct" DOUBLE PRECISION NOT NULL,
    "bottleneckRing" INTEGER,
    "notes" TEXT,

    CONSTRAINT "CapacityLog_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Alert" (
    "id" TEXT NOT NULL,
    "clientId" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "severity" TEXT NOT NULL,
    "message" TEXT NOT NULL,
    "triggeredAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "resolvedAt" TIMESTAMP(3),
    "autoGenerated" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "Alert_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Notification" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "message" TEXT NOT NULL,
    "readAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Notification_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AgencyPattern" (
    "id" TEXT NOT NULL,
    "period" TEXT NOT NULL,
    "funnelType" INTEGER NOT NULL,
    "industry" TEXT NOT NULL,
    "avgItr" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "avgConversion" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "sampleSize" INTEGER NOT NULL DEFAULT 0,
    "lastCalculatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AgencyPattern_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ContentIntelligence" (
    "id" TEXT NOT NULL,
    "pillar" INTEGER NOT NULL,
    "industry" TEXT NOT NULL,
    "avgEngagement" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "topFormat" TEXT NOT NULL,
    "period" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ContentIntelligence_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ClientUser" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "passwordHash" TEXT NOT NULL,
    "sessionId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "mustResetPwd" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "ClientUser_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ClientSession" (
    "id" TEXT NOT NULL,
    "token" TEXT NOT NULL,
    "clientId" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ClientSession_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "OnboardingSession" (
    "id" TEXT NOT NULL,
    "clientId" TEXT,
    "clientName" TEXT NOT NULL DEFAULT '',
    "brandName" TEXT NOT NULL DEFAULT '',
    "email" TEXT NOT NULL DEFAULT '',
    "whatsapp" TEXT NOT NULL DEFAULT '',
    "language" TEXT NOT NULL DEFAULT 'es',
    "channels" TEXT NOT NULL DEFAULT '',
    "industry" TEXT NOT NULL DEFAULT '',
    "country" TEXT NOT NULL DEFAULT '',
    "productDescription" TEXT NOT NULL DEFAULT '',
    "productPrice" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "businessStage" TEXT NOT NULL DEFAULT '',
    "monthlyRevenue" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "purpose" TEXT NOT NULL DEFAULT '',
    "values" TEXT NOT NULL DEFAULT '',
    "neverList" TEXT NOT NULL DEFAULT '',
    "vision3Years" TEXT NOT NULL DEFAULT '',
    "icpDemographic" TEXT NOT NULL DEFAULT '',
    "icpPain" TEXT NOT NULL DEFAULT '',
    "icpDesire" TEXT NOT NULL DEFAULT '',
    "agencyContext" TEXT NOT NULL DEFAULT '',
    "businessType" TEXT NOT NULL DEFAULT '',
    "revenueModel" TEXT NOT NULL DEFAULT '',
    "specificProduct" TEXT NOT NULL DEFAULT '',
    "targetAudience" TEXT NOT NULL DEFAULT '',
    "token" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "agencyReviewApproved" BOOLEAN NOT NULL DEFAULT false,
    "completedAt" TIMESTAMP(3),
    "ipAddress" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "OnboardingSession_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "InterviewQuestion" (
    "id" TEXT NOT NULL,
    "sessionId" TEXT NOT NULL,
    "questionText" TEXT NOT NULL,
    "category" TEXT NOT NULL,
    "orderNum" INTEGER NOT NULL,
    "whyAsking" TEXT NOT NULL,
    "originalGenerated" TEXT NOT NULL,

    CONSTRAINT "InterviewQuestion_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "InterviewAnswer" (
    "id" TEXT NOT NULL,
    "questionId" TEXT NOT NULL,
    "answerText" TEXT NOT NULL,
    "autoSavedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "InterviewAnswer_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Blueprint" (
    "id" TEXT NOT NULL,
    "clientId" TEXT NOT NULL,
    "sessionId" TEXT NOT NULL,
    "version" INTEGER NOT NULL DEFAULT 1,
    "contentHtml" TEXT NOT NULL,
    "contentMd" TEXT NOT NULL,
    "agencyApprovedAt" TIMESTAMP(3),
    "deliveredAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Blueprint_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

-- CreateIndex
CREATE UNIQUE INDEX "Session_token_key" ON "Session"("token");

-- CreateIndex
CREATE UNIQUE INDEX "ClientProfile_clientId_key" ON "ClientProfile"("clientId");

-- CreateIndex
CREATE UNIQUE INDEX "ClientUser_email_key" ON "ClientUser"("email");

-- CreateIndex
CREATE UNIQUE INDEX "ClientUser_sessionId_key" ON "ClientUser"("sessionId");

-- CreateIndex
CREATE UNIQUE INDEX "ClientSession_token_key" ON "ClientSession"("token");

-- CreateIndex
CREATE UNIQUE INDEX "OnboardingSession_token_key" ON "OnboardingSession"("token");

-- AddForeignKey
ALTER TABLE "Session" ADD CONSTRAINT "Session_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ClientProfile" ADD CONSTRAINT "ClientProfile_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "Client"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EmotionalCheckin" ADD CONSTRAINT "EmotionalCheckin_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "Client"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ItrScore" ADD CONSTRAINT "ItrScore_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "Client"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FunnelMetric" ADD CONSTRAINT "FunnelMetric_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "Client"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ContentMetric" ADD CONSTRAINT "ContentMetric_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "Client"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RingActivation" ADD CONSTRAINT "RingActivation_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "Client"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Alert" ADD CONSTRAINT "Alert_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "Client"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Notification" ADD CONSTRAINT "Notification_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ClientUser" ADD CONSTRAINT "ClientUser_sessionId_fkey" FOREIGN KEY ("sessionId") REFERENCES "OnboardingSession"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ClientSession" ADD CONSTRAINT "ClientSession_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "ClientUser"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OnboardingSession" ADD CONSTRAINT "OnboardingSession_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "Client"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "InterviewQuestion" ADD CONSTRAINT "InterviewQuestion_sessionId_fkey" FOREIGN KEY ("sessionId") REFERENCES "OnboardingSession"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "InterviewAnswer" ADD CONSTRAINT "InterviewAnswer_questionId_fkey" FOREIGN KEY ("questionId") REFERENCES "InterviewQuestion"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Blueprint" ADD CONSTRAINT "Blueprint_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "Client"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Blueprint" ADD CONSTRAINT "Blueprint_sessionId_fkey" FOREIGN KEY ("sessionId") REFERENCES "OnboardingSession"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
