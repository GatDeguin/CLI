# Privacy and Consent

## Principios
- Minimización de datos.
- Finalidad explícita.
- Transparencia y revocabilidad.

## Consentimientos
- Uso de datos para operación asistencial.
- Notificaciones por canal (push/email/sms/whatsapp).
- Compartición de documentos.

## Derechos del titular
- Acceso, rectificación, actualización.
- Revocación de consentimiento no obligatorio.
- Trazabilidad de cambios y accesos.

## Endpoints target
- `GET /v1/consents`
- `PUT /v1/consents/:id`
- `GET /v1/privacy/access-log`

## Evidencia
- Eventos de consentimiento versionados.
- AuditLog con actor, timestamp y metadata.
