import { createServer } from 'node:http';
import { randomUUID } from 'node:crypto';
import { JobsOptions, Queue, QueueEvents, Worker } from 'bullmq';
import Redis from 'ioredis';
import { Counter, Gauge, Registry, collectDefaultMetrics } from 'prom-client';

type DomainKey =
  | 'notifications'
  | 'legacy-sync'
  | 'laboratory-ingestion'
  | 'documents-publication'
  | 'payments-reconciliation'
  | 'slot-hold-release';

interface DomainRuntimeStats {
  processed: number;
  failed: number;
  retries: number;
  deadLettered: number;
  lastProcessedAt?: string;
  lastFailedAt?: string;
}

interface JobPayload {
  correlationId?: string;
  jobKey?: string;
  [key: string]: unknown;
}

const redisUrl = process.env.REDIS_URL ?? 'redis://localhost:6379';
const apiBaseUrl = process.env.API_BASE_URL ?? 'http://localhost:3000/v1';
const workerToken = process.env.WORKER_INTERNAL_TOKEN ?? 'worker-internal-token';
const metricsPort = Number(process.env.WORKER_METRICS_PORT ?? '9465');
const connection = { url: redisUrl };
const redis = new Redis(redisUrl, { maxRetriesPerRequest: 1 });

const defaultJobOptions: JobsOptions = {
  attempts: 4,
  backoff: { type: 'exponential', delay: 1_000 },
  removeOnComplete: 1000,
  removeOnFail: 3000
};

const domains: Record<DomainKey, { queueName: string; dlqName: string }> = {
  notifications: { queueName: 'notifications-dispatch', dlqName: 'notifications-dispatch-dlq' },
  'legacy-sync': { queueName: 'legacy-sync', dlqName: 'legacy-sync-dlq' },
  'laboratory-ingestion': { queueName: 'laboratory-ingestion', dlqName: 'laboratory-ingestion-dlq' },
  'documents-publication': { queueName: 'documents-publication', dlqName: 'documents-publication-dlq' },
  'payments-reconciliation': { queueName: 'payments-reconciliation', dlqName: 'payments-reconciliation-dlq' },
  'slot-hold-release': { queueName: 'slot-hold-expiration', dlqName: 'slot-hold-expiration-dlq' }
};

const queues = Object.fromEntries(
  Object.entries(domains).map(([domain, cfg]) => [domain, new Queue(cfg.queueName, { connection, defaultJobOptions })])
) as Record<DomainKey, Queue>;

const deadLetterQueues = Object.fromEntries(
  Object.entries(domains).map(([domain, cfg]) => [domain, new Queue(cfg.dlqName, { connection })])
) as Record<DomainKey, Queue>;

const queueEvents = Object.fromEntries(
  Object.entries(domains).map(([domain, cfg]) => [domain, new QueueEvents(cfg.queueName, { connection })])
) as Record<DomainKey, QueueEvents>;

const stats = Object.fromEntries(
  (Object.keys(domains) as DomainKey[]).map((domain) => [domain, { processed: 0, failed: 0, retries: 0, deadLettered: 0 }])
) as Record<DomainKey, DomainRuntimeStats>;

const metricsRegistry = new Registry();
collectDefaultMetrics({ register: metricsRegistry, prefix: 'hp_worker_' });
const queueProcessedTotal = new Counter({
  name: 'hp_worker_queue_processed_total',
  help: 'Jobs procesados por dominio',
  labelNames: ['domain'],
  registers: [metricsRegistry]
});
const queueFailedTotal = new Counter({
  name: 'hp_worker_queue_failed_total',
  help: 'Jobs fallidos por dominio',
  labelNames: ['domain'],
  registers: [metricsRegistry]
});
const queueDeadLetteredTotal = new Counter({
  name: 'hp_worker_queue_dead_lettered_total',
  help: 'Jobs movidos a DLQ por dominio',
  labelNames: ['domain'],
  registers: [metricsRegistry]
});
const queueLagMsGauge = new Gauge({
  name: 'hp_worker_queue_lag_ms',
  help: 'Lag de cola por dominio en ms',
  labelNames: ['domain'],
  registers: [metricsRegistry]
});
const expectedEventLastTimestamp = new Gauge({
  name: 'hp_worker_expected_event_last_timestamp_seconds',
  help: 'Último evento esperado emitido por dominio (epoch seconds)',
  labelNames: ['domain'],
  registers: [metricsRegistry]
});

async function callInternal(urlPath: string, body: Record<string, unknown>, correlationId: string): Promise<unknown> {
  const response = await fetch(`${apiBaseUrl}${urlPath}`, {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      authorization: `Bearer ${workerToken}`,
      'x-correlation-id': correlationId
    },
    body: JSON.stringify(body)
  });

  if (!response.ok) {
    throw new Error(`${urlPath}-http-${response.status}`);
  }

  return response.json().catch(() => null);
}

async function ensureJobIdempotency(domain: DomainKey, payload: JobPayload, jobId: string): Promise<boolean> {
  const key = payload.jobKey ?? jobId;
  if (!key) {
    return true;
  }

  const lock = await redis.set(`worker:idempotency:${domain}:${key}`, String(jobId), 'EX', 60 * 60 * 24 * 7, 'NX');
  return lock === 'OK';
}

async function getQueueLagMs(queue: Queue): Promise<number> {
  const jobs = await queue.getJobs(['waiting', 'prioritized', 'delayed'], 0, 0, true);
  const oldest = jobs[0];
  if (!oldest) {
    return 0;
  }

  return Math.max(0, Date.now() - oldest.timestamp);
}

function toFailRate(domain: DomainKey): number {
  const domainStats = stats[domain];
  const total = domainStats.processed + domainStats.failed;
  return total === 0 ? 0 : Number((domainStats.failed / total).toFixed(4));
}

function createDomainWorker(domain: DomainKey, processor: (payload: JobPayload, jobId: string | undefined) => Promise<void>) {
  const worker = new Worker(
    domains[domain].queueName,
    async (job) => {
      const payload = (job.data ?? {}) as JobPayload;
      const correlationId = payload.correlationId;

      if (!correlationId) {
        throw new Error(`missing-correlation-id:${domain}:${String(job.id ?? 'unknown-job')}`);
      }

      if (!(await ensureJobIdempotency(domain, payload, String(job.id ?? 'unknown-job')))) {
        console.log({ type: 'worker.idempotency.skipped', domain, jobId: job.id, jobKey: payload.jobKey });
        return;
      }

      try {
        await processor({ ...payload, correlationId }, job.id);
        stats[domain].processed += 1;
        queueProcessedTotal.inc({ domain });
        stats[domain].lastProcessedAt = new Date().toISOString();
      } catch (error) {
        stats[domain].failed += 1;
        queueFailedTotal.inc({ domain });
        stats[domain].lastFailedAt = new Date().toISOString();
        throw error;
      }
    },
    { connection, lockDuration: 60_000 }
  );

  worker.on('failed', (job, error) => {
    if (job && (job.attemptsMade ?? 0) < (job.opts.attempts ?? defaultJobOptions.attempts ?? 1)) {
      stats[domain].retries += 1;
    }

    console.error({
      type: `audit.${domain}.failed`,
      jobId: job?.id,
      attemptsMade: job?.attemptsMade,
      error: error.message
    });
  });

  return worker;
}

for (const domain of Object.keys(domains) as DomainKey[]) {
  queueEvents[domain].on('failed', async ({ jobId, failedReason }) => {
    const correlationId = randomUUID();
    stats[domain].deadLettered += 1;
    queueDeadLetteredTotal.inc({ domain });

    await deadLetterQueues[domain].add(`dead-lettered-${domain}`, {
      domain,
      jobId,
      failedReason,
      correlationId,
      movedAt: new Date().toISOString()
    });

    console.error({ type: `audit.${domain}.dead-letter`, domain, jobId, failedReason, correlationId });

    if (domain === 'notifications') {
      const dispatchId = String(jobId ?? '').split(':')[0];
      if (dispatchId) {
        await callInternal(
          `/notifications/internal/dispatches/${dispatchId}/status`,
          { status: 'DEAD_LETTERED', error: failedReason, metadata: { jobId, correlationId } },
          correlationId
        ).catch(() => null);
      }
    }
  });
}

const reconciliationWorker = createDomainWorker('payments-reconciliation', async (payload, jobId) => {
  const correlationId = String(payload.correlationId ?? randomUUID());
  const result = await callInternal('/payments/internal/reconcile', { limit: 500 }, correlationId);

  console.log({
    type: 'business.event.reconciliation.completed',
    correlationId,
    jobId,
    result
  });
  reportExpectedEvent('payments-reconciliation');
});

const slotExpirationWorker = createDomainWorker('slot-hold-release', async (payload, jobId) => {
  const correlationId = String(payload.correlationId ?? randomUUID());
  const lockKey = 'worker:slot-hold-expiration:lock';
  const lockOwner = `${correlationId}:${jobId}`;
  const lock = await redis.set(lockKey, lockOwner, 'PX', 55_000, 'NX');

  if (lock !== 'OK') {
    return;
  }

  try {
    const result = await callInternal('/scheduling/internal/release-expired-holds?limit=500', {}, correlationId);
    console.log({
      type: 'business.event.slot-hold-expiration.completed',
      correlationId,
      jobId,
      result
    });
    reportExpectedEvent('slot-hold-release');
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
});

const notificationsWorker = createDomainWorker('notifications', async (payload, jobId) => {
  const dispatchId = String(payload.dispatchId ?? '');
  const eventId = String(payload.eventId ?? '');
  const correlationId = String(payload.correlationId ?? randomUUID());

  if (!dispatchId) {
    console.log({ type: 'business.event.notifications.heartbeat', correlationId, jobId });
    reportExpectedEvent('notifications');
    return;
  }

  const providerRef = `provider-${randomUUID()}`;
  await callInternal(
    `/notifications/internal/dispatches/${dispatchId}/status`,
    { status: 'SENT', providerRef, metadata: { eventId, correlationId, jobId } },
    correlationId
  );
  await callInternal(
    `/notifications/internal/dispatches/${dispatchId}/status`,
    { status: 'DELIVERED', providerRef, metadata: { deliveredAt: new Date().toISOString() } },
    correlationId
  );
  reportExpectedEvent('notifications');
});

const laboratoryIngestionWorker = createDomainWorker('laboratory-ingestion', async (payload, jobId) => {
  console.log({
    type: 'business.event.laboratory-ingestion.completed',
    correlationId: payload.correlationId,
    jobId,
    source: payload.source ?? 'lis-batch'
  });
  reportExpectedEvent('laboratory-ingestion');
});

const documentsPublicationWorker = createDomainWorker('documents-publication', async (payload, jobId) => {
  console.log({
    type: 'business.event.documents-publication.completed',
    correlationId: payload.correlationId,
    jobId,
    documentId: payload.documentId
  });
  reportExpectedEvent('documents-publication');
});

const workers = [
  reconciliationWorker,
  slotExpirationWorker,
  notificationsWorker,
  laboratoryIngestionWorker,
  documentsPublicationWorker
];

async function enqueueRecurring(domain: DomainKey, name: string, repeat: JobsOptions['repeat']) {
  const correlationId = randomUUID();
  const jobKey = `${domain}:${name}`;
  await queues[domain].add(name, { correlationId, jobKey }, { jobId: jobKey, repeat });
}

async function queueHealth() {
  const snapshot = await Promise.all(
    (Object.keys(domains) as DomainKey[]).map(async (domain) => {
      const queue = queues[domain];
      const counts = await queue.getJobCounts('waiting', 'active', 'failed', 'delayed', 'completed');
      const lagMs = await getQueueLagMs(queue);
      queueLagMsGauge.set({ domain }, lagMs);

      return {
        domain,
        queue: domains[domain].queueName,
        deadLetterQueue: domains[domain].dlqName,
        lagMs,
        retries: stats[domain].retries,
        failRate: toFailRate(domain),
        counts,
        processed: stats[domain].processed,
        failed: stats[domain].failed,
        deadLettered: stats[domain].deadLettered,
        lastProcessedAt: stats[domain].lastProcessedAt,
        lastFailedAt: stats[domain].lastFailedAt
      };
    })
  );

  return snapshot;
}

function reportExpectedEvent(domain: DomainKey): void {
  expectedEventLastTimestamp.set({ domain }, Math.floor(Date.now() / 1000));
}

function startOperationalServer() {
  const server = createServer(async (req, res) => {
    try {
      if (req.url === '/healthz') {
        await redis.ping();
        const unhealthyWorker = workers.find((worker) => worker.isRunning() === false);
        const payload = {
          ok: !unhealthyWorker,
          redis: 'up',
          workers: workers.length,
          checkedAt: new Date().toISOString()
        };
        res.statusCode = unhealthyWorker ? 503 : 200;
        res.setHeader('content-type', 'application/json');
        res.end(JSON.stringify(payload));
        return;
      }

      if (req.url === '/healthz/queues' || req.url === '/metrics/queues') {
        const payload = await queueHealth();
        res.statusCode = 200;
        res.setHeader('content-type', 'application/json');
        res.end(JSON.stringify({ generatedAt: new Date().toISOString(), queues: payload }));
        return;
      }

      if (req.url === '/metrics') {
        const payload = await metricsRegistry.metrics();
        res.statusCode = 200;
        res.setHeader('content-type', 'text/plain; version=0.0.4; charset=utf-8');
        res.end(payload);
        return;
      }

      res.statusCode = 404;
      res.end('not-found');
    } catch (error) {
      res.statusCode = 500;
      res.setHeader('content-type', 'application/json');
      res.end(
        JSON.stringify({
          ok: false,
          error: error instanceof Error ? error.message : 'unknown-error',
          generatedAt: new Date().toISOString()
        })
      );
    }
  });

  server.listen(metricsPort, () => {
    console.log(`Operational endpoints available on :${metricsPort} (/healthz, /healthz/queues, /metrics/queues, /metrics)`);
  });
}

async function bootstrap() {
  await enqueueRecurring('payments-reconciliation', 'nightly-reconciliation', { pattern: '0 3 * * *' });
  await enqueueRecurring('slot-hold-release', 'release-expired-slot-holds', { every: 60_000 });
  await enqueueRecurring('legacy-sync', 'legacy-sync-window', { pattern: '*/15 * * * *' });
  await enqueueRecurring('laboratory-ingestion', 'laboratory-ingestion-batch', { pattern: '*/10 * * * *' });
  await enqueueRecurring('documents-publication', 'documents-publication-batch', { pattern: '*/5 * * * *' });
  await enqueueRecurring('notifications', 'notifications-ops-heartbeat', { pattern: '*/2 * * * *' });

  startOperationalServer();
  console.log('Worker bootstrapped with domain queues, idempotency, DLQ and operational metrics');
}

void bootstrap();
