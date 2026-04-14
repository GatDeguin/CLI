import { Injectable } from '@nestjs/common';
import {
  Counter,
  Gauge,
  Histogram,
  Registry,
  collectDefaultMetrics,
  register as defaultRegistry
} from 'prom-client';

@Injectable()
export class MetricsService {
  private readonly registry: Registry;
  private readonly httpRequestsTotal: Counter<'method' | 'route' | 'status'>;
  private readonly httpRequestDurationSeconds: Histogram<'method' | 'route' | 'status'>;
  private readonly businessEventsTotal: Counter<'event'>;
  private readonly integrationErrorsTotal: Counter<'integration' | 'operation'>;
  private readonly paymentsRejectedTotal: Counter<'reason'>;
  private readonly workerExpectedEventTimestamp: Gauge<'domain'>;

  constructor() {
    this.registry = defaultRegistry;
    collectDefaultMetrics({ register: this.registry, prefix: 'hp_api_' });

    this.httpRequestsTotal = new Counter({
      name: 'hp_api_http_requests_total',
      help: 'Total de requests HTTP por endpoint',
      labelNames: ['method', 'route', 'status'],
      registers: [this.registry]
    });

    this.httpRequestDurationSeconds = new Histogram({
      name: 'hp_api_http_request_duration_seconds',
      help: 'Latencia HTTP en segundos por endpoint',
      labelNames: ['method', 'route', 'status'],
      buckets: [0.025, 0.05, 0.1, 0.2, 0.35, 0.5, 0.75, 1, 2, 5],
      registers: [this.registry]
    });

    this.businessEventsTotal = new Counter({
      name: 'hp_api_business_events_total',
      help: 'Eventos de negocio emitidos por la API',
      labelNames: ['event'],
      registers: [this.registry]
    });

    this.integrationErrorsTotal = new Counter({
      name: 'hp_api_integration_errors_total',
      help: 'Errores de integración por proveedor/operación',
      labelNames: ['integration', 'operation'],
      registers: [this.registry]
    });

    this.paymentsRejectedTotal = new Counter({
      name: 'hp_api_payments_rejected_total',
      help: 'Pagos rechazados o no aceptados',
      labelNames: ['reason'],
      registers: [this.registry]
    });

    this.workerExpectedEventTimestamp = new Gauge({
      name: 'hp_api_expected_event_last_timestamp_seconds',
      help: 'Timestamp del último evento esperado informado por worker',
      labelNames: ['domain'],
      registers: [this.registry]
    });
  }

  observeHttpRequest(method: string, route: string, status: number, durationMs: number): void {
    const labels = { method, route, status: String(status) };
    this.httpRequestsTotal.inc(labels);
    this.httpRequestDurationSeconds.observe(labels, durationMs / 1000);
  }

  countBusinessEvent(eventName: string): void {
    this.businessEventsTotal.inc({ event: eventName });
  }

  countIntegrationError(integration: string, operation: string): void {
    this.integrationErrorsTotal.inc({ integration, operation });
  }

  countRejectedPayment(reason: string): void {
    this.paymentsRejectedTotal.inc({ reason });
  }

  reportExpectedEvent(domain: string, occurredAt: Date): void {
    this.workerExpectedEventTimestamp.set({ domain }, Math.floor(occurredAt.getTime() / 1000));
  }

  metrics(): Promise<string> {
    return this.registry.metrics();
  }
}
