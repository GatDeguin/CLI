# CI

Pipelines de integración continua.


## Variables de entorno críticas (API)
Para evitar fallos en runtime, el pipeline/deploy debe inyectar las variables requeridas por el bootstrap fail-fast de `@services/api`:

- `DATABASE_URL`
- `REDIS_URL`
- `JWT_ACCESS_SECRET`
- `JWT_REFRESH_SECRET`
- `LEGACY_API_URL` y `LEGACY_API_KEY`
- `LAB_API_URL` y `LAB_API_KEY`
- `RIS_PACS_API_URL` y `RIS_PACS_API_KEY`

> Convención unificada para endpoints de integraciones: `*_API_URL` (no `*_API_BASE_URL`).
