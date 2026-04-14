# Security

## Objetivos
Confidencialidad, integridad, disponibilidad y trazabilidad de datos de salud.

## Controles por capa
- **Identidad**: autenticación fuerte + OTP.
- **Autorización**: RBAC admin + control por titular activo en app.
- **API**: validación de payloads, rate limiting, firma webhook PSP.
- **Datos**: cifrado en reposo y tránsito, secretos por env manager.
- **Auditoría**: registro de actor/acción/recurso/correlation-id.

## Amenazas prioritarias
- Toma de cuenta por OTP débil.
- Replay de webhook.
- Exposición de documentos sin autorización.
- Escalada de privilegios en backoffice.

## Mapeo RNF
- RNF-03 trazabilidad.
- RNF-04 seguridad y segregación.
- RNF-01 disponibilidad (resiliencia operativa).
