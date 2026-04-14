import { Body, Controller, Get, Headers, Param, Post, Query } from '@nestjs/common';
import { Public } from '../common/auth/public.decorator';
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

  @Post('internal/reconcile')
  @Public()
  reconcile(@Headers() headers: Record<string, string | undefined>, @Body() body?: { limit?: number }) {
    return this.paymentsService.reconcilePendingPayments(headers, body?.limit);
  }

  @Get(':paymentId/receipt')
  getReceipt(@Headers() headers: Record<string, string | undefined>, @Param('paymentId') paymentId: string) {
    return this.paymentsService.generateReceipt(headers, paymentId);
  }

  @Get('ledger/events')
  getLedger(
    @Headers() headers: Record<string, string | undefined>,
    @Query('paymentId') paymentId?: string,
    @Query('appointmentId') appointmentId?: string
  ) {
    return this.paymentsService.getPaymentLedger(headers, { paymentId, appointmentId });
  }

  @Get('treasury/export')
  exportTreasury(
    @Headers() headers: Record<string, string | undefined>,
    @Query('format') format: 'csv' | 'xlsx' = 'csv'
  ) {
    return this.paymentsService.exportTreasury(headers, format);
  }
}
