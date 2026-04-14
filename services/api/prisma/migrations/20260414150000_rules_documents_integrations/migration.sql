-- Enums
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'FamilyPermissionType') THEN
    CREATE TYPE "FamilyPermissionType" AS ENUM ('MEDICAL_ORDERS', 'DOCUMENTS', 'PAYMENTS', 'SCHEDULING');
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'IntegrationAttemptStatus') THEN
    CREATE TYPE "IntegrationAttemptStatus" AS ENUM ('SUCCESS', 'ERROR', 'TIMEOUT');
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'WebhookProcessingStatus') THEN
    CREATE TYPE "WebhookProcessingStatus" AS ENUM ('RECEIVED', 'PROCESSED', 'REJECTED');
  END IF;
END $$;

-- Extensions required for exclusion constraints
CREATE EXTENSION IF NOT EXISTS btree_gist;

-- Rule tables
CREATE TABLE IF NOT EXISTS "CoverageMatrixRule" (
  "id" TEXT NOT NULL,
  "coveragePlanId" TEXT NOT NULL,
  "specialtyId" TEXT NOT NULL,
  "siteCode" TEXT,
  "practiceCode" TEXT NOT NULL,
  "resolution" JSONB NOT NULL,
  "validFrom" TIMESTAMP(3) NOT NULL,
  "validTo" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "CoverageMatrixRule_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "EconomicRule" (
  "id" TEXT NOT NULL,
  "coveragePlanId" TEXT NOT NULL,
  "profile" "ProfileType" NOT NULL,
  "conceptCode" TEXT NOT NULL,
  "currency" TEXT NOT NULL DEFAULT 'ARS',
  "copayAmount" DECIMAL(10,2) NOT NULL DEFAULT 0,
  "reimbursementPct" DECIMAL(5,2) NOT NULL DEFAULT 0,
  "validFrom" TIMESTAMP(3) NOT NULL,
  "validTo" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "EconomicRule_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "BusinessRule" (
  "id" TEXT NOT NULL,
  "domain" TEXT NOT NULL,
  "ruleCode" TEXT NOT NULL,
  "description" TEXT,
  "priority" INTEGER NOT NULL DEFAULT 100,
  "condition" JSONB NOT NULL,
  "outcome" JSONB NOT NULL,
  "validFrom" TIMESTAMP(3) NOT NULL,
  "validTo" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "BusinessRule_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "RuleAudit" (
  "id" TEXT NOT NULL,
  "coverageMatrixRuleId" TEXT,
  "economicRuleId" TEXT,
  "businessRuleId" TEXT,
  "changedByUserId" TEXT NOT NULL,
  "action" TEXT NOT NULL,
  "beforeSnapshot" JSONB,
  "afterSnapshot" JSONB,
  "changedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "RuleAudit_pkey" PRIMARY KEY ("id")
);

-- Family, documents and integrations
CREATE TABLE IF NOT EXISTS "FamilyPermission" (
  "id" TEXT NOT NULL,
  "tutorUserId" TEXT NOT NULL,
  "dependentPatientId" TEXT NOT NULL,
  "permissionType" "FamilyPermissionType" NOT NULL,
  "grantedByUserId" TEXT NOT NULL,
  "validFrom" TIMESTAMP(3) NOT NULL,
  "validTo" TIMESTAMP(3),
  "notes" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "FamilyPermission_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "DocumentVersion" (
  "id" TEXT NOT NULL,
  "documentId" TEXT NOT NULL,
  "versionNumber" INTEGER NOT NULL,
  "storageUrl" TEXT NOT NULL,
  "checksumSha256" TEXT NOT NULL,
  "mimeType" TEXT NOT NULL,
  "validFrom" TIMESTAMP(3) NOT NULL,
  "validTo" TIMESTAMP(3),
  "createdByUserId" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "DocumentVersion_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "DocumentAccessAudit" (
  "id" TEXT NOT NULL,
  "documentId" TEXT NOT NULL,
  "documentVersionId" TEXT,
  "patientId" TEXT,
  "accessedByUserId" TEXT,
  "action" TEXT NOT NULL,
  "channel" TEXT NOT NULL,
  "ipAddress" TEXT,
  "userAgent" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "DocumentAccessAudit_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "IntegrationAttempt" (
  "id" TEXT NOT NULL,
  "provider" TEXT NOT NULL,
  "operation" TEXT NOT NULL,
  "correlationId" TEXT NOT NULL,
  "requestBody" JSONB NOT NULL,
  "responseBody" JSONB,
  "statusCode" INTEGER,
  "status" "IntegrationAttemptStatus" NOT NULL,
  "errorMessage" TEXT,
  "attemptedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "completedAt" TIMESTAMP(3),
  CONSTRAINT "IntegrationAttempt_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "WebhookEvent" (
  "id" TEXT NOT NULL,
  "provider" TEXT NOT NULL,
  "eventType" TEXT NOT NULL,
  "providerEventId" TEXT NOT NULL,
  "idempotencyKey" TEXT NOT NULL,
  "payload" JSONB NOT NULL,
  "receivedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "processedAt" TIMESTAMP(3),
  "status" "WebhookProcessingStatus" NOT NULL DEFAULT 'RECEIVED',
  "integrationAttemptId" TEXT,
  CONSTRAINT "WebhookEvent_pkey" PRIMARY KEY ("id")
);

-- Indexes by business dimensions + validity
CREATE INDEX IF NOT EXISTS "CoverageMatrixRule_coveragePlanId_specialtyId_siteCode_practiceCode_validFrom_validTo_idx"
  ON "CoverageMatrixRule"("coveragePlanId", "specialtyId", "siteCode", "practiceCode", "validFrom", "validTo");

CREATE INDEX IF NOT EXISTS "EconomicRule_coveragePlanId_profile_conceptCode_validFrom_validTo_idx"
  ON "EconomicRule"("coveragePlanId", "profile", "conceptCode", "validFrom", "validTo");

CREATE INDEX IF NOT EXISTS "BusinessRule_domain_ruleCode_priority_validFrom_validTo_idx"
  ON "BusinessRule"("domain", "ruleCode", "priority", "validFrom", "validTo");

CREATE INDEX IF NOT EXISTS "RuleAudit_changedByUserId_changedAt_idx" ON "RuleAudit"("changedByUserId", "changedAt");
CREATE INDEX IF NOT EXISTS "RuleAudit_coverageMatrixRuleId_changedAt_idx" ON "RuleAudit"("coverageMatrixRuleId", "changedAt");
CREATE INDEX IF NOT EXISTS "RuleAudit_economicRuleId_changedAt_idx" ON "RuleAudit"("economicRuleId", "changedAt");
CREATE INDEX IF NOT EXISTS "RuleAudit_businessRuleId_changedAt_idx" ON "RuleAudit"("businessRuleId", "changedAt");

CREATE INDEX IF NOT EXISTS "FamilyPermission_tutorUserId_dependentPatientId_permissionType_validFrom_validTo_idx"
  ON "FamilyPermission"("tutorUserId", "dependentPatientId", "permissionType", "validFrom", "validTo");

CREATE UNIQUE INDEX IF NOT EXISTS "DocumentVersion_documentId_versionNumber_key"
  ON "DocumentVersion"("documentId", "versionNumber");
CREATE INDEX IF NOT EXISTS "DocumentVersion_documentId_validFrom_validTo_idx"
  ON "DocumentVersion"("documentId", "validFrom", "validTo");

CREATE INDEX IF NOT EXISTS "DocumentAccessAudit_documentId_createdAt_idx" ON "DocumentAccessAudit"("documentId", "createdAt");
CREATE INDEX IF NOT EXISTS "DocumentAccessAudit_documentVersionId_createdAt_idx" ON "DocumentAccessAudit"("documentVersionId", "createdAt");
CREATE INDEX IF NOT EXISTS "DocumentAccessAudit_patientId_createdAt_idx" ON "DocumentAccessAudit"("patientId", "createdAt");

CREATE INDEX IF NOT EXISTS "IntegrationAttempt_provider_operation_attemptedAt_idx"
  ON "IntegrationAttempt"("provider", "operation", "attemptedAt");
CREATE INDEX IF NOT EXISTS "IntegrationAttempt_correlationId_attemptedAt_idx"
  ON "IntegrationAttempt"("correlationId", "attemptedAt");

CREATE UNIQUE INDEX IF NOT EXISTS "WebhookEvent_idempotencyKey_key" ON "WebhookEvent"("idempotencyKey");
CREATE UNIQUE INDEX IF NOT EXISTS "WebhookEvent_provider_providerEventId_key" ON "WebhookEvent"("provider", "providerEventId");
CREATE INDEX IF NOT EXISTS "WebhookEvent_provider_eventType_receivedAt_idx" ON "WebhookEvent"("provider", "eventType", "receivedAt");
CREATE INDEX IF NOT EXISTS "WebhookEvent_status_receivedAt_idx" ON "WebhookEvent"("status", "receivedAt");

-- Temporal overlap constraints where applicable
ALTER TABLE "CoverageMatrixRule"
  ADD CONSTRAINT "CoverageMatrixRule_no_overlap"
  EXCLUDE USING gist (
    "coveragePlanId" WITH =,
    "specialtyId" WITH =,
    COALESCE("siteCode", '__ALL__') WITH =,
    "practiceCode" WITH =,
    tsrange("validFrom", COALESCE("validTo", 'infinity'::timestamp), '[)') WITH &&
  );

ALTER TABLE "EconomicRule"
  ADD CONSTRAINT "EconomicRule_no_overlap"
  EXCLUDE USING gist (
    "coveragePlanId" WITH =,
    "profile" WITH =,
    "conceptCode" WITH =,
    tsrange("validFrom", COALESCE("validTo", 'infinity'::timestamp), '[)') WITH &&
  );

ALTER TABLE "BusinessRule"
  ADD CONSTRAINT "BusinessRule_no_overlap"
  EXCLUDE USING gist (
    "domain" WITH =,
    "ruleCode" WITH =,
    tsrange("validFrom", COALESCE("validTo", 'infinity'::timestamp), '[)') WITH &&
  );

ALTER TABLE "FamilyPermission"
  ADD CONSTRAINT "FamilyPermission_no_overlap"
  EXCLUDE USING gist (
    "tutorUserId" WITH =,
    "dependentPatientId" WITH =,
    "permissionType" WITH =,
    tsrange("validFrom", COALESCE("validTo", 'infinity'::timestamp), '[)') WITH &&
  );

-- Foreign keys
ALTER TABLE "CoverageMatrixRule" ADD CONSTRAINT "CoverageMatrixRule_coveragePlanId_fkey" FOREIGN KEY ("coveragePlanId") REFERENCES "CoveragePlan"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "CoverageMatrixRule" ADD CONSTRAINT "CoverageMatrixRule_specialtyId_fkey" FOREIGN KEY ("specialtyId") REFERENCES "Specialty"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "EconomicRule" ADD CONSTRAINT "EconomicRule_coveragePlanId_fkey" FOREIGN KEY ("coveragePlanId") REFERENCES "CoveragePlan"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "RuleAudit" ADD CONSTRAINT "RuleAudit_coverageMatrixRuleId_fkey" FOREIGN KEY ("coverageMatrixRuleId") REFERENCES "CoverageMatrixRule"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "RuleAudit" ADD CONSTRAINT "RuleAudit_economicRuleId_fkey" FOREIGN KEY ("economicRuleId") REFERENCES "EconomicRule"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "RuleAudit" ADD CONSTRAINT "RuleAudit_businessRuleId_fkey" FOREIGN KEY ("businessRuleId") REFERENCES "BusinessRule"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "RuleAudit" ADD CONSTRAINT "RuleAudit_changedByUserId_fkey" FOREIGN KEY ("changedByUserId") REFERENCES "AppUser"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "FamilyPermission" ADD CONSTRAINT "FamilyPermission_tutorUserId_fkey" FOREIGN KEY ("tutorUserId") REFERENCES "AppUser"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "FamilyPermission" ADD CONSTRAINT "FamilyPermission_dependentPatientId_fkey" FOREIGN KEY ("dependentPatientId") REFERENCES "Patient"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "FamilyPermission" ADD CONSTRAINT "FamilyPermission_grantedByUserId_fkey" FOREIGN KEY ("grantedByUserId") REFERENCES "AppUser"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "DocumentVersion" ADD CONSTRAINT "DocumentVersion_documentId_fkey" FOREIGN KEY ("documentId") REFERENCES "Document"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "DocumentVersion" ADD CONSTRAINT "DocumentVersion_createdByUserId_fkey" FOREIGN KEY ("createdByUserId") REFERENCES "AppUser"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "DocumentAccessAudit" ADD CONSTRAINT "DocumentAccessAudit_documentId_fkey" FOREIGN KEY ("documentId") REFERENCES "Document"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "DocumentAccessAudit" ADD CONSTRAINT "DocumentAccessAudit_documentVersionId_fkey" FOREIGN KEY ("documentVersionId") REFERENCES "DocumentVersion"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "DocumentAccessAudit" ADD CONSTRAINT "DocumentAccessAudit_patientId_fkey" FOREIGN KEY ("patientId") REFERENCES "Patient"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "DocumentAccessAudit" ADD CONSTRAINT "DocumentAccessAudit_accessedByUserId_fkey" FOREIGN KEY ("accessedByUserId") REFERENCES "AppUser"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "WebhookEvent" ADD CONSTRAINT "WebhookEvent_integrationAttemptId_fkey" FOREIGN KEY ("integrationAttemptId") REFERENCES "IntegrationAttempt"("id") ON DELETE SET NULL ON UPDATE CASCADE;
