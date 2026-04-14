export type CoverageProfile =
  | 'PARTICULAR'
  | 'TOTAL_COVERAGE'
  | 'COPAY'
  | 'PENDING_COVERAGE'
  | 'TUTOR_DEPENDENT';

export interface PricingDecision {
  showParticularPrice: boolean;
  copayAmount?: number;
  reason: string;
}

export interface Slot {
  id: string;
  professionalId: string;
  siteId: string;
  specialtyCode: string;
  startsAt: string;
  endsAt: string;
  requiresPreparation: boolean;
  onlineBlocked: boolean;
  particularPrice: number;
  copayAmount: number;
}

export interface SlotHold {
  holdId: string;
  slotId: string;
  patientId: string;
  expiresAt: string;
  correlationId: string;
}

export interface BookingRequest {
  holdId: string;
  patientId: string;
  profile: CoverageProfile;
  acceptsEconomicPolicy: boolean;
}
