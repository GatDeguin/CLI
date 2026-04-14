import { Injectable } from '@nestjs/common';
import { AuditTrailService } from '../observability/audit-trail.service';
import { BusinessEventsService } from '../observability/business-events.service';
import { CorrelationIdService } from '../observability/correlation-id.service';
import { MercadoPagoAdapter } from './mercado-pago.adapter';

@Injectable()
export class PaymentsService {
  constructor(
    private readonly mercadoPagoAdapter: MercadoPagoAdapter,
    private readonly correlationIdService: CorrelationIdService,
    private readonly auditTrailService: AuditTrailService,
    private readonly businessEventsService: BusinessEventsService
  ) {}

  async createCheckoutPreference(
    headers: Record<string, string | undefined>,
    input: { externalReference: string; amount: number; payerEmail: string }
  ): Promise<{ preferenceId: string; initPoint: string }> {
    const correlationId = this.correlationIdService.getOrCreate(headers);
    const preference = await this.mercadoPagoAdapter.createPreference(input, correlationId);

    this.businessEventsService.emit({
      name: 'payment.preference.created',
      correlationId,
      occurredAt: new Date().toISOString(),
      payload: preference
    });

    return preference;
  }

  processWebhook(
    headers: Record<string, string | undefined>,
    payload: { id: string; action: string; data: { id: string } },
    signature: string
  ): { accepted: boolean; reason?: string } {
    const correlationId = this.correlationIdService.getOrCreate(headers);
    const result = this.mercadoPagoAdapter.handleWebhook(payload, signature, correlationId);

    if (result.accepted) {
      this.auditTrailService.record({
        actorId: 'mercado-pago-webhook',
        action: 'webhook-processed',
        resource: 'payment-notification',
        resourceId: payload.id,
        correlationId,
        metadata: { action: payload.action, paymentId: payload.data.id, reason: result.reason }
      });
    }

    return result;
  }
}
