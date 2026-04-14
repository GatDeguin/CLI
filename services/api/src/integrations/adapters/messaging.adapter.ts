import { Injectable, Logger } from '@nestjs/common';

export interface OtpMessage {
  readonly channel: 'sms' | 'whatsapp' | 'email';
  readonly destination: string;
  readonly code: string;
}

export interface EmailMessage {
  readonly to: string;
  readonly subject: string;
  readonly html: string;
}

export interface PushMessage {
  readonly token: string;
  readonly title: string;
  readonly body: string;
}

@Injectable()
export class MessagingAdapter {
  private readonly logger = new Logger(MessagingAdapter.name);

  sendOtp(payload: OtpMessage, correlationId: string): void {
    this.logger.log({ event: 'notification.otp.sent', correlationId, payload });
  }

  sendEmail(payload: EmailMessage, correlationId: string): void {
    this.logger.log({ event: 'notification.email.sent', correlationId, payload });
  }

  sendPush(payload: PushMessage, correlationId: string): void {
    this.logger.log({ event: 'notification.push.sent', correlationId, payload });
  }
}
