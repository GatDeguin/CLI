# Payments

## Alcance
- Generación de preferencia de checkout.
- Recepción de webhook PSP.
- Idempotencia y validación de firma.
- Conciliación asíncrona nocturna (worker).

## API
- `POST /v1/payments/preferences` → crea preferencia.
- `POST /v1/payments/webhooks/mercadopago` → procesa notificación PSP.

## Reglas y riesgos
- BR-02 copago obligatorio según perfil.
- BR-07 deduplicación de webhooks.
- BR-08 firma obligatoria.

## Worker de conciliación
- Cola principal: `payments-reconciliation`.
- DLQ: `payments-reconciliation-dlq`.
- Reintentos: 4, backoff exponencial, timeout 15s.

## Trazabilidad
RF-06, BR-02, BR-07, BR-08, RNF-02, RNF-05, RNF-06.
