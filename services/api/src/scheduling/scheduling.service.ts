import { AppointmentStatus, PaymentStatus, Prisma } from '@prisma/client';
import { BadRequestException, Injectable, NotFoundException, ServiceUnavailableException } from '@nestjs/common';
import { PrismaService } from '../common/prisma/prisma.service';
import { RedisLockService } from '../common/redis/redis-lock.service';
import { AuditTrailService } from '../observability/audit-trail.service';
import { BusinessEventsService } from '../observability/business-events.service';
import { CorrelationIdService } from '../observability/correlation-id.service';
import { BookingRequest, CoverageProfile, PricingDecision, Slot, SlotHold } from './scheduling.types';

const HOLD_MINUTES = Number(process.env.SLOT_HOLD_MINUTES ?? '10');

@Injectable()
export class SchedulingService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly redisLockService: RedisLockService,
    private readonly correlationIdService: CorrelationIdService,
    private readonly auditTrailService: AuditTrailService,
    private readonly businessEventsService: BusinessEventsService
  ) {}

  async listAvailableSlots(): Promise<Slot[]> {
    const now = new Date();
    const slots = await this.prisma.slot.findMany({
      where: {
        isAvailable: true,
        startsAt: { gte: now },
        appointment: null,
        holds: { none: { releasedAt: null, expiresAt: { gt: now } } }
      },
      include: {
        agenda: { include: { professional: true, site: true } }
      },
      orderBy: { startsAt: 'asc' }
    });

    return slots.map((slot) => ({
      id: slot.id,
      professionalId: slot.agenda.professionalId,
      siteId: slot.agenda.siteId,
      specialtyCode: slot.agenda.professional.fullName,
      startsAt: slot.startsAt.toISOString(),
      endsAt: slot.endsAt.toISOString(),
      requiresPreparation: false,
      onlineBlocked: false,
      particularPrice: 25000,
      copayAmount: 4500
    }));
  }

  async holdSlot(headers: Record<string, string | undefined>, slotId: string, patientId: string): Promise<SlotHold> {
    const slot = await this.prisma.slot.findUnique({ where: { id: slotId }, include: { appointment: true } });

    if (!slot) {
      throw new NotFoundException('Slot no encontrado.');
    }

    if (slot.appointment) {
      throw new BadRequestException('El slot ya fue reservado.');
    }

    const correlationId = this.correlationIdService.getOrCreate(headers);
    const lockOwner = `${patientId}:${correlationId}`;
    const lockKey = `lock:slot:${slotId}`;

    const locked = await this.redisLockService.acquire(lockKey, lockOwner, 20_000);
    if (!locked) {
      throw new ServiceUnavailableException('No se pudo adquirir lock de slot. Reintente.');
    }

    try {
      const expiresAt = new Date(Date.now() + HOLD_MINUTES * 60_000);
      const hold = await this.prisma.slotHold.create({
        data: {
          idempotencyKey: `hold:${slotId}:${patientId}:${Math.floor(Date.now() / (60_000 * HOLD_MINUTES))}`,
          slotId,
          patientId,
          correlationId,
          expiresAt
        }
      });

      this.businessEventsService.emit({
        name: 'slot.retenido',
        correlationId,
        occurredAt: new Date().toISOString(),
        payload: { slotId, patientId, expiresAt: hold.expiresAt.toISOString() }
      });

      return {
        holdId: hold.id,
        slotId: hold.slotId,
        patientId: hold.patientId,
        expiresAt: hold.expiresAt.toISOString(),
        correlationId: hold.correlationId
      };
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
        throw new BadRequestException('El slot ya se encuentra retenido temporalmente.');
      }

      throw error;
    } finally {
      await this.redisLockService.release(lockKey, lockOwner);
    }
  }

  async evaluatePricing(slotId: string, profile: CoverageProfile): Promise<PricingDecision> {
    const slot = await this.prisma.slot.findUnique({ where: { id: slotId } });
    if (!slot) {
      throw new NotFoundException('Slot no encontrado.');
    }

    if (profile === 'PARTICULAR') {
      return {
        showParticularPrice: true,
        reason: 'Precio particular: ARS 25.000'
      };
    }

    if (profile === 'COPAY') {
      return {
        showParticularPrice: false,
        copayAmount: 4500,
        reason: 'Copago vigente: ARS 4.500'
      };
    }

    if (profile === 'PENDING_COVERAGE') {
      return {
        showParticularPrice: false,
        reason: 'Cobertura pendiente de validación administrativa.'
      };
    }

    return {
      showParticularPrice: false,
      reason: 'Prestación cubierta por convenio vigente.'
    };
  }


  async releaseExpiredHolds(limit = 100): Promise<{ released: number }> {
    const now = new Date();
    const expired = await this.prisma.slotHold.findMany({
      where: { releasedAt: null, expiresAt: { lte: now } },
      take: limit,
      orderBy: { expiresAt: 'asc' }
    });

    if (expired.length === 0) {
      return { released: 0 };
    }

    await this.prisma.slotHold.updateMany({
      where: { id: { in: expired.map((item) => item.id) } },
      data: { releasedAt: now, releaseReason: 'expired-worker' }
    });

    return { released: expired.length };
  }

  async bookAppointment(headers: Record<string, string | undefined>, input: BookingRequest): Promise<{ bookingId: string; status: string }> {
    const hold = await this.prisma.slotHold.findUnique({ where: { id: input.holdId } });
    if (!hold || hold.releasedAt) {
      throw new NotFoundException('Retención no encontrada.');
    }

    if (hold.patientId !== input.patientId) {
      throw new BadRequestException('El paciente no coincide con la retención.');
    }

    if (hold.expiresAt.getTime() <= Date.now()) {
      await this.prisma.slotHold.update({
        where: { id: hold.id },
        data: { releasedAt: new Date(), releaseReason: 'expired-before-booking' }
      });
      throw new BadRequestException('La retención del slot expiró.');
    }

    const pricing = await this.evaluatePricing(hold.slotId, input.profile);

    if (pricing.showParticularPrice && !input.acceptsEconomicPolicy) {
      throw new BadRequestException('Debe aceptar la política económica para pacientes particulares.');
    }

    const correlationId = this.correlationIdService.getOrCreate(headers);
    const paymentRequired = input.profile === 'PARTICULAR' || input.profile === 'COPAY';
    const booking = await this.prisma.$transaction(async (tx) => {
      const appointment = await tx.appointment.create({
        data: {
          patientId: hold.patientId,
          slotId: hold.slotId,
          status: paymentRequired ? AppointmentStatus.REQUESTED : AppointmentStatus.CONFIRMED
        }
      });

      if (paymentRequired) {
        await tx.payment.create({
          data: {
            patientId: hold.patientId,
            appointmentId: appointment.id,
            amount: new Prisma.Decimal(pricing.copayAmount ?? 25_000),
            status: PaymentStatus.PENDING,
            externalReference: appointment.id
          }
        });
      }

      await tx.slotHold.update({
        where: { id: hold.id },
        data: { releasedAt: new Date(), releaseReason: 'booked' }
      });

      return appointment;
    });

    this.auditTrailService.record({
      actorId: hold.patientId,
      action: 'appointment-booked',
      resource: 'appointment',
      resourceId: booking.id,
      correlationId,
      metadata: { profile: input.profile, pricing, paymentRequired }
    });

    this.businessEventsService.emit({
      name: 'turno.reservado',
      correlationId,
      occurredAt: new Date().toISOString(),
      payload: { bookingId: booking.id, slotId: hold.slotId, status: booking.status }
    });

    return { bookingId: booking.id, status: booking.status };
  }
}
