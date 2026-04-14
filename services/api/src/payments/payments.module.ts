import { Module } from '@nestjs/common';
import { ObservabilityModule } from '../observability/observability.module';
import { MercadoPagoAdapter } from './mercado-pago.adapter';
import { PaymentsController } from './payments.controller';
import { PaymentsService } from './payments.service';

@Module({
  imports: [ObservabilityModule],
  providers: [PaymentsService, MercadoPagoAdapter],
  controllers: [PaymentsController],
  exports: [PaymentsService, MercadoPagoAdapter]
})
export class PaymentsModule {}
