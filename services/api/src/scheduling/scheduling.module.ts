import { Module } from '@nestjs/common';
import { ObservabilityModule } from '../observability/observability.module';
import { SchedulingController } from './scheduling.controller';
import { SchedulingService } from './scheduling.service';

@Module({
  imports: [ObservabilityModule],
  providers: [SchedulingService],
  controllers: [SchedulingController],
  exports: [SchedulingService]
})
export class SchedulingModule {}
