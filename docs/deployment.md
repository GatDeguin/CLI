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
- credenciales de integraciones (`*_API_KEY`, `*_API_URL`)


## Validación de configuración (fail-fast)
- El bootstrap de la API valida configuración crítica al iniciar.
- Si falta una variable requerida o un `*_API_URL` no tiene esquema `http(s)`, el proceso termina inmediatamente con un mensaje explícito.
- Variables críticas actuales: `DATABASE_URL`, `REDIS_URL`, `JWT_ACCESS_SECRET`, `JWT_REFRESH_SECRET`, `LEGACY_API_URL`, `LEGACY_API_KEY`, `LAB_API_URL`, `LAB_API_KEY`, `RIS_PACS_API_URL`, `RIS_PACS_API_KEY`.

## GitHub Pages (admin-web)

### Variables requeridas
`apps/admin-web` usa `NEXT_PUBLIC_API_BASE_URL` para construir las URLs HTTP del panel admin (listado, historial, intervenciones y exportación). Esta variable debe existir en GitHub antes del deploy.

Opciones soportadas:
1. **Repository Variable (preferido):** `Settings → Secrets and variables → Actions → Variables`.
2. **Environment Secret:** en el environment `github-pages`, crear `NEXT_PUBLIC_API_BASE_URL` en `Settings → Environments → github-pages`.

El workflow `.github/workflows/deploy-pages.yml` toma primero `vars.NEXT_PUBLIC_API_BASE_URL` y si no existe usa `secrets.NEXT_PUBLIC_API_BASE_URL`.

### Flujo exacto de publicación en Pages
1. **Trigger**
   - Automático: push a `main`.
   - Manual: `workflow_dispatch` en GitHub Actions.
2. **Build**
   - `pnpm install --frozen-lockfile`
   - `pnpm --filter @apps/admin-web build`
   - El build de Next.js se exporta como sitio estático (`output: 'export'`) en `apps/admin-web/out`.
3. **Export/Artifact**
   - `actions/upload-pages-artifact@v3` publica `apps/admin-web/out` como artifact.
4. **Publish**
   - `actions/deploy-pages@v4` toma el artifact y publica en GitHub Pages.
   - El job usa environment `github-pages` y expone la URL resultante en `steps.deployment.outputs.page_url`.

### Validación post-deploy
1. Abrir la URL publicada por el job `Deploy to GitHub Pages`.
2. Verificar carga de módulos admin y requests de red contra `NEXT_PUBLIC_API_BASE_URL`.
3. Ejecutar smoke tests mínimos (login operador demo + navegación de módulos + exportación CSV).

### Rollback en Pages
GitHub Pages no tiene rollback automático por release tag en este repo; se usa rollback por **redeploy de commit estable**:
1. Identificar el último commit sano en `main` (ejemplo: `git log --oneline`).
2. Revertir el commit problemático o hacer `git revert` del rango afectado.
3. Push a `main` para disparar nuevamente `Deploy Pages`.
4. Confirmar que el nuevo deploy quedó activo en la URL de Pages.

Opcional para incidentes críticos:
- Ejecutar `workflow_dispatch` sobre un branch/hotfix con el contenido ya revertido.
- Mantener un registro de “último commit estable” en el runbook operativo para reducir MTTR.

## Estrategia rollback
- Reversión por imagen previa.
- Feature flags para módulos críticos.
- Pausa de webhooks y replay posterior si aplica.
