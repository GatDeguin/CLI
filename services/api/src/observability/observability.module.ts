import { Module } from '@nestjs/common';
import { AuditTrailService } from './audit-trail.service';
import { BusinessEventsService } from './business-events.service';
import { CorrelationIdService } from './correlation-id.service';

@Module({
  providers: [CorrelationIdService, AuditTrailService, BusinessEventsService],
  exports: [CorrelationIdService, AuditTrailService, BusinessEventsService]
})
export class ObservabilityModule {}
