-- Documents hardening: separated preview assets, explicit replacement versioning and signed URL revocation
ALTER TABLE "DocumentVersion"
  ADD COLUMN IF NOT EXISTS "previewUrl" TEXT,
  ADD COLUMN IF NOT EXISTS "thumbnailUrl" TEXT,
  ADD COLUMN IF NOT EXISTS "status" TEXT NOT NULL DEFAULT 'ACTIVE',
  ADD COLUMN IF NOT EXISTS "replacementNote" TEXT,
  ADD COLUMN IF NOT EXISTS "replacedByUserId" TEXT;

CREATE INDEX IF NOT EXISTS "DocumentVersion_documentId_status_idx"
  ON "DocumentVersion"("documentId", "status");

ALTER TABLE "DocumentVersion"
  ADD CONSTRAINT "DocumentVersion_replacedByUserId_fkey"
  FOREIGN KEY ("replacedByUserId") REFERENCES "AppUser"("id") ON DELETE SET NULL ON UPDATE CASCADE;

CREATE TABLE IF NOT EXISTS "DocumentSignedUrlToken" (
  "id" TEXT NOT NULL,
  "documentId" TEXT NOT NULL,
  "documentVersionId" TEXT NOT NULL,
  "patientId" TEXT NOT NULL,
  "requestedByUserId" TEXT NOT NULL,
  "action" TEXT NOT NULL,
  "token" TEXT NOT NULL,
  "signedUrl" TEXT NOT NULL,
  "expiresAt" TIMESTAMP(3) NOT NULL,
  "revokedAt" TIMESTAMP(3),
  "revokeReason" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "DocumentSignedUrlToken_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "DocumentSignedUrlToken_token_key"
  ON "DocumentSignedUrlToken"("token");
CREATE INDEX IF NOT EXISTS "DocumentSignedUrlToken_documentId_createdAt_idx"
  ON "DocumentSignedUrlToken"("documentId", "createdAt");
CREATE INDEX IF NOT EXISTS "DocumentSignedUrlToken_documentVersionId_createdAt_idx"
  ON "DocumentSignedUrlToken"("documentVersionId", "createdAt");
CREATE INDEX IF NOT EXISTS "DocumentSignedUrlToken_requestedByUserId_createdAt_idx"
  ON "DocumentSignedUrlToken"("requestedByUserId", "createdAt");
CREATE INDEX IF NOT EXISTS "DocumentSignedUrlToken_expiresAt_revokedAt_idx"
  ON "DocumentSignedUrlToken"("expiresAt", "revokedAt");

ALTER TABLE "DocumentSignedUrlToken"
  ADD CONSTRAINT "DocumentSignedUrlToken_documentId_fkey"
  FOREIGN KEY ("documentId") REFERENCES "Document"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "DocumentSignedUrlToken"
  ADD CONSTRAINT "DocumentSignedUrlToken_documentVersionId_fkey"
  FOREIGN KEY ("documentVersionId") REFERENCES "DocumentVersion"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "DocumentSignedUrlToken"
  ADD CONSTRAINT "DocumentSignedUrlToken_patientId_fkey"
  FOREIGN KEY ("patientId") REFERENCES "Patient"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "DocumentSignedUrlToken"
  ADD CONSTRAINT "DocumentSignedUrlToken_requestedByUserId_fkey"
  FOREIGN KEY ("requestedByUserId") REFERENCES "AppUser"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
