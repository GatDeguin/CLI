# Known Gaps and External Dependencies

## Gaps técnicos actuales
- Múltiples módulos API están como esqueleto sin controllers/DTOs.
- No existe suite automatizada de tests de negocio en repositorio.
- Falta modelado explícito de consentimientos y políticas de privacidad.
- Endpoints públicos definidos en documentación aún no materializados en código.

## Dependencias externas
- Mercado Pago (checkout/webhooks).
- Legacy scheduling API.
- LIS y RIS/PACS.
- Proveedor de mensajería.
- Infra de Redis/PostgreSQL.

## Riesgos
- Cambios de contrato en terceros sin versionado.
- Degradación por timeout en cadenas de integración.
- Brecha de trazabilidad si falta propagación de correlation-id.

## Mitigaciones
- Contract tests y mocks pactados.
- Circuit breaker + retry + DLQ.
- Runbook de incidentes + alertas SLO.
