import { Injectable } from '@nestjs/common';
import { BaseIntegrationAdapter } from './base.adapter';

export interface LegacyShift {
  readonly professionalId: string;
  readonly startsAt: string;
  readonly endsAt: string;
  readonly locationId: string;
}

@Injectable()
export class LegacySchedulingAdapter extends BaseIntegrationAdapter {
  constructor() {
    super('legacy-scheduling', process.env.LEGACY_API_BASE_URL ?? '', process.env.LEGACY_API_KEY ?? '');
  }

  async fetchShifts(date: string, correlationId: string): Promise<LegacyShift[]> {
    return this.request<LegacyShift[]>(`/api/v1/shifts?date=${date}`, 'GET', undefined, correlationId);
  }
}
