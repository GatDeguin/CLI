export interface RetryPolicy {
  readonly maxAttempts: number;
  readonly initialDelayMs: number;
  readonly multiplier: number;
  readonly maxDelayMs: number;
}

export interface TimeoutPolicy {
  readonly requestTimeoutMs: number;
}

export interface DeadLetterPolicy {
  readonly queueName: string;
  readonly retentionHours: number;
}

export interface IntegrationPolicy {
  readonly retry: RetryPolicy;
  readonly timeout: TimeoutPolicy;
  readonly deadLetter: DeadLetterPolicy;
}

export const DEFAULT_INTEGRATION_POLICY: IntegrationPolicy = {
  retry: {
    maxAttempts: 4,
    initialDelayMs: 300,
    multiplier: 2,
    maxDelayMs: 15_000
  },
  timeout: {
    requestTimeoutMs: 8_000
  },
  deadLetter: {
    queueName: 'integration-dlq',
    retentionHours: 72
  }
};
