# ADR-0004: Pagos con webhook idempotente y validación de firma

## Estado
Aceptado.

## Contexto
Webhooks de PSP pueden repetirse o llegar con firma inválida.

## Decisión
Implementar validación criptográfica y deduplicación por clave de evento.

## Consecuencias
- + Evita doble impacto contable.
- + Reduce fraude/replay.
- - Requiere sincronía de secretos y rotación segura.
