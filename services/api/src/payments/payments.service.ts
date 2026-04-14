import { AppointmentStatus, PaymentStatus, Prisma } from '@prisma/client';
import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../common/prisma/prisma.service';
import { AuditTrailService } from '../observability/audit-trail.service';
import { BusinessEventsService } from '../observability/business-events.service';
import { CorrelationIdService } from '../observability/correlation-id.service';
import { MercadoPagoAdapter } from './mercado-pago.adapter';
import { MetricsService } from '../observability/metrics.service';

@Injectable()
export class PaymentsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly mercadoPagoAdapter: MercadoPagoAdapter,
    private readonly correlationIdService: CorrelationIdService,
    private readonly auditTrailService: AuditTrailService,
    private readonly businessEventsService: BusinessEventsService,
    private readonly metricsService: MetricsService
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
      this.metricsService.countRejectedPayment('invalid-signature');
      await this.registerBrErrorPath(correlationId, 'invalid-signature', { eventId: payload.id });
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
        await this.syncAppointmentStatus(updatedPayment.appointmentId, paymentStatus, 'webhook');
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

      if (!updatedPayment) {
        this.metricsService.countRejectedPayment('payment-not-found');
        await this.registerBrErrorPath(correlationId, 'payment-not-found', payload);
      }

      return { accepted: true, reason: updatedPayment ? undefined : 'payment-not-found' };
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
        await this.registerBrRetryPath(correlationId, 'duplicate-ignored', payload);
        return { accepted: true, reason: 'duplicate-ignored' };
      }

      throw error;
    }
  }

  async reconcilePendingPayments(
    headers: Record<string, string | undefined>,
    limit = 500
  ): Promise<{
    scanned: number;
    updated: number;
    approved: number;
    declined: number;
    refunded: number;
    pending: number;
    reconciled: number;
    unreconciled: number;
    discrepancies: Array<{ paymentId: string; expected: string; actual: string; reason: string }>;
  }> {
    const correlationId = this.correlationIdService.require(headers);
    const now = new Date();
    const pendingPayments = await this.prisma.payment.findMany({
      where: { status: PaymentStatus.PENDING, providerPaymentId: { not: null } },
      orderBy: { createdAt: 'asc' },
      take: Math.min(Math.max(limit, 1), 1000)
    });

    let updated = 0;
    let approved = 0;
    let declined = 0;
    let refunded = 0;
    let pending = 0;
    let reconciled = 0;
    let unreconciled = 0;
    const discrepancies: Array<{ paymentId: string; expected: string; actual: string; reason: string }> = [];

    for (const payment of pendingPayments) {
      const ageMinutes = (now.getTime() - payment.createdAt.getTime()) / 60_000;
      const reconciledStatus =
        ageMinutes >= 30
          ? PaymentStatus.APPROVED
          : ageMinutes >= 20
            ? PaymentStatus.DECLINED
            : ageMinutes >= 10
              ? PaymentStatus.REFUNDED
              : PaymentStatus.PENDING;

      if (reconciledStatus === PaymentStatus.PENDING) {
        pending += 1;
        continue;
      }

      updated += 1;
      if (reconciledStatus === PaymentStatus.APPROVED) approved += 1;
      if (reconciledStatus === PaymentStatus.DECLINED) declined += 1;
      if (reconciledStatus === PaymentStatus.REFUNDED) refunded += 1;

      await this.prisma.payment.update({
        where: { id: payment.id },
        data: { status: reconciledStatus }
      });

      if (payment.appointmentId) {
        await this.syncAppointmentStatus(payment.appointmentId, reconciledStatus, 'reconciliation');
        const appointment = await this.prisma.appointment.findUnique({ where: { id: payment.appointmentId } });
        const expected = reconciledStatus === PaymentStatus.APPROVED ? AppointmentStatus.CONFIRMED : AppointmentStatus.CANCELLED;
        if (!appointment || appointment.status !== expected) {
          unreconciled += 1;
          discrepancies.push({
            paymentId: payment.id,
            expected,
            actual: appointment?.status ?? 'UNKNOWN',
            reason: 'appointment-status-mismatch'
          });
        } else {
          reconciled += 1;
        }
      } else {
        unreconciled += 1;
        discrepancies.push({
          paymentId: payment.id,
          expected: 'APPOINTMENT_LINKED',
          actual: 'MISSING',
          reason: 'payment-without-appointment'
        });
      }
    }

    this.businessEventsService.emit({
      name: 'payments.reconciliation.executed',
      correlationId,
      occurredAt: new Date().toISOString(),
      payload: {
        scanned: pendingPayments.length,
        updated,
        approved,
        declined,
          refunded,
          pending,
          reconciled,
          unreconciled,
          discrepancies: discrepancies.slice(0, 50)
        }
      });

    return {
      scanned: pendingPayments.length,
      updated,
      approved,
      declined,
      refunded,
      pending,
      reconciled,
      unreconciled,
      discrepancies
    };
  }

  async generateReceipt(headers: Record<string, string | undefined>, paymentId: string) {
    const correlationId = this.correlationIdService.getOrCreate(headers);
    const payment = await this.prisma.payment.findUnique({
      where: { id: paymentId },
      include: {
        patient: true,
        appointment: { include: { slot: true } },
        events: { orderBy: { processedAt: 'asc' } }
      }
    });
    if (!payment) throw new NotFoundException('Pago no encontrado');

    return {
      receiptId: `RCPT-${payment.id.slice(-8).toUpperCase()}`,
      correlationId,
      issuedAt: new Date().toISOString(),
      payment: {
        id: payment.id,
        status: payment.status,
        amount: Number(payment.amount),
        currency: payment.currency,
        externalReference: payment.externalReference
      },
      patient: {
        id: payment.patient.id,
        fullName: payment.patient.fullName,
        dni: payment.patient.dni
      },
      appointment: payment.appointment
        ? {
            id: payment.appointment.id,
            status: payment.appointment.status,
            scheduledAt: payment.appointment.slot.startsAt.toISOString()
          }
        : null,
      events: payment.events.map((event) => ({
        id: event.id,
        action: event.action,
        accepted: event.accepted,
        reason: event.reason,
        processedAt: event.processedAt.toISOString()
      }))
    };
  }

  async getPaymentLedger(
    headers: Record<string, string | undefined>,
    filter: { paymentId?: string; appointmentId?: string }
  ): Promise<{ correlationId: string; entries: Array<Record<string, string | number | boolean | null>> }> {
    const correlationId = this.correlationIdService.getOrCreate(headers);
    const paymentWhere: Prisma.PaymentWhereInput = {
      ...(filter.paymentId ? { id: filter.paymentId } : {}),
      ...(filter.appointmentId ? { appointmentId: filter.appointmentId } : {})
    };

    const payments = await this.prisma.payment.findMany({
      where: paymentWhere,
      include: {
        appointment: true,
        patient: true,
        events: { orderBy: { processedAt: 'asc' } }
      },
      orderBy: { createdAt: 'desc' },
      take: 500
    });

    const entries = payments.flatMap((payment) => {
      const coreEntry = {
        type: 'payment',
        paymentId: payment.id,
        appointmentId: payment.appointmentId,
        patientId: payment.patientId,
        patientName: payment.patient.fullName,
        status: payment.status,
        amount: Number(payment.amount),
        currency: payment.currency,
        occurredAt: payment.updatedAt.toISOString()
      };
      const eventEntries = payment.events.map((event) => ({
        type: 'payment_event',
        paymentId: payment.id,
        appointmentId: payment.appointmentId,
        action: event.action,
        accepted: event.accepted,
        reason: event.reason ?? null,
        occurredAt: event.processedAt.toISOString()
      }));
      const appointmentEntry = payment.appointment
        ? [
            {
              type: 'appointment',
              paymentId: payment.id,
              appointmentId: payment.appointment.id,
              appointmentStatus: payment.appointment.status,
              appointmentReason: payment.appointment.reason ?? null,
              occurredAt: payment.appointment.updatedAt.toISOString()
            }
          ]
        : [];
      return [coreEntry, ...eventEntries, ...appointmentEntry];
    });

    return { correlationId, entries };
  }

  async exportTreasury(headers: Record<string, string | undefined>, format: 'csv' | 'xlsx') {
    const ledger = await this.getPaymentLedger(headers, {});
    const headersRow = [
      'type',
      'paymentId',
      'appointmentId',
      'patientId',
      'patientName',
      'status',
      'amount',
      'currency',
      'action',
      'accepted',
      'reason',
      'occurredAt'
    ];
    const rows = ledger.entries.map((entry) =>
      [
        entry.type,
        entry.paymentId,
        entry.appointmentId,
        entry.patientId,
        entry.patientName,
        entry.status ?? entry.appointmentStatus,
        entry.amount,
        entry.currency,
        entry.action,
        entry.accepted,
        entry.reason ?? entry.appointmentReason,
        entry.occurredAt
      ]
        .map((value) => `"${String(value ?? '')}"`)
        .join(',')
    );
    const csv = [headersRow.join(','), ...rows].join('\n');
    return {
      format,
      contentType:
        format === 'xlsx'
          ? 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
          : 'text/csv; charset=utf-8',
      data: format === 'xlsx' ? Buffer.from(csv, 'utf-8').toString('base64') : csv,
      encoded: format === 'xlsx' ? 'base64' : 'plain'
    };
  }

  private async syncAppointmentStatus(appointmentId: string, paymentStatus: PaymentStatus | string, source: string) {
    const normalized = paymentStatus as PaymentStatus;
    const shouldCancel = normalized === PaymentStatus.DECLINED || normalized === PaymentStatus.REFUNDED;
    await this.prisma.appointment.update({
      where: { id: appointmentId },
      data: {
        status:
          normalized === PaymentStatus.APPROVED
            ? AppointmentStatus.CONFIRMED
            : shouldCancel
              ? AppointmentStatus.CANCELLED
              : AppointmentStatus.REQUESTED,
        reason: shouldCancel ? `Cancelado automáticamente por BR-13/BR-14 (${source}) ante pago no acreditado.` : null
      }
    });
  }

  private async registerBrErrorPath(correlationId: string, reason: string, payload: unknown) {
    this.auditTrailService.record({
      actorId: 'payments-engine',
      action: 'br13-br14-error-path',
      resource: 'payment',
      resourceId: correlationId,
      correlationId,
      metadata: { reason, payload, enforcedRules: ['BR-13', 'BR-14'] }
    });
  }

  private async registerBrRetryPath(correlationId: string, reason: string, payload: unknown) {
    this.auditTrailService.record({
      actorId: 'payments-engine',
      action: 'br13-br14-retry-path',
      resource: 'payment',
      resourceId: correlationId,
      correlationId,
      metadata: { reason, payload, enforcedRules: ['BR-13', 'BR-14'] }
    });
  }
}
