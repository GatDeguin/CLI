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

  async createPreference(input: PaymentPreferenceInput, correlationId: string): Promise<{ preferenceId: string; initPoint: string }> {
    const preferenceId = createHash('sha256').update(`${input.externalReference}:${input.amount}`).digest('hex').slice(0, 24);

    this.logger.log({
      event: 'payment.preference.created',
      correlationId,
      provider: 'mercado-pago',
      preferenceId,
      externalReference: input.externalReference,
      payerEmail: input.payerEmail
    });

    return {
      preferenceId,
      initPoint: `https://www.mercadopago.com/checkout/v1/redirect?pref_id=${preferenceId}`
    };
  }

  validateSignature(webhookId: string, signature: string): boolean {
    const secret = process.env.MERCADO_PAGO_WEBHOOK_SECRET ?? '';
    const expected = createHash('sha256').update(`${webhookId}:${secret}`).digest('hex');
    return expected === signature;
  }

  toIdempotencyKey(payload: WebhookPayload): string {
    return `mp:${payload.id}:${payload.action}:${payload.data.id}`;
  }

  inferPaymentStatus(action: string): 'APPROVED' | 'DECLINED' | 'REFUNDED' | 'PENDING' {
    if (action.includes('approved')) {
      return 'APPROVED';
    }
    if (action.includes('rejected') || action.includes('cancelled')) {
      return 'DECLINED';
    }
    if (action.includes('refunded')) {
      return 'REFUNDED';
    }

    return 'PENDING';
  }
}
