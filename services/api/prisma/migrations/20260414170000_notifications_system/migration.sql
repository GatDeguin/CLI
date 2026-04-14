-- CreateEnum
CREATE TYPE "NotificationDispatchEventType" AS ENUM ('QUEUED', 'SENT', 'DELIVERED', 'FAILED', 'REPROCESSED', 'DEAD_LETTERED');

-- CreateTable
CREATE TABLE "NotificationTemplate" (
    "id" TEXT NOT NULL,
    "eventKey" TEXT NOT NULL,
    "channel" "NotificationChannel" NOT NULL,
    "titleTemplate" TEXT NOT NULL,
    "bodyTemplate" TEXT NOT NULL,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "updatedBy" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "NotificationTemplate_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "NotificationDispatch" (
    "id" TEXT NOT NULL,
    "eventId" TEXT NOT NULL,
    "eventKey" TEXT NOT NULL,
    "patientId" TEXT NOT NULL,
    "channel" "NotificationChannel" NOT NULL,
    "templateId" TEXT,
    "status" "NotificationStatus" NOT NULL DEFAULT 'QUEUED',
    "title" TEXT NOT NULL,
    "body" TEXT NOT NULL,
    "payload" JSONB NOT NULL,
    "attempts" INTEGER NOT NULL DEFAULT 0,
    "maxAttempts" INTEGER NOT NULL DEFAULT 4,
    "correlationId" TEXT,
    "providerRef" TEXT,
    "lastError" TEXT,
    "queuedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "sentAt" TIMESTAMP(3),
    "deliveredAt" TIMESTAMP(3),
    "failedAt" TIMESTAMP(3),
    "deadLetteredAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "NotificationDispatch_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "NotificationDispatchAudit" (
    "id" TEXT NOT NULL,
    "dispatchId" TEXT NOT NULL,
    "eventType" "NotificationDispatchEventType" NOT NULL,
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "NotificationDispatchAudit_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "NotificationTemplate_eventKey_channel_key" ON "NotificationTemplate"("eventKey", "channel");

-- CreateIndex
CREATE INDEX "NotificationTemplate_eventKey_active_idx" ON "NotificationTemplate"("eventKey", "active");

-- CreateIndex
CREATE UNIQUE INDEX "NotificationDispatch_eventId_key" ON "NotificationDispatch"("eventId");

-- CreateIndex
CREATE INDEX "NotificationDispatch_patientId_status_idx" ON "NotificationDispatch"("patientId", "status");

-- CreateIndex
CREATE INDEX "NotificationDispatch_eventKey_channel_idx" ON "NotificationDispatch"("eventKey", "channel");

-- CreateIndex
CREATE INDEX "NotificationDispatchAudit_dispatchId_createdAt_idx" ON "NotificationDispatchAudit"("dispatchId", "createdAt");

-- AddForeignKey
ALTER TABLE "NotificationDispatch" ADD CONSTRAINT "NotificationDispatch_patientId_fkey" FOREIGN KEY ("patientId") REFERENCES "Patient"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "NotificationDispatch" ADD CONSTRAINT "NotificationDispatch_templateId_fkey" FOREIGN KEY ("templateId") REFERENCES "NotificationTemplate"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "NotificationDispatchAudit" ADD CONSTRAINT "NotificationDispatchAudit_dispatchId_fkey" FOREIGN KEY ("dispatchId") REFERENCES "NotificationDispatch"("id") ON DELETE CASCADE ON UPDATE CASCADE;
