# Operations Runbook

## Monitoreo diario
1. Salud API (latencia/errores).
2. Salud operativa de worker (`/healthz`, `/healthz/queues`).
3. Métricas por cola: `lagMs`, `retries`, `failRate`.
4. Cola de conciliación y DLQ.
5. Entrega de notificaciones.
6. Auditoría de eventos críticos.

## Cron schedules (worker)
| Dominio | Queue | Schedule | Objetivo |
| --- | --- | --- | --- |
| Reconciliación MP | `payments-reconciliation` | `0 3 * * *` | Conciliar pagos pendientes y cerrar estado de turnos. |
| Release holds | `slot-hold-expiration` | `every 60s` | Liberar retenciones vencidas de slots. |
| Sync legado | `legacy-sync` | `*/15 * * * *` | Ventana periódica para sincronización legacy diferida. |
| Ingestión laboratorio | `laboratory-ingestion` | `*/10 * * * *` | Ingesta batch de resultados LIS/HL7. |
| Publicación documentos | `documents-publication` | `*/5 * * * *` | Publicación de documentos pendientes al portal. |
| Notificaciones | `notifications-dispatch` | `*/2 * * * *` | Heartbeat operativo + procesamiento event-driven. |

## Healthchecks operativos
- `GET /healthz`: valida conectividad Redis y estado de workers activos.
- `GET /healthz/queues`: snapshot por cola con backlog (`waiting/active/failed`), `lagMs`, `retries`, `failRate`.
- `GET /metrics/queues`: mismo payload de cola, para scraping de observabilidad operativa.

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

## Política de reproceso
1. **Idempotencia por job key**: todo job debe incluir `jobKey`; el worker bloquea duplicados por 7 días en Redis (`worker:idempotency:<dominio>:<jobKey>`).
2. **Reintentos automáticos**: 4 intentos con backoff exponencial (1s, 2s, 4s, 8s).
3. **Dead-letter por dominio**: al agotar intentos, mover a `<queue>-dlq` y registrar evento de auditoría.
4. **Reproceso manual**:
   - Extraer payload desde DLQ del dominio afectado.
   - Reinyectar en cola principal con `jobKey` nuevo (sufijo `:reprocess:<timestamp>`).
   - Mantener referencia cruzada a `jobId` original en metadata.
5. **Notificaciones**: actualizar estado interno a `DEAD_LETTERED` ante move-to-DLQ, y luego `REPROCESSED` al reinyectar.

## Checks operativos
- Métricas de disponibilidad RNF-01.
- Tasa de error por endpoint.
- Edad de mensaje más antiguo en DLQ.
