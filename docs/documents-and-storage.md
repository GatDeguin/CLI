# Documents and Storage

## Tipos
- Resultados de estudios.
- Recetas/órdenes/certificados.

## Modelo de datos
Entidad `Document`:
- `patientId`, `appointmentId`, `type`, `url`, `publishedAt`, `createdAt`.

## Almacenamiento
- URL externa (objeto en storage seguro, firmado para acceso temporal).
- Política de retención por tipo documental.

## Reglas
- BR-06 controla publicación al paciente.

## Endpoints target
- `GET /v1/documents`
- `GET /v1/results`
- `POST /v1/documents` (interno/backoffice para publicación)

## Controles
- Antivirus/malware scanning previo a publicación.
- Cifrado en tránsito y en reposo.
- Auditoría de acceso/descarga/compartición.
