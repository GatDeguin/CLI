# ADR-0002: Motor de reglas de negocio parametrizable

## Estado
Aceptado.

## Contexto
Las reglas BR-01..BR-06 cambian por cobertura y operación.

## Decisión
Centralizar evaluación en RulesEngine con prioridades, condiciones y payload.

## Consecuencias
- + Menor hardcode por flujo.
- + Mejor auditabilidad por regla aplicada.
- - Requiere gobierno de catálogo y versionado.
