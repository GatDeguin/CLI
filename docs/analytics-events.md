# Analytics Events

## Eventos de producto (propuestos)
| Evento | Trigger | RF/SC |
|---|---|---|
| `auth_register_started` | abre SC-02 | RF-01, SC-02 |
| `auth_otp_validated` | OTP ok | RF-01, SC-03 |
| `auth_login_success` | login ok | RF-02, SC-04 |
| `booking_search_submitted` | busca especialidad | RF-04, SC-06 |
| `booking_slot_selected` | elige agenda/slot | RF-05, SC-08 |
| `booking_confirmed` | confirma turno | RF-05, SC-09 |
| `copay_payment_approved` | pago aprobado | RF-06, SC-10 |
| `appointment_rescheduled` | reprograma | RF-07, SC-14 |
| `appointment_cancelled` | cancela | RF-07, SC-15 |
| `document_opened` | abre documento | RF-09, SC-21 |

## Eventos técnicos existentes
- `legacy.shifts.synced`
- `payment.preference.created`
- `business.event.reconciliation.started/completed`

## Esquema mínimo
`event_name`, `user_id`, `patient_id`, `screen_id`, `correlation_id`, `timestamp`, `properties{}`.
