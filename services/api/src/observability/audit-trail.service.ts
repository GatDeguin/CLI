import { Injectable, Logger } from '@nestjs/common';

export interface AuditRecord {
  readonly actorId: string;
  readonly action: string;
  readonly resource: string;
  readonly resourceId: string;
  readonly correlationId: string;
  readonly metadata?: Record<string, unknown>;
}

@Injectable()
export class AuditTrailService {
  private readonly logger = new Logger(AuditTrailService.name);

  record(entry: AuditRecord): void {
    this.logger.log({
      type: 'audit.recorded',
      timestamp: new Date().toISOString(),
      ...entry
    });
  }
}
