import test from 'node:test';
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { MercadoPagoAdapter } from './mercado-pago.adapter';

test('webhook duplicado se trata de forma idempotente', () => {
  process.env.MERCADO_PAGO_WEBHOOK_SECRET = 'secret-test';
  const adapter = new MercadoPagoAdapter();
  const payload = { id: 'event-1', action: 'payment.updated', data: { id: 'pay-1' } };
  const signature = createHash('sha256').update(`event-1:secret-test`).digest('hex');

  const first = adapter.handleWebhook(payload, signature, 'corr-1');
  const second = adapter.handleWebhook(payload, signature, 'corr-1');

  assert.equal(first.accepted, true);
  assert.equal(second.accepted, true);
  assert.equal(second.reason, 'duplicate-ignored');
});
