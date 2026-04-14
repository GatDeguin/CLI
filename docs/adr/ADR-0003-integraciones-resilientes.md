# ADR-0003: Integraciones resilientes con retry-timeout-dlq

## Estado
Aceptado.

## Contexto
Dependencias externas con latencia y fallas intermitentes.

## Decisión
Usar política común: retry exponencial, timeout por request y dead-letter para errores terminales.

## Consecuencias
- + Mayor disponibilidad percibida.
- + Recuperación operable con DLQ.
- - Mayor complejidad observabilidad/replay.
