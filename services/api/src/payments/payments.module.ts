import { Module } from '@nestjs/common';
import { ObservabilityModule } from '../observability/observability.module';
import { MercadoPagoAdapter } from './mercado-pago.adapter';
import { PaymentsService } from './payments.service';

@Module({
  imports: [ObservabilityModule],
  providers: [PaymentsService, MercadoPagoAdapter],
  exports: [PaymentsService, MercadoPagoAdapter]
})
export class PaymentsModule {}
