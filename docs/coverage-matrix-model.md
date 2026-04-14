# Coverage Matrix Model

Modelo para cubrir trazabilidad completa en 5 ejes:
1. Requisito (RF/BR/RNF)
2. Experiencia (SC + módulo/pantalla)
3. Contrato técnico (endpoint)
4. Datos (entidades)
5. Verificación (pruebas)

## Estructura recomendada
| Req ID | Tipo | Pantallas SC | Módulo | Endpoint(s) | Entidades | Casos de prueba |
|---|---|---|---|---|---|---|
| RF-05 | Funcional | SC-08,SC-09 | Scheduling | `GET/POST /v1/scheduling/*` | Agenda, Slot, Appointment | TC-RF-05-01..n |

## Convenciones
- IDs únicos: RF-XX, BR-XX, RNF-XX, SC-XX, TC-<ID>-NN.
- Si un requisito no tiene endpoint o test: estado **GAP**.
- Cobertura mínima objetivo: 100% RF/BR y >90% RNF en pruebas automáticas.

## Fuente canónica
`docs/traceability-matrix.md`.
