import { AppointmentStatus, PaymentStatus, Prisma } from '@prisma/client';
import { Injectable } from '@nestjs/common';
import { PrismaService } from '../common/prisma/prisma.service';
import { AuditTrailService } from '../observability/audit-trail.service';
import { BusinessEventsService } from '../observability/business-events.service';
import { CorrelationIdService } from '../observability/correlation-id.service';
import { MercadoPagoAdapter } from './mercado-pago.adapter';

@Injectable()
export class PaymentsService {
  constructor(
    private readonly prisma: PrismaService,
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

    await this.prisma.payment.updateMany({
      where: { externalReference: input.externalReference },
      data: { providerPaymentId: preference.preferenceId }
    });

    this.businessEventsService.emit({
      name: 'payment.preference.created',
      correlationId,
      occurredAt: new Date().toISOString(),
      payload: preference
    });

    return preference;
  }

  async processWebhook(
    headers: Record<string, string | undefined>,
    payload: { id: string; action: string; data: { id: string } },
    signature: string
  ): Promise<{ accepted: boolean; reason?: string }> {
    const correlationId = this.correlationIdService.getOrCreate(headers);
    const idempotencyKey = this.mercadoPagoAdapter.toIdempotencyKey(payload);

    if (!this.mercadoPagoAdapter.validateSignature(payload.id, signature)) {
      await this.prisma.paymentEvent.create({
        data: {
          idempotencyKey,
          provider: 'mercado-pago',
          providerEventId: payload.id,
          action: payload.action,
          correlationId,
          rawPayload: payload,
          accepted: false,
          reason: 'invalid-signature'
        }
      });
      return { accepted: false, reason: 'invalid-signature' };
    }

    try {
      const paymentStatus = this.mercadoPagoAdapter.inferPaymentStatus(payload.action);

      const payment = await this.prisma.payment.findFirst({ where: { providerPaymentId: payload.data.id } });
      const updatedPayment = payment
        ? await this.prisma.payment.update({
            where: { id: payment.id },
            data: { status: paymentStatus as PaymentStatus }
          })
        : null;

      if (updatedPayment?.appointmentId) {
        await this.prisma.appointment.update({
          where: { id: updatedPayment.appointmentId },
          data: {
            status:
              paymentStatus === 'APPROVED'
                ? AppointmentStatus.CONFIRMED
                : paymentStatus === 'DECLINED' || paymentStatus === 'REFUNDED'
                  ? AppointmentStatus.CANCELLED
                  : AppointmentStatus.REQUESTED,
            reason:
              paymentStatus === 'DECLINED' || paymentStatus === 'REFUNDED'
                ? 'Cancelado automáticamente por BR-13 ante pago no acreditado.'
                : null
          }
        });
      }

      await this.prisma.paymentEvent.create({
        data: {
          idempotencyKey,
          provider: 'mercado-pago',
          providerEventId: payload.id,
          action: payload.action,
          paymentId: updatedPayment?.id,
          correlationId,
          rawPayload: payload,
          accepted: true,
          reason: updatedPayment ? undefined : 'payment-not-found'
        }
      });

      this.auditTrailService.record({
        actorId: 'mercado-pago-webhook',
        action: 'webhook-processed',
        resource: 'payment-notification',
        resourceId: payload.id,
        correlationId,
        metadata: {
          action: payload.action,
          paymentId: payload.data.id,
          idempotencyKey,
          paymentStatus,
          matchedPayment: Boolean(updatedPayment)
        }
      });

      return { accepted: true, reason: updatedPayment ? undefined : 'payment-not-found' };
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
        return { accepted: true, reason: 'duplicate-ignored' };
      }

      throw error;
    }
  }
}
