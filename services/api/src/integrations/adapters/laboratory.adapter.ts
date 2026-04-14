import { Injectable } from '@nestjs/common';
import { BaseIntegrationAdapter } from './base.adapter';

export interface LabOrderInput {
  readonly patientId: string;
  readonly examCodes: string[];
  readonly requestedBy: string;
}

@Injectable()
export class LaboratoryAdapter extends BaseIntegrationAdapter {
  constructor() {
    super('laboratory', process.env.LAB_API_URL ?? '', process.env.LAB_API_KEY ?? '');
  }

  async createOrder(order: LabOrderInput, correlationId: string): Promise<{ orderId: string }> {
    return this.request<{ orderId: string }>('/api/v1/orders', 'POST', order, correlationId);
  }
}
