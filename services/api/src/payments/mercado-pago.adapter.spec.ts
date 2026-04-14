import test from 'node:test';
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { MercadoPagoAdapter } from './mercado-pago.adapter';

test('idempotency key del webhook es determinística', () => {
  const adapter = new MercadoPagoAdapter();
  const payload = { id: 'event-1', action: 'payment.updated', data: { id: 'pay-1' } };

  const keyA = adapter.toIdempotencyKey(payload);
  const keyB = adapter.toIdempotencyKey(payload);

  assert.equal(keyA, keyB);
});

test('valida firma webhook', () => {
  process.env.MERCADO_PAGO_WEBHOOK_SECRET = 'secret-test';
  const adapter = new MercadoPagoAdapter();
  const signature = createHash('sha256').update('event-1:secret-test').digest('hex');

  assert.equal(adapter.validateSignature('event-1', signature), true);
});
