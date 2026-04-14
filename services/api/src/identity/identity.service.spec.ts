import test from 'node:test';
import assert from 'node:assert/strict';
import { HttpException, UnauthorizedException } from '@nestjs/common';
import { createHash } from 'node:crypto';
import { IdentityService } from './identity.service';

type OtpRecord = {
  id: string;
  dni: string;
  purpose: string;
  otpCode: string;
  deviceId?: string;
  expiresAt: Date;
  consumedAt: Date | null;
  createdAt: Date;
};

type RecoveryRecord = { id: string; token: string; userId: string; expiresAt: Date; consumedAt: Date | null };

const matchWhere = (row: Record<string, any>, where: Record<string, any>): boolean => {
  return Object.entries(where).every(([key, value]) => {
    if (key === 'OR') return (value as Array<Record<string, any>>).some((clause) => matchWhere(row, clause));
    if (typeof value === 'object' && value) {
      if ('gte' in value) return row[key] >= value.gte;
      if ('gt' in value) return row[key] > value.gt;
      if ('startsWith' in value) return typeof row[key] === 'string' && row[key].startsWith(value.startsWith);
    }
    return row[key] === value;
  });
};

const makeIdentity = () => {
  const otpRows: OtpRecord[] = [];
  const recoveries: RecoveryRecord[] = [];
  const audits: Array<Record<string, any>> = [];

  const prisma = {
    appUser: {
      create: async ({ data }: { data: { dni: string; email: string; fullName: string } }) => ({ id: 'usr-1', role: 'USER', ...data }),
      findUnique: async ({ where: { dni } }: { where: { dni: string } }) => (dni === '30111222' ? { id: 'usr-1', dni, role: 'USER', email: 'user@demo.local' } : null)
    },
    otpChallenge: {
      create: async ({ data }: { data: Omit<OtpRecord, 'id' | 'createdAt' | 'consumedAt'> & { consumedAt?: Date | null } }) => {
        const row: OtpRecord = {
          id: `otp-${otpRows.length + 1}`,
          createdAt: new Date(),
          consumedAt: data.consumedAt ?? null,
          ...data
        };
        otpRows.push(row);
        return row;
      },
      findFirst: async ({ where, orderBy }: { where: Record<string, any>; orderBy?: { createdAt: 'desc' } }) => {
        const rows = otpRows.filter((row) => matchWhere(row as never, where as never));
        if (orderBy?.createdAt === 'desc') rows.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
        return rows[0] ?? null;
      },
      update: async ({ where: { id }, data }: { where: { id: string }; data: { consumedAt: Date } }) => {
        const found = otpRows.find((row) => row.id === id)!;
        found.consumedAt = data.consumedAt;
        return found;
      },
      count: async ({ where }: { where: Record<string, any> }) => otpRows.filter((row) => matchWhere(row as never, where as never)).length
    },
    deviceSession: {
      create: async () => ({ id: 'session-1' }),
      findMany: async () => [],
      updateMany: async () => ({ count: 1 })
    },
    accessRecovery: {
      create: async ({ data }: { data: { token: string; userId: string; expiresAt: Date } }) => {
        recoveries.push({ id: `recovery-${recoveries.length + 1}`, consumedAt: null, ...data });
        return recoveries.at(-1)!;
      },
      findUnique: async ({ where: { token } }: { where: { token: string } }) => recoveries.find((item) => item.token === token) ?? null,
      update: async ({ where: { id }, data }: { where: { id: string }; data: { consumedAt: Date } }) => {
        const recovery = recoveries.find((item) => item.id === id)!;
        recovery.consumedAt = data.consumedAt;
        return recovery;
      }
    },
    authCredential: {
      upsert: async () => ({}),
      findUnique: async () => null,
      update: async () => ({})
    },
    auditLog: {
      create: async ({ data }: { data: Record<string, any> }) => {
        audits.push(data);
        return data;
      }
    }
  };

  const messaging = {
    otpCalls: 0,
    emailCalls: 0,
    sendOtp: () => {
      messaging.otpCalls += 1;
    },
    sendEmail: () => {
      messaging.emailCalls += 1;
    }
  };

  const jwt = { sign: () => 'access-token' };

  const service = new IdentityService({ prisma } as never, jwt as never, messaging as never);
  return { service, otpRows, recoveries, messaging, audits };
};

test('requestOtp no retorna otpCode y es idempotente para challenge activo', async () => {
  const { service, messaging } = makeIdentity();

  const first = await service.requestOtp({ dni: '30111222', deviceId: 'dev-1', ipAddress: '10.0.0.1' });
  const second = await service.requestOtp({ dni: '30111222', deviceId: 'dev-1', ipAddress: '10.0.0.1' });

  assert.equal('otpCode' in first, false);
  assert.equal(first.challengeId, second.challengeId);
  assert.equal(messaging.otpCalls, 1);
});

test('aplica lockout temporal por abuso de intentos fallidos', async () => {
  const { service } = makeIdentity();

  for (let i = 0; i < 5; i += 1) {
    await assert.rejects(
      service.login({ dni: '30111222', otpCode: '000000', deviceId: 'dev-2', ipAddress: '10.0.0.2' }),
      UnauthorizedException
    );
  }

  await assert.rejects(
    service.login({ dni: '30111222', otpCode: '000000', deviceId: 'dev-2', ipAddress: '10.0.0.2' }),
    (error: unknown) => error instanceof HttpException && error.getStatus() === 429
  );
});

test('resetPassword rechaza token expirado', async () => {
  const { service, recoveries } = makeIdentity();

  recoveries.push({
    id: 'recovery-expired',
    userId: 'usr-1',
    token: createHash('sha256').update('expired-token').digest('hex'),
    expiresAt: new Date(Date.now() - 1_000),
    consumedAt: null
  });

  await assert.rejects(
    service.resetPassword({ token: 'expired-token', newPassword: 'NuevaClave123' }),
    UnauthorizedException
  );
});
