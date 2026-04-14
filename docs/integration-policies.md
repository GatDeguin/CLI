# Políticas operativas de integraciones

## Retry y timeouts
- Integraciones HTTP (`services/api/src/integrations/adapters/base.adapter.ts`) usan retry exponencial: 4 intentos, delay inicial de 300ms, multiplicador x2, máximo 15s.
- Timeout por request: 8s.
- Worker de conciliación: 4 intentos con backoff exponencial de 1s y timeout de 15s por job.

## Dead-letter
- API registra errores terminales con referencia a `integration-dlq`.
- Worker mueve jobs fallidos a `payments-reconciliation-dlq` usando `QueueEvents`.

## Correlation IDs
- API: `CorrelationIdService` usa `x-correlation-id` y si no existe genera UUID.
- Worker: cada job usa `correlationId` del payload o UUID generado.

## Auditoría
- API: `AuditTrailService` registra actor, acción, recurso y metadata.
- Worker: eventos `audit.reconciliation.failed` y `audit.reconciliation.dead-letter`.

## Instrumentación de eventos de negocio
- API publica eventos `legacy.shifts.synced`, `payment.preference.created` y otros vía `BusinessEventsService`.
- Worker emite `business.event.reconciliation.started/completed` con latencia.
