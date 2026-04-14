# Operations Runbook

## Monitoreo diario
1. Salud API (latencia/errores).
2. Cola de conciliación y DLQ.
3. Integraciones externas (timeouts/retries).
4. Entrega de notificaciones.
5. Auditoría de eventos críticos.

## Incidentes frecuentes
### PSP webhook con rechazo masivo
- Verificar secreto de firma.
- Revisar BR-08 y reloj del sistema.
- Reprocesar eventos válidos.

### Backlog en conciliación
- Inspeccionar `payments-reconciliation` y `payments-reconciliation-dlq`.
- Escalar workers temporalmente.
- Ejecutar replay controlado.

### Caída de integración externa
- Activar modo degradado (sincronización diferida).
- Forzar reintentos manuales.
- Comunicar impacto en SC-32 Estado de servicios.

## Checks operativos
- Métricas de disponibilidad RNF-01.
- Tasa de error por endpoint.
- Edad de mensaje más antiguo en DLQ.
