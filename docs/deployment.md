# Deployment

## Topología
- Front web (Next.js) y mobile (Expo builds).
- API NestJS.
- Worker BullMQ.
- PostgreSQL + Redis.

## Pipeline sugerido
1. Lint + typecheck + tests.
2. Build artefactos.
3. Migraciones Prisma.
4. Deploy canary (API/worker).
5. Smoke tests por RF críticos.
6. Promoción a producción.

## Configuración sensible
- `DATABASE_URL`
- `REDIS_URL`
- `MERCADO_PAGO_WEBHOOK_SECRET`
- credenciales de integraciones (`*_API_KEY`, `*_API_BASE_URL`)

## Estrategia rollback
- Reversión por imagen previa.
- Feature flags para módulos críticos.
- Pausa de webhooks y replay posterior si aplica.
