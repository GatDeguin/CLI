import test from 'node:test';
import assert from 'node:assert/strict';
import { AuditTrailService } from '../observability/audit-trail.service';
import { BusinessEventsService } from '../observability/business-events.service';
import { CorrelationIdService } from '../observability/correlation-id.service';
import { SchedulingService } from './scheduling.service';

const makeService = () =>
  new SchedulingService(new CorrelationIdService(), new AuditTrailService(), new BusinessEventsService());

test('oculta precio particular en cobertura total', () => {
  const service = makeService();
  const pricing = service.evaluatePricing('slot-cardiologia-1', 'TOTAL_COVERAGE');

  assert.equal(pricing.showParticularPrice, false);
  assert.equal(pricing.copayAmount, undefined);
});

test('muestra copago para perfil COPAY', () => {
  const service = makeService();
  const pricing = service.evaluatePricing('slot-cardiologia-1', 'COPAY');

  assert.equal(pricing.showParticularPrice, false);
  assert.equal(pricing.copayAmount, 4500);
});

test('requiere aceptación económica para particulares', () => {
  const service = makeService();
  const hold = service.holdSlot({}, 'slot-cardiologia-1', 'pat-1');

  assert.throws(
    () =>
      service.bookAppointment({}, {
        holdId: hold.holdId,
        patientId: 'pat-1',
        profile: 'PARTICULAR',
        acceptsEconomicPolicy: false
      }),
    /política económica/
  );
});
