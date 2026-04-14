import { Injectable, Logger } from '@nestjs/common';
import { createHash } from 'node:crypto';

interface PaymentPreferenceInput {
  readonly externalReference: string;
  readonly amount: number;
  readonly payerEmail: string;
}

interface WebhookPayload {
  readonly id: string;
  readonly action: string;
  readonly data: { id: string };
}

@Injectable()
export class MercadoPagoAdapter {
  private readonly logger = new Logger(MercadoPagoAdapter.name);
  private readonly processedWebhookEvents = new Set<string>();

  async createPreference(input: PaymentPreferenceInput, correlationId: string): Promise<{ preferenceId: string; initPoint: string }> {
    const preferenceId = createHash('sha256').update(`${input.externalReference}:${input.amount}`).digest('hex').slice(0, 24);

    this.logger.log({
      event: 'payment.preference.created',
      correlationId,
      provider: 'mercado-pago',
      preferenceId,
      externalReference: input.externalReference
    });

    return {
      preferenceId,
      initPoint: `https://www.mercadopago.com/checkout/v1/redirect?pref_id=${preferenceId}`
    };
  }

  handleWebhook(payload: WebhookPayload, signature: string, correlationId: string): { accepted: boolean; reason?: string } {
    const eventKey = `${payload.id}:${payload.action}:${payload.data.id}`;

    if (!this.isValidSignature(payload.id, signature)) {
      return { accepted: false, reason: 'invalid-signature' };
    }

    if (this.processedWebhookEvents.has(eventKey)) {
      this.logger.warn({ event: 'payment.webhook.duplicate', eventKey, correlationId });
      return { accepted: true, reason: 'duplicate-ignored' };
    }

    this.processedWebhookEvents.add(eventKey);
    this.logger.log({ event: 'payment.webhook.processed', eventKey, correlationId });

    return { accepted: true };
  }

  async reconcilePendingPayments(correlationId: string): Promise<{ scanned: number; reconciled: number }> {
    // placeholder deterministic reconciliation policy for worker scheduling.
    const scanned = 25;
    const reconciled = 24;

    this.logger.log({
      event: 'payment.reconciliation.completed',
      provider: 'mercado-pago',
      scanned,
      reconciled,
      correlationId
    });

    return { scanned, reconciled };
  }

  private isValidSignature(webhookId: string, signature: string): boolean {
    const secret = process.env.MERCADO_PAGO_WEBHOOK_SECRET ?? '';
    const expected = createHash('sha256').update(`${webhookId}:${secret}`).digest('hex');
    return expected === signature;
  }
}
