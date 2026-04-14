import { Module } from '@nestjs/common';
import { AuditTrailService } from './audit-trail.service';
import { BusinessEventsService } from './business-events.service';
import { CorrelationIdService } from './correlation-id.service';
import { MetricsController } from './metrics.controller';
import { MetricsService } from './metrics.service';

@Module({
  controllers: [MetricsController],
  providers: [CorrelationIdService, AuditTrailService, BusinessEventsService, MetricsService],
  exports: [CorrelationIdService, AuditTrailService, BusinessEventsService, MetricsService]
})
export class ObservabilityModule {}
