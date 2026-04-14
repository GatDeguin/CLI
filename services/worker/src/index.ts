import { Queue, Worker, JobsOptions, QueueEvents } from 'bullmq';
import { randomUUID } from 'node:crypto';

const redisUrl = process.env.REDIS_URL ?? 'redis://localhost:6379';
const connection = { url: redisUrl };

const defaultJobOptions: JobsOptions = {
  attempts: 4,
  backoff: {
    type: 'exponential',
    delay: 1_000
  },
  removeOnComplete: 1000,
  removeOnFail: 3000,
};

const reconciliationQueue = new Queue('payments-reconciliation', {
  connection,
  defaultJobOptions
});

const deadLetterQueue = new Queue('payments-reconciliation-dlq', { connection });
const queueEvents = new QueueEvents('payments-reconciliation', { connection });

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

    // Placeholder for API call towards payments service reconcile endpoint.
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

worker.on('failed', (job, error) => {
  console.error({
    type: 'audit.reconciliation.failed',
    jobId: job?.id,
    attemptsMade: job?.attemptsMade,
    error: error.message
  });
});

async function bootstrap() {
  await reconciliationQueue.add(
    'nightly-reconciliation',
    { correlationId: randomUUID() },
    { repeat: { pattern: '0 3 * * *' } }
  );

  console.log('Worker bootstrapped with retry/dead-letter/timeout policies');
}

void bootstrap();
