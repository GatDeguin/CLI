import { Logger } from '@nestjs/common';
import { DEFAULT_INTEGRATION_POLICY, IntegrationPolicy } from '../policies/resilience.policy';

export abstract class BaseIntegrationAdapter {
  protected readonly logger = new Logger(this.constructor.name);

  constructor(
    protected readonly serviceName: string,
    protected readonly baseUrl: string,
    protected readonly apiKey: string,
    protected readonly policy: IntegrationPolicy = DEFAULT_INTEGRATION_POLICY
  ) {}

  protected async request<T>(
    path: string,
    method: 'GET' | 'POST',
    body: unknown,
    correlationId: string
  ): Promise<T> {
    let attempt = 1;
    let delay = this.policy.retry.initialDelayMs;

    while (attempt <= this.policy.retry.maxAttempts) {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), this.policy.timeout.requestTimeoutMs);

      try {
        const response = await fetch(`${this.baseUrl}${path}`, {
          method,
          headers: {
            'content-type': 'application/json',
            authorization: `Bearer ${this.apiKey}`,
            'x-correlation-id': correlationId
          },
          body: body ? JSON.stringify(body) : undefined,
          signal: controller.signal
        });

        if (!response.ok) {
          throw new Error(`${this.serviceName} responded with status ${response.status}`);
        }

        clearTimeout(timeout);
        return (await response.json()) as T;
      } catch (error) {
        clearTimeout(timeout);

        if (attempt === this.policy.retry.maxAttempts) {
          this.logger.error({
            event: 'integration.request.failed',
            service: this.serviceName,
            correlationId,
            deadLetterQueue: this.policy.deadLetter.queueName,
            error: error instanceof Error ? error.message : 'unknown'
          });

          throw error;
        }

        this.logger.warn({
          event: 'integration.request.retry',
          service: this.serviceName,
          attempt,
          correlationId,
          nextDelayMs: delay
        });

        await new Promise((resolve) => setTimeout(resolve, delay));
        delay = Math.min(delay * this.policy.retry.multiplier, this.policy.retry.maxDelayMs);
        attempt += 1;
      }
    }

    throw new Error('unreachable');
  }
}
