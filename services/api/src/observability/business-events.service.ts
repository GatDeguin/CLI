import { Injectable, Logger } from '@nestjs/common';
import { MetricsService } from './metrics.service';

export interface BusinessEvent {
  readonly name: string;
  readonly correlationId: string;
  readonly occurredAt: string;
  readonly payload: Record<string, unknown>;
}

@Injectable()
export class BusinessEventsService {
  private readonly logger = new Logger(BusinessEventsService.name);

  constructor(private readonly metricsService: MetricsService) {}

  emit(event: BusinessEvent): void {
    this.metricsService.countBusinessEvent(event.name);
    this.logger.log({ type: 'business.event', ...event });
  }
}
