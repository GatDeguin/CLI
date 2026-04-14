import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { AuditTrailService } from '../observability/audit-trail.service';
import { BusinessEventsService } from '../observability/business-events.service';
import { CorrelationIdService } from '../observability/correlation-id.service';
import { BookingRequest, CoverageProfile, PricingDecision, Slot, SlotHold } from './scheduling.types';

const HOLD_MINUTES = Number(process.env.SLOT_HOLD_MINUTES ?? '10');

@Injectable()
export class SchedulingService {
  private readonly slots: Slot[] = [
    {
      id: 'slot-cardiologia-1',
      professionalId: 'prof-dr-perez',
      siteId: 'sede-central',
      specialtyCode: 'CARD',
      startsAt: '2026-04-18T14:00:00.000Z',
      endsAt: '2026-04-18T14:20:00.000Z',
      requiresPreparation: false,
      onlineBlocked: false,
      particularPrice: 25000,
      copayAmount: 4500
    },
    {
      id: 'slot-imagenes-1',
      professionalId: 'prof-dr-sosa',
      siteId: 'sede-norte',
      specialtyCode: 'IMAG',
      startsAt: '2026-04-19T16:00:00.000Z',
      endsAt: '2026-04-19T16:40:00.000Z',
      requiresPreparation: true,
      onlineBlocked: true,
      particularPrice: 80000,
      copayAmount: 10000
    }
  ];

  private readonly holds = new Map<string, SlotHold>();
  private readonly bookings = new Map<string, { id: string; slotId: string; patientId: string; status: string }>();

  constructor(
    private readonly correlationIdService: CorrelationIdService,
    private readonly auditTrailService: AuditTrailService,
    private readonly businessEventsService: BusinessEventsService
  ) {}

  listAvailableSlots(): Slot[] {
    const now = Date.now();
    const reservedSlots = new Set(
      [...this.holds.values()]
        .filter((hold) => new Date(hold.expiresAt).getTime() > now)
        .map((hold) => hold.slotId)
    );

    return this.slots.filter((slot) => !reservedSlots.has(slot.id));
  }

  holdSlot(headers: Record<string, string | undefined>, slotId: string, patientId: string): SlotHold {
    const slot = this.slots.find((candidate) => candidate.id === slotId);

    if (!slot) {
      throw new NotFoundException('Slot no encontrado.');
    }

    if (slot.onlineBlocked) {
      throw new BadRequestException('La práctica requiere validación administrativa.');
    }

    const existingHold = [...this.holds.values()].find((hold) => hold.slotId === slotId && new Date(hold.expiresAt).getTime() > Date.now());

    if (existingHold) {
      throw new BadRequestException('El slot ya se encuentra retenido temporalmente.');
    }

    const correlationId = this.correlationIdService.getOrCreate(headers);
    const expiresAt = new Date(Date.now() + HOLD_MINUTES * 60_000).toISOString();
    const hold: SlotHold = {
      holdId: `hold-${slotId}-${patientId}`,
      slotId,
      patientId,
      expiresAt,
      correlationId
    };

    this.holds.set(hold.holdId, hold);
    this.businessEventsService.emit({
      name: 'slot.retenido',
      correlationId,
      occurredAt: new Date().toISOString(),
      payload: { slotId, patientId, expiresAt }
    });

    return hold;
  }

  evaluatePricing(slotId: string, profile: CoverageProfile): PricingDecision {
    const slot = this.slots.find((candidate) => candidate.id === slotId);
    if (!slot) {
      throw new NotFoundException('Slot no encontrado.');
    }

    if (profile === 'PARTICULAR') {
      return {
        showParticularPrice: true,
        reason: `Precio particular: ARS ${slot.particularPrice.toLocaleString('es-AR')}`
      };
    }

    if (profile === 'COPAY') {
      return {
        showParticularPrice: false,
        copayAmount: slot.copayAmount,
        reason: `Copago vigente: ARS ${slot.copayAmount.toLocaleString('es-AR')}`
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

  bookAppointment(headers: Record<string, string | undefined>, input: BookingRequest): { bookingId: string; status: string } {
    const hold = this.holds.get(input.holdId);
    if (!hold) {
      throw new NotFoundException('Retención no encontrada.');
    }

    if (new Date(hold.expiresAt).getTime() <= Date.now()) {
      this.holds.delete(input.holdId);
      throw new BadRequestException('La retención del slot expiró.');
    }

    const pricing = this.evaluatePricing(hold.slotId, input.profile);

    if (pricing.showParticularPrice && !input.acceptsEconomicPolicy) {
      throw new BadRequestException('Debe aceptar la política económica para pacientes particulares.');
    }

    const correlationId = this.correlationIdService.getOrCreate(headers);
    const bookingId = `apt-${hold.slotId}-${hold.patientId}`;

    this.bookings.set(bookingId, {
      id: bookingId,
      slotId: hold.slotId,
      patientId: hold.patientId,
      status: input.profile === 'PARTICULAR' || input.profile === 'COPAY' ? 'PENDIENTE_PAGO' : 'CONFIRMADO'
    });
    this.holds.delete(input.holdId);

    this.auditTrailService.record({
      actorId: hold.patientId,
      action: 'appointment-booked',
      resource: 'appointment',
      resourceId: bookingId,
      correlationId,
      metadata: { profile: input.profile, pricing }
    });

    this.businessEventsService.emit({
      name: 'turno.reservado',
      correlationId,
      occurredAt: new Date().toISOString(),
      payload: { bookingId, slotId: hold.slotId, status: this.bookings.get(bookingId)?.status }
    });

    return { bookingId, status: this.bookings.get(bookingId)?.status ?? 'PENDIENTE' };
  }
}
