export enum RuleCode {
  PriceVisibility = 'BR-PRICE-VISIBILITY',
  CopayRequired = 'BR-COPAY',
  AppointmentLimit = 'BR-APPOINTMENT-LIMIT',
  CancellationWindow = 'BR-CANCELLATION',
  RescheduleWindow = 'BR-RESCHEDULE',
  DocumentPublication = 'BR-DOCUMENT-PUBLICATION'
}

export type RuleOperator = 'eq' | 'neq' | 'in' | 'gte' | 'lte' | 'gt' | 'lt';

export interface RuleCondition {
  field: string;
  operator: RuleOperator;
  value: string | number | boolean | string[];
}

export interface RuleDefinition {
  code: RuleCode;
  enabled: boolean;
  priority: number;
  conditions: RuleCondition[];
  payload: Record<string, unknown>;
}

export interface RuleContext {
  profile: 'PARTICULAR' | 'TOTAL_COVERAGE' | 'COPAY' | 'PENDING_COVERAGE' | 'TUTOR_DEPENDENT';
  activeAppointments: number;
  daysUntilAppointment?: number;
  documentType?: string;
}
