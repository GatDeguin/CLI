import { Queue, Worker, JobsOptions, QueueEvents } from 'bullmq';
import Redis from 'ioredis';
import { randomUUID } from 'node:crypto';

const redisUrl = process.env.REDIS_URL ?? 'redis://localhost:6379';
const apiBaseUrl = process.env.API_BASE_URL ?? 'http://localhost:3000/v1';
const connection = { url: redisUrl };
const redis = new Redis(redisUrl, { maxRetriesPerRequest: 1 });

const defaultJobOptions: JobsOptions = {
  attempts: 4,
  backoff: {
    type: 'exponential',
    delay: 1_000
  },
  removeOnComplete: 1000,
  removeOnFail: 3000
};

const reconciliationQueue = new Queue('payments-reconciliation', {
  connection,
  defaultJobOptions
});
const slotHoldExpirationQueue = new Queue('slot-hold-expiration', {
  connection,
  defaultJobOptions
});
const notificationsDispatchQueue = new Queue('notifications-dispatch', {
  connection,
  defaultJobOptions
});

const deadLetterQueue = new Queue('payments-reconciliation-dlq', { connection });
const notificationsDeadLetterQueue = new Queue('notifications-dispatch-dlq', { connection });
const queueEvents = new QueueEvents('payments-reconciliation', { connection });
const notificationsQueueEvents = new QueueEvents('notifications-dispatch', { connection });

queueEvents.on('failed', async ({ jobId, failedReason }) => {
  const correlationId = randomUUID();

  await deadLetterQueue.add('dead-lettered-reconciliation', {
    jobId,
    failedReason,
    correlationId,
    movedAt: new Date().toISOString()
  });

  console.error({
    type: 'audit.reconciliation.dead-letter',
    jobId,
    failedReason,
    correlationId
  });
});

notificationsQueueEvents.on('failed', async ({ jobId, failedReason }) => {
  const correlationId = randomUUID();
  await notificationsDeadLetterQueue.add('dead-lettered-notification', {
    jobId,
    failedReason,
    correlationId,
    movedAt: new Date().toISOString()
  });

  const dispatchId = String(jobId ?? '').split(':')[0];
  if (dispatchId) {
    await fetch(`${apiBaseUrl}/notifications/internal/dispatches/${dispatchId}/status`, {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        authorization: `Bearer ${process.env.WORKER_INTERNAL_TOKEN ?? 'worker-internal-token'}`
      },
      body: JSON.stringify({
        status: 'DEAD_LETTERED',
        error: failedReason,
        metadata: { jobId }
      })
    }).catch(() => null);
  }
});

const worker = new Worker(
  'payments-reconciliation',
  async (job) => {
    const correlationId = (job.data as { correlationId?: string }).correlationId ?? randomUUID();
    const startedAt = Date.now();

    console.log({
      type: 'business.event.reconciliation.started',
      correlationId,
      jobId: job.id,
      requestedAt: new Date().toISOString()
    });

    await Promise.race([
      new Promise((resolve) => setTimeout(resolve, 150)),
      new Promise((_, reject) => setTimeout(() => reject(new Error('reconciliation-timeout')), 15_000))
    ]);

    console.log({
      type: 'business.event.reconciliation.completed',
      correlationId,
      jobId: job.id,
      latencyMs: Date.now() - startedAt
    });
  },
  { connection, lockDuration: 30_000 }
);

const slotExpirationWorker = new Worker(
  'slot-hold-expiration',
  async (job) => {
    const correlationId = (job.data as { correlationId?: string }).correlationId ?? randomUUID();
    const lockKey = 'worker:slot-hold-expiration:lock';
    const lockOwner = `${correlationId}:${job.id}`;
    const lock = await redis.set(lockKey, lockOwner, 'PX', 55_000, 'NX');

    if (lock !== 'OK') {
      return;
    }

    try {
      const response = await fetch(`${apiBaseUrl}/scheduling/internal/release-expired-holds?limit=500`, {
        method: 'POST',
        headers: {
          'content-type': 'application/json',
          'x-correlation-id': correlationId
        }
      });

      if (!response.ok) {
        throw new Error(`release-expired-holds-http-${response.status}`);
      }

      const body = (await response.json()) as { released: number };
      console.log({
        type: 'business.event.slot-hold-expiration.completed',
        correlationId,
        jobId: job.id,
        released: body.released
      });
    } finally {
      const script = `
        if redis.call("get", KEYS[1]) == ARGV[1] then
          return redis.call("del", KEYS[1])
        else
          return 0
        end
      `;
      await redis.eval(script, 1, lockKey, lockOwner);
    }
  },
  { connection, lockDuration: 60_000 }
);

const notificationsWorker = new Worker(
  'notifications-dispatch',
  async (job) => {
    const payload = job.data as { dispatchId: string; eventId: string; correlationId?: string };
    const providerRef = `mock-${randomUUID()}`;
    const correlationId = payload.correlationId ?? randomUUID();
    await new Promise((resolve) => setTimeout(resolve, 100));

    if ((job.attemptsMade ?? 0) < 2 && Math.random() < 0.2) {
      await fetch(`${apiBaseUrl}/notifications/internal/dispatches/${payload.dispatchId}/status`, {
        method: 'POST',
        headers: {
          'content-type': 'application/json',
          authorization: `Bearer ${process.env.WORKER_INTERNAL_TOKEN ?? 'worker-internal-token'}`
        },
        body: JSON.stringify({
          status: 'FAILED',
          error: 'provider-temporal-error',
          metadata: { eventId: payload.eventId, correlationId }
        })
      });
      throw new Error('provider-temporal-error');
    }

    await fetch(`${apiBaseUrl}/notifications/internal/dispatches/${payload.dispatchId}/status`, {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        authorization: `Bearer ${process.env.WORKER_INTERNAL_TOKEN ?? 'worker-internal-token'}`
      },
      body: JSON.stringify({
        status: 'SENT',
        providerRef,
        metadata: { eventId: payload.eventId, correlationId }
      })
    });

    await fetch(`${apiBaseUrl}/notifications/internal/dispatches/${payload.dispatchId}/status`, {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        authorization: `Bearer ${process.env.WORKER_INTERNAL_TOKEN ?? 'worker-internal-token'}`
      },
      body: JSON.stringify({
        status: 'DELIVERED',
        providerRef,
        metadata: { deliveredAt: new Date().toISOString() }
      })
    });
  },
  { connection, lockDuration: 30_000 }
);

worker.on('failed', (job, error) => {
  console.error({
    type: 'audit.reconciliation.failed',
    jobId: job?.id,
    attemptsMade: job?.attemptsMade,
    error: error.message
  });
});

slotExpirationWorker.on('failed', (job, error) => {
  console.error({
    type: 'audit.slot-hold-expiration.failed',
    jobId: job?.id,
    attemptsMade: job?.attemptsMade,
    error: error.message
  });
});

notificationsWorker.on('failed', async (job, error) => {
  console.error({
    type: 'audit.notifications.failed',
    jobId: job?.id,
    attemptsMade: job?.attemptsMade,
    error: error.message
  });

  const payload = (job?.data ?? {}) as { dispatchId?: string; eventId?: string; correlationId?: string };
  if (payload.dispatchId) {
    await fetch(`${apiBaseUrl}/notifications/internal/dispatches/${payload.dispatchId}/status`, {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        authorization: `Bearer ${process.env.WORKER_INTERNAL_TOKEN ?? 'worker-internal-token'}`
      },
      body: JSON.stringify({
        status: 'REPROCESSED',
        error: error.message,
        metadata: {
          eventId: payload.eventId,
          correlationId: payload.correlationId,
          attemptsMade: job?.attemptsMade
        }
      })
    }).catch(() => null);
  }
});

async function bootstrap() {
  await reconciliationQueue.add('nightly-reconciliation', { correlationId: randomUUID() }, { repeat: { pattern: '0 3 * * *' } });
  await slotHoldExpirationQueue.add('release-expired-slot-holds', { correlationId: randomUUID() }, { repeat: { every: 60_000 } });

  console.log('Worker bootstrapped with retry/dead-letter/timeout policies');
}

void bootstrap();
