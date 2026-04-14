import { Injectable } from '@nestjs/common';
import {
  RuleCode,
  RuleCondition,
  RuleContext,
  RuleDefinition
} from './rules.types';

@Injectable()
export class RulesEngine {
  evaluate(rules: RuleDefinition[], context: RuleContext) {
    return rules
      .filter((rule) => rule.enabled)
      .sort((a, b) => a.priority - b.priority)
      .map((rule) => ({
        code: rule.code,
        applied: rule.conditions.every((condition) => this.match(condition, context)),
        payload: rule.payload
      }));
  }

  private match(condition: RuleCondition, context: RuleContext): boolean {
    const candidate = (context as unknown as Record<string, unknown>)[condition.field];

    switch (condition.operator) {
      case 'eq':
        return candidate === condition.value;
      case 'neq':
        return candidate !== condition.value;
      case 'in':
        return Array.isArray(condition.value) && condition.value.includes(String(candidate));
      case 'gte':
        return Number(candidate) >= Number(condition.value);
      case 'lte':
        return Number(candidate) <= Number(condition.value);
      case 'gt':
        return Number(candidate) > Number(condition.value);
      case 'lt':
        return Number(candidate) < Number(condition.value);
      default:
        return false;
    }
  }
}

export const defaultBusinessRules: RuleDefinition[] = [
  {
    code: RuleCode.PriceVisibility,
    enabled: true,
    priority: 10,
    conditions: [{ field: 'profile', operator: 'eq', value: 'PARTICULAR' }],
    payload: { showPrice: true }
  },
  {
    code: RuleCode.CopayRequired,
    enabled: true,
    priority: 20,
    conditions: [{ field: 'profile', operator: 'eq', value: 'COPAY' }],
    payload: { requiresCopay: true, copayAmount: 2500 }
  },
  {
    code: RuleCode.AppointmentLimit,
    enabled: true,
    priority: 30,
    conditions: [{ field: 'activeAppointments', operator: 'gte', value: 3 }],
    payload: { denyBooking: true, message: 'Límite de turnos activos alcanzado.' }
  },
  {
    code: RuleCode.CancellationWindow,
    enabled: true,
    priority: 40,
    conditions: [{ field: 'daysUntilAppointment', operator: 'lt', value: 1 }],
    payload: { canCancel: false }
  },
  {
    code: RuleCode.RescheduleWindow,
    enabled: true,
    priority: 50,
    conditions: [{ field: 'daysUntilAppointment', operator: 'lt', value: 2 }],
    payload: { canReschedule: false }
  },
  {
    code: RuleCode.DocumentPublication,
    enabled: true,
    priority: 60,
    conditions: [
      { field: 'profile', operator: 'neq', value: 'PENDING_COVERAGE' },
      { field: 'documentType', operator: 'in', value: ['PRESCRIPTION', 'RESULT'] }
    ],
    payload: { publishToPatient: true }
  }
];
