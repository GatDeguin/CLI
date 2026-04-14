import { Injectable } from '@nestjs/common';
import { randomUUID } from 'node:crypto';

@Injectable()
export class CorrelationIdService {
  getOrCreate(headers: Record<string, string | undefined>): string {
    return headers['x-correlation-id'] ?? randomUUID();
  }
}
