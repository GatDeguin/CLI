-- AlterTable
ALTER TABLE "Appointment" ADD COLUMN IF NOT EXISTS "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;

-- CreateTable
CREATE TABLE IF NOT EXISTS "SlotHold" (
    "id" TEXT NOT NULL,
    "idempotencyKey" TEXT NOT NULL,
    "slotId" TEXT NOT NULL,
    "patientId" TEXT NOT NULL,
    "correlationId" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "releasedAt" TIMESTAMP(3),
    "releaseReason" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "SlotHold_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE IF NOT EXISTS "PaymentEvent" (
    "id" TEXT NOT NULL,
    "idempotencyKey" TEXT NOT NULL,
    "provider" TEXT NOT NULL,
    "providerEventId" TEXT NOT NULL,
    "action" TEXT NOT NULL,
    "paymentId" TEXT,
    "correlationId" TEXT NOT NULL,
    "rawPayload" JSONB NOT NULL,
    "accepted" BOOLEAN NOT NULL,
    "reason" TEXT,
    "processedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "PaymentEvent_pkey" PRIMARY KEY ("id")
);

-- AlterTable
ALTER TABLE "Payment" ADD COLUMN IF NOT EXISTS "providerPaymentId" TEXT;
ALTER TABLE "Payment" ADD COLUMN IF NOT EXISTS "externalReference" TEXT;
ALTER TABLE "Payment" ADD COLUMN IF NOT EXISTS "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;

-- Indexes
CREATE UNIQUE INDEX IF NOT EXISTS "SlotHold_idempotencyKey_key" ON "SlotHold"("idempotencyKey");
CREATE INDEX IF NOT EXISTS "SlotHold_slotId_expiresAt_releasedAt_idx" ON "SlotHold"("slotId", "expiresAt", "releasedAt");
CREATE INDEX IF NOT EXISTS "SlotHold_patientId_createdAt_idx" ON "SlotHold"("patientId", "createdAt");
CREATE UNIQUE INDEX IF NOT EXISTS "Payment_providerPaymentId_key" ON "Payment"("providerPaymentId");
CREATE INDEX IF NOT EXISTS "Payment_appointmentId_idx" ON "Payment"("appointmentId");
CREATE INDEX IF NOT EXISTS "Payment_externalReference_idx" ON "Payment"("externalReference");
CREATE UNIQUE INDEX IF NOT EXISTS "PaymentEvent_idempotencyKey_key" ON "PaymentEvent"("idempotencyKey");
CREATE INDEX IF NOT EXISTS "PaymentEvent_provider_providerEventId_idx" ON "PaymentEvent"("provider", "providerEventId");
CREATE INDEX IF NOT EXISTS "PaymentEvent_processedAt_idx" ON "PaymentEvent"("processedAt");

-- Foreign keys
ALTER TABLE "SlotHold" ADD CONSTRAINT "SlotHold_slotId_fkey" FOREIGN KEY ("slotId") REFERENCES "Slot"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "Payment" ADD CONSTRAINT "Payment_appointmentId_fkey" FOREIGN KEY ("appointmentId") REFERENCES "Appointment"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "PaymentEvent" ADD CONSTRAINT "PaymentEvent_paymentId_fkey" FOREIGN KEY ("paymentId") REFERENCES "Payment"("id") ON DELETE SET NULL ON UPDATE CASCADE;
