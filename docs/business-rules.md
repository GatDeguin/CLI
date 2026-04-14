# Business Rules

## Catálogo BR
| BR | Definición | Implementación actual |
|---|---|---|
| BR-01 | Mostrar precio en perfil PARTICULAR | `RuleCode.PriceVisibility` |
| BR-02 | Requerir copago en perfil COPAY | `RuleCode.CopayRequired` |
| BR-03 | Bloquear reserva con >=3 turnos activos | `RuleCode.AppointmentLimit` |
| BR-04 | Bloquear cancelación si faltan <1 día | `RuleCode.CancellationWindow` |
| BR-05 | Bloquear reprogramación si faltan <2 días | `RuleCode.RescheduleWindow` |
| BR-06 | Publicar docs para perfiles/tipos elegibles | `RuleCode.DocumentPublication` |
| BR-07 | Ignorar webhook duplicado por eventKey | `processedWebhookEvents` |
| BR-08 | Rechazar webhook con firma inválida | `isValidSignature` |
| BR-13 | Si pago no se acredita (rechazado/devuelto/error), anular turno y dejar trazabilidad inequívoca | `PaymentsService.syncAppointmentStatus` + `paymentEvent`/`auditLog` |
| BR-14 | En error o reintento, registrar motivo/evidencia y marcar conciliado/no conciliado para tesorería | `PaymentsService.registerBrErrorPath/registerBrRetryPath` + reconciliación diaria |

## Evaluación
Orden por prioridad ascendente, solo reglas habilitadas.

## Datos de contexto mínimos
`profile`, `activeAppointments`, `daysUntilAppointment`, `documentType`.

## Evidencia de cumplimiento
- Logs de eventos y auditoría con correlation-id.
- Resultado de evaluación del RulesEngine por solicitud.
