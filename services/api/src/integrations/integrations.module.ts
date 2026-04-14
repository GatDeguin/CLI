import { Module } from '@nestjs/common';
import { ObservabilityModule } from '../observability/observability.module';
import { LaboratoryAdapter } from './adapters/laboratory.adapter';
import { LegacySchedulingAdapter } from './adapters/legacy-scheduling.adapter';
import { MessagingAdapter } from './adapters/messaging.adapter';
import { RisPacsAdapter } from './adapters/ris-pacs.adapter';
import { IntegrationsService } from './integrations.service';

@Module({
  imports: [ObservabilityModule],
  providers: [
    IntegrationsService,
    LegacySchedulingAdapter,
    LaboratoryAdapter,
    RisPacsAdapter,
    MessagingAdapter
  ],
  exports: [IntegrationsService]
})
export class IntegrationsModule {}
