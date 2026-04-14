import { Injectable } from '@nestjs/common';
import { AuditTrailService } from '../observability/audit-trail.service';
import { BusinessEventsService } from '../observability/business-events.service';
import { CorrelationIdService } from '../observability/correlation-id.service';
import { MetricsService } from '../observability/metrics.service';
import { LaboratoryAdapter, LabOrderInput } from './adapters/laboratory.adapter';
import { LegacySchedulingAdapter } from './adapters/legacy-scheduling.adapter';
import { MessagingAdapter } from './adapters/messaging.adapter';
import { ImagingStudyInput, RisPacsAdapter } from './adapters/ris-pacs.adapter';

@Injectable()
export class IntegrationsService {
  constructor(
    private readonly legacySchedulingAdapter: LegacySchedulingAdapter,
    private readonly laboratoryAdapter: LaboratoryAdapter,
    private readonly risPacsAdapter: RisPacsAdapter,
    private readonly messagingAdapter: MessagingAdapter,
    private readonly correlationIdService: CorrelationIdService,
    private readonly auditTrailService: AuditTrailService,
    private readonly businessEventsService: BusinessEventsService,
    private readonly metricsService: MetricsService
  ) {}

  async syncLegacyShifts(headers: Record<string, string | undefined>, date: string): Promise<void> {
    const correlationId = this.correlationIdService.getOrCreate(headers);
    await this.runIntegration('legacy-scheduling', 'sync-shifts', async () => {
      const shifts = await this.legacySchedulingAdapter.fetchShifts(date, correlationId);

      this.businessEventsService.emit({
        name: 'legacy.shifts.synced',
        correlationId,
        occurredAt: new Date().toISOString(),
        payload: { date, total: shifts.length }
      });
    });
  }

  async requestLabOrder(headers: Record<string, string | undefined>, order: LabOrderInput): Promise<{ orderId: string }> {
    const correlationId = this.correlationIdService.getOrCreate(headers);

    return this.runIntegration('laboratory', 'create-order', async () => {
      const result = await this.laboratoryAdapter.createOrder(order, correlationId);

      this.auditTrailService.record({
        actorId: order.requestedBy,
        action: 'create-lab-order',
        resource: 'lab-order',
        resourceId: result.orderId,
        correlationId,
        metadata: { examCodes: order.examCodes }
      });

      return result;
    });
  }

  async registerImagingStudy(headers: Record<string, string | undefined>, input: ImagingStudyInput): Promise<{ studyUid: string }> {
    const correlationId = this.correlationIdService.getOrCreate(headers);
    return this.runIntegration('ris-pacs', 'register-study', async () => this.risPacsAdapter.registerStudy(input, correlationId));
  }

  sendOtp(headers: Record<string, string | undefined>, destination: string, code: string): void {
    const correlationId = this.correlationIdService.getOrCreate(headers);
    void this.runIntegration('messaging', 'send-otp', async () => {
      this.messagingAdapter.sendOtp({ channel: 'sms', destination, code }, correlationId);
    });
  }

  private async runIntegration<T>(integration: string, operation: string, callback: () => Promise<T>): Promise<T> {
    try {
      return await callback();
    } catch (error) {
      this.metricsService.countIntegrationError(integration, operation);
      throw error;
    }
  }
}
