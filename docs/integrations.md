# Integrations

## Sistemas externos
- Legacy scheduling.
- LIS (laboratorio).
- RIS/PACS (imágenes).
- Proveedor de mensajería (OTP/email/push).
- PSP (Mercado Pago).

## Contratos modelados
| Integración | Método | Ruta |
|---|---|---|
| Legacy shifts | GET | `/api/v1/shifts?date=` |
| Lab orders | POST | `/api/v1/orders` |
| Imaging studies | POST | `/api/v1/studies` |

## Resiliencia
- Retry exponencial: 4 intentos (300ms inicial, x2, max 15s).
- Timeout request: 8s.
- Dead-letter lógico: `integration-dlq`.
- Correlation-id propagado vía header `x-correlation-id`.

## Auditoría y eventos
- Eventos de negocio: `legacy.shifts.synced`, `payment.preference.created`.
- Auditoría de operaciones críticas (ej. lab-order).
