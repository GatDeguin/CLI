import test from 'node:test';
import assert from 'node:assert/strict';
import { AppointmentStatus, PaymentStatus } from '@prisma/client';
import { AuditTrailService } from '../observability/audit-trail.service';
import { BusinessEventsService } from '../observability/business-events.service';
import { CorrelationIdService } from '../observability/correlation-id.service';
import { SchedulingService } from './scheduling.service';

const makeService = () => {
  const slots = [{ id: 'slot-1', isAvailable: true, startsAt: new Date(Date.now() + 3600_000), endsAt: new Date(Date.now() + 7200_000), appointment: null }];
  const holds: Array<{ id: string; slotId: string; patientId: string; correlationId: string; expiresAt: Date; releasedAt: Date | null }> = [];

  const prisma: Record<string, any> = {
    slot: {
      findUnique: async ({ where: { id } }: { where: { id: string } }) => slots.find((slot) => slot.id === id) ?? null,
      findMany: async () => []
    },
    slotHold: {
      create: async ({ data }: { data: { slotId: string; patientId: string; correlationId: string; expiresAt: Date } }) => {
        const hold = { id: `hold-${holds.length + 1}`, releasedAt: null, ...data };
        holds.push(hold);
        return hold;
      },
      findUnique: async ({ where: { id } }: { where: { id: string } }) => holds.find((hold) => hold.id === id) ?? null,
      update: async ({ where: { id }, data }: { where: { id: string }; data: { releasedAt?: Date; releaseReason?: string } }) => {
        const hold = holds.find((item) => item.id === id)!;
        hold.releasedAt = data.releasedAt ?? hold.releasedAt;
        return hold;
      }
    },
    appointment: {
      create: async ({ data }: { data: { patientId: string; slotId: string; status: AppointmentStatus } }) => ({ id: 'apt-1', ...data })
    },
    payment: {
      create: async ({ data }: { data: { status: PaymentStatus } }) => ({ id: 'pay-1', ...data })
    },
    $transaction: async <T>(fn: (tx: Record<string, any>) => Promise<T>) => fn(prisma)
  };

  const redis = {
    acquire: async () => true,
    release: async () => undefined
  };

  return new SchedulingService(
    prisma as never,
    redis as never,
    new CorrelationIdService(),
    new AuditTrailService(),
    new BusinessEventsService()
  );
};

test('muestra copago para perfil COPAY', async () => {
  const service = makeService();
  const pricing = await service.evaluatePricing('slot-1', 'COPAY');

  assert.equal(pricing.showParticularPrice, false);
  assert.equal(pricing.copayAmount, 4500);
});

test('requiere aceptación económica para particulares', async () => {
  const service = makeService();
  const hold = await service.holdSlot({}, 'slot-1', 'pat-1');

  await assert.rejects(
    service.bookAppointment({}, {
      holdId: hold.holdId,
      patientId: 'pat-1',
      profile: 'PARTICULAR',
      acceptsEconomicPolicy: false
    }),
    /política económica/
  );
});
