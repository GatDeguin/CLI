import test from 'node:test';
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { IdentityService } from './identity.service';

const makeIntegrationService = () => {
  const recoveries: Array<Record<string, any>> = [];
  const auditRows: Array<Record<string, any>> = [];

  const prisma: Record<string, any> = {
    appUser: {
      create: async ({ data }: { data: { dni: string; email: string; fullName: string } }) => ({ id: 'usr-99', role: 'USER', ...data }),
      findUnique: async ({ where: { dni } }: { where: { dni: string } }) => ({ id: 'usr-99', dni, role: 'USER', email: 'integration@demo.local' })
    },
    otpChallenge: {
      findFirst: async () => null,
      count: async () => 0,
      create: async ({ data }: { data: Record<string, any> }) => ({ id: `otp-${Date.now()}`, createdAt: new Date(), consumedAt: null, ...data }),
      update: async () => ({})
    },
    accessRecovery: {
      create: async ({ data }: { data: { userId: string; token: string; expiresAt: Date } }) => {
        const row = { id: 'recovery-1', consumedAt: null, ...data };
        recoveries.push(row);
        return row;
      },
      findUnique: async ({ where: { token } }: { where: { token: string } }) => recoveries.find((item) => item.token === token) ?? null,
      update: async ({ where: { id }, data }: { where: { id: string }; data: { consumedAt: Date } }) => {
        const row = recoveries.find((item) => item.id === id)!;
        row.consumedAt = data.consumedAt;
        return row;
      }
    },
    authCredential: {
      upsert: async () => ({})
    },
    auditLog: {
      create: async ({ data }: { data: Record<string, any> }) => {
        auditRows.push(data);
        return data;
      }
    },
    deviceSession: {
      create: async () => ({ id: 'session-1' }),
      findMany: async () => [],
      updateMany: async () => ({ count: 1 })
    }
  };

  const messaging = {
    sendOtp: () => undefined,
    sendEmail: () => undefined
  };

  const jwt = { sign: () => 'access-token' };

  return {
    service: new IdentityService({ prisma } as never, jwt as never, messaging as never),
    recoveries,
    auditRows
  };
};

test('flujo recovery/reset evita exponer token y deja auditoría mínima', async () => {
  const { service, recoveries, auditRows } = makeIntegrationService();

  const recoveryResponse = await service.requestRecovery({ dni: '30111222', deviceId: 'dev-int', ipAddress: '127.0.0.1' });
  assert.deepEqual(recoveryResponse, { accepted: true });

  const rawToken = 'integration-token';
  recoveries.push({
    id: 'recovery-2',
    userId: 'usr-99',
    token: createHash('sha256').update(rawToken).digest('hex'),
    expiresAt: new Date(Date.now() + 1_000),
    consumedAt: null
  });

  const resetResponse = await service.resetPassword({ token: rawToken, newPassword: 'ClaveNueva123' });
  assert.deepEqual(resetResponse, { success: true });

  assert.equal(auditRows.length >= 2, true);
  assert.equal('token' in (auditRows[0].payload ?? {}), false);
});
