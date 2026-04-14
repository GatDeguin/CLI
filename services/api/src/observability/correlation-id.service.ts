import { BadRequestException, Injectable } from '@nestjs/common';
import { randomUUID } from 'node:crypto';

@Injectable()
export class CorrelationIdService {
  getOrCreate(headers: Record<string, string | undefined>): string {
    return this.read(headers) ?? randomUUID();
  }

  require(headers: Record<string, string | undefined>): string {
    const correlationId = this.read(headers);
    if (!correlationId) {
      throw new BadRequestException('x-correlation-id is required for this critical operation');
    }

    return correlationId;
  }

  private read(headers: Record<string, string | undefined>): string | undefined {
    return headers['x-correlation-id'] ?? headers['X-Correlation-Id'];
  }
}
