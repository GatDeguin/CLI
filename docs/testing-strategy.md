# Testing Strategy

## Pirámide
- Unit tests: rules engine, adapters, servicios de pagos.
- Integration tests: API + DB + Redis + mocks externos.
- E2E: flujos SC críticos (registro, reserva, pago, documentos).
- Non-functional: carga, resiliencia, seguridad.

## Suite por requisito
| Requisito | Casos propuestos |
|---|---|
| RF-01 | TC-RF-01-01 registro válido, TC-RF-01-02 OTP inválido |
| RF-05 | TC-RF-05-01 slot disponible, TC-RF-05-02 slot tomado |
| RF-06 | TC-RF-06-01 pago aprobado, TC-RF-06-02 fallback PSP |
| BR-07 | TC-BR-07-01 webhook duplicado no duplica efecto |
| BR-08 | TC-BR-08-01 firma inválida rechazada |
| RNF-02 | TC-RNF-02-01 timeout a 8s + retry exponencial |
| RNF-05 | TC-RNF-05-01 job falla→DLQ |

## Criterios de salida
- 100% RF/BR con al menos 1 test automatizado.
- 0 defectos bloqueantes en UAT.
- Tendencia de error < umbral acordado.
