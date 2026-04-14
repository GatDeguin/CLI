# Clínica Privada del Buen Pastor — Plataforma Digital Integral

Monorepo TypeScript con app móvil de pacientes, panel administrativo, API de dominios clínico-operativos, workers de integración y documentación funcional/técnica.

## Estructura

- `apps/patient-mobile`: app móvil React Native + Expo.
- `apps/admin-web`: panel operativo Next.js.
- `services/api`: API NestJS (identidad, cobertura, cartilla, turnos, pagos, documentos, auditoría, integraciones).
- `services/worker`: workers para colas, reintentos y tareas asíncronas.
- `packages/*`: librerías compartidas (types, domain, ui, config, utils, testing).
- `infra/docker`: stack local reproducible (PostgreSQL, Redis, MinIO, observabilidad).
- `docs/*`: documentación de producto, arquitectura, seguridad, operación, UAT y trazabilidad.

## Requisitos

- Node.js 20+
- pnpm 9+
- Docker + Docker Compose

## Arranque local

```bash
pnpm install
cd infra/docker && docker compose up -d
cd /workspace/CLI
pnpm --filter @services/api prisma:generate
pnpm --filter @services/api prisma:migrate
pnpm --filter @services/api prisma:seed
pnpm dev
```

## Variables de entorno

Copiar `.env.example` y completar:

- `DATABASE_URL`
- `REDIS_URL`
- `S3_ENDPOINT`, `S3_ACCESS_KEY`, `S3_SECRET_KEY`, `S3_BUCKET`
- `MERCADO_PAGO_ACCESS_TOKEN`, `MERCADO_PAGO_WEBHOOK_SECRET`
- `OTP_PROVIDER`, `SMTP_URL`, `PUSH_PROVIDER`
- `LEGACY_API_URL`, `LAB_API_URL`, `RIS_PACS_API_URL`

## API core disponible en esta iteración

### Scheduling

- `GET /scheduling/slots`: slots disponibles (agenda real + retenciones activas).
- `POST /scheduling/slots/:slotId/hold`: retención temporal de slot (`BR-05`).
- `GET /scheduling/slots/:slotId/pricing/:profile`: decisión económica por perfil (`BR-01` a `BR-04`).
- `POST /scheduling/bookings`: reserva con validación de política económica y estado inicial por perfil.

### Payments

- `POST /payments/checkout-preference`: creación de preferencia Mercado Pago (`RF-037` a `RF-040`).
- `POST /payments/webhooks/mercado-pago`: webhook idempotente + validación de firma (`BR-13`, `RF-041`).

## Calidad

```bash
pnpm --filter @services/api typecheck
pnpm --filter @services/api test
```

## Estado de integración externa

Las integraciones productivas (sistema legado, laboratorio, RIS/PACS, OTP/SMS y correo transaccional) quedan implementadas con adapters y contratos configurables. Para producción se deben inyectar credenciales, endpoints y webhooks definitivos según `docs/known-gaps-and-external-dependencies.md`.
