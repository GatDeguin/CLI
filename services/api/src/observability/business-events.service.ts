import { Injectable, Logger } from '@nestjs/common';

export interface BusinessEvent {
  readonly name: string;
  readonly correlationId: string;
  readonly occurredAt: string;
  readonly payload: Record<string, unknown>;
}

@Injectable()
export class BusinessEventsService {
  private readonly logger = new Logger(BusinessEventsService.name);

  emit(event: BusinessEvent): void {
    this.logger.log({ type: 'business.event', ...event });
  }
}
