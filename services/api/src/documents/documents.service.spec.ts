import assert from 'node:assert/strict';
import test from 'node:test';
import { ForbiddenException } from '@nestjs/common';
import { DocumentsService } from './documents.service';

const makeService = (opts?: { permission?: boolean; expiresAtMs?: number; revoked?: boolean }) => {
  const audits: Array<Record<string, unknown>> = [];
  const signedRows: Array<Record<string, unknown>> = [];

  const prisma = {
    document: {
      findUnique: async ({ where: { id } }: { where: { id: string } }) => (id === 'doc-1' ? { id: 'doc-1', patientId: 'patient-1', url: 's3://original.pdf' } : null),
      findMany: async () => []
    },
    documentVersion: {
      findFirst: async () => ({
        id: 'ver-1',
        documentId: 'doc-1',
        storageUrl: 's3://storage/original.pdf',
        previewUrl: 's3://storage/preview.jpg',
        thumbnailUrl: 's3://storage/thumb.jpg',
        status: 'ACTIVE',
        validTo: null,
        versionNumber: 1
      })
    },
    patient: {
      findUnique: async () => ({ userId: 'owner-user' })
    },
    familyPermission: {
      findFirst: async () => (opts?.permission ? { id: 'perm-1' } : null)
    },
    documentSignedUrlToken: {
      create: async ({ data }: { data: Record<string, unknown> }) => {
        const row = { id: `signed-${signedRows.length + 1}`, ...data };
        signedRows.push(row);
        return row;
      },
      findUnique: async ({ where: { token } }: { where: { token: string } }) => {
        if (token === 'expired') return { token, revokedAt: null, expiresAt: new Date(opts?.expiresAtMs ?? Date.now() - 1_000) };
        if (token === 'revoked') return { token, revokedAt: opts?.revoked ? new Date() : null, expiresAt: new Date(Date.now() + 60_000) };
        return signedRows.find((row) => row.token === token) ?? null;
      },
      update: async ({ where: { token }, data }: { where: { token: string }; data: Record<string, unknown> }) => ({ token, ...data })
    },
    documentAccessAudit: {
      create: async ({ data }: { data: Record<string, unknown> }) => {
        audits.push(data);
        return data;
      }
    }
  };

  const service = new DocumentsService({ prisma } as never);
  return { service, audits };
};

test('deniega acceso a dependencia familiar sin permiso DOCUMENTS', async () => {
  const { service } = makeService({ permission: false });

  await assert.rejects(
    service.generateSignedUrl('doc-1', { action: 'VIEW' }, { activePatientId: 'patient-1', userId: 'tutor-user' }),
    ForbiddenException
  );
});

test('genera URL firmada corta y audita visualización para perfil autorizado', async () => {
  const { service, audits } = makeService({ permission: true });

  const signed = await service.generateSignedUrl('doc-1', { action: 'DOWNLOAD', ttlSeconds: 120, asset: 'PREVIEW' }, { activePatientId: 'patient-1', userId: 'tutor-user' });

  assert.match(signed.signedUrl, /preview\.jpg\?token=/);
  assert.equal(audits.length, 1);
  assert.equal(audits[0]?.action, 'DOWNLOAD');
});

test('rechaza URL firmada expirada', async () => {
  const { service } = makeService({ expiresAtMs: Date.now() - 5_000 });
  await assert.rejects(service.validateSignedUrl('expired'), ForbiddenException);
});
