# Operations Runbook

## KPIs técnicos y de negocio (SLO / SLI)
| KPI | Tipo | Objetivo | Fuente |
| --- | --- | --- | --- |
| Disponibilidad API (`hp_api_http_requests_total`) | Técnico | >= 99.9% mensual | `/metrics` API |
| Latencia p95 endpoints críticos (`hp_api_http_request_duration_seconds`) | Técnico | <= 800ms / 5m | Prometheus + Grafana |
| Errores de integración (`hp_api_integration_errors_total`) | Técnico | <= 3% por integración / hora | API |
| Rechazos de pago (`hp_api_payments_rejected_total`) | Negocio | <= 2% en ventana de 15m | API + pagos |
| Lag de colas (`hp_worker_queue_lag_ms`) | Técnico | <= 120s | Worker |
| Eventos esperados (`hp_worker_expected_event_last_timestamp_seconds`) | Técnico/Negocio | Sin huecos > 15m | Worker |

## Monitoreo diario
1. Salud API (latencia/errores).
2. Salud operativa de worker (`/healthz`, `/healthz/queues`).
3. Métricas por cola: `lagMs`, `retries`, `failRate`.
4. Cola de conciliación y DLQ.
5. Entrega de notificaciones.
6. Auditoría de eventos críticos.

## Dashboards obligatorios
1. **Colas**: backlog, lag, reintentos, DLQ por dominio.
2. **Errores de integración**: tasa por `integration/operation`.
3. **Pagos rechazados**: tasa por `reason` + correlación con webhook.
4. **Latencia endpoints críticos**: p50/p95/p99 para `payments`, `scheduling` y webhooks.

## Alertas (umbral + ausencia)
- `ApiHighLatencyP95` (warning): p95 > 800ms por 10m.
- `IntegrationErrorsSpike` (critical): errores de integración sostenidos por 10m.
- `PaymentRejectionsSpike` (critical): rechazo de pagos por encima de umbral durante 15m.
- `WorkerQueueLagHigh` (warning): lag > 120s durante 10m.
- `ExpectedEventsMissing` (critical): no hay eventos esperados por más de 15m.

## Cron schedules (worker)
| Dominio | Queue | Schedule | Objetivo |
| --- | --- | --- | --- |
| Reconciliación MP | `payments-reconciliation` | `0 3 * * *` | Conciliar pagos pendientes y cerrar estado de turnos. |
| Release holds | `slot-hold-expiration` | `every 60s` | Liberar retenciones vencidas de slots. |
| Sync legado | `legacy-sync` | `*/15 * * * *` | Ventana periódica para sincronización legacy diferida. |
| Ingestión laboratorio | `laboratory-ingestion` | `*/10 * * * *` | Ingesta batch de resultados LIS/HL7. |
| Publicación documentos | `documents-publication` | `*/5 * * * *` | Publicación de documentos pendientes al portal. |
| Notificaciones | `notifications-dispatch` | `*/2 * * * *` | Heartbeat operativo + procesamiento event-driven. |

## Correlation ID obligatorio
- Toda operación crítica inter-servicios debe incluir `x-correlation-id`.
- En API, endpoints internos críticos rechazan requests sin ese header.
- En worker, jobs críticos fallan si no traen `correlationId`.
- El `correlationId` debe propagarse hacia adapters externos y auditoría.

## Healthchecks operativos
- `GET /healthz`: valida conectividad Redis y estado de workers activos.
- `GET /healthz/queues`: snapshot por cola con backlog (`waiting/active/failed`), `lagMs`, `retries`, `failRate`.
- `GET /metrics`: endpoint Prometheus en API y worker.

## Incidentes frecuentes
### PSP webhook con rechazo masivo
- Verificar secreto de firma.
- Revisar BR-08 y reloj del sistema.
- Reprocesar eventos válidos.

### Backlog en conciliación
- Inspeccionar `payments-reconciliation` y `payments-reconciliation-dlq`.
- Escalar workers temporalmente.
- Ejecutar replay controlado.

### Caída de integración externa
- Activar modo degradado (sincronización diferida).
- Forzar reintentos manuales.
- Comunicar impacto en SC-32 Estado de servicios.

## Escalamiento por severidad
| Severidad | Criterio | Tiempo de respuesta | Escalamiento |
| --- | --- | --- | --- |
| SEV-1 | Corte total de pagos/agenda/API | <= 5 min | On-call + Líder técnico + Producto + Dirección |
| SEV-2 | Degradación severa, backlog alto, alertas críticas > 15m | <= 15 min | On-call + Tech Lead + Producto |
| SEV-3 | Error parcial con workaround | <= 60 min | Equipo de guardia + responsable de módulo |
| SEV-4 | Anomalía menor / ruido operacional | <= 1 día hábil | Backlog técnico |

## Política de reproceso
1. **Idempotencia por job key**: todo job debe incluir `jobKey`; el worker bloquea duplicados por 7 días en Redis (`worker:idempotency:<dominio>:<jobKey>`).
2. **Reintentos automáticos**: 4 intentos con backoff exponencial (1s, 2s, 4s, 8s).
3. **Dead-letter por dominio**: al agotar intentos, mover a `<queue>-dlq` y registrar evento de auditoría.
4. **Reproceso manual**:
   - Extraer payload desde DLQ del dominio afectado.
   - Reinyectar en cola principal con `jobKey` nuevo (sufijo `:reprocess:<timestamp>`).
   - Mantener referencia cruzada a `jobId` original en metadata.
5. **Notificaciones**: actualizar estado interno a `DEAD_LETTERED` ante move-to-DLQ, y luego `REPROCESSED` al reinyectar.
