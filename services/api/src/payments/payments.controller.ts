import { Body, Controller, Headers, Post } from '@nestjs/common';
import { PaymentsService } from './payments.service';

@Controller('payments')
export class PaymentsController {
  constructor(private readonly paymentsService: PaymentsService) {}

  @Post('checkout-preference')
  createPreference(
    @Headers() headers: Record<string, string | undefined>,
    @Body() body: { externalReference: string; amount: number; payerEmail: string }
  ) {
    return this.paymentsService.createCheckoutPreference(headers, body);
  }

  @Post('webhooks/mercado-pago')
  webhook(
    @Headers() headers: Record<string, string | undefined>,
    @Headers('x-signature') signature: string,
    @Body() body: { id: string; action: string; data: { id: string } }
  ) {
    return this.paymentsService.processWebhook(headers, body, signature);
  }
}
