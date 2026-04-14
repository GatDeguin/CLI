# Promoción de entornos (dev -> qa -> prod)

## Objetivo
Estandarizar la promoción de versiones con aprobaciones manuales, smoke tests automáticos y rollback controlado.

## Flujo de promoción
1. Generar versión (tag) en `dev` usando pipeline de release.
2. Ejecutar workflow `Promote Environment` con:
   - `from=dev`, `to=qa`, `version=vX.Y.Z`
3. Tras validación funcional en `qa`, ejecutar:
   - `from=qa`, `to=prod`, `version=vX.Y.Z`

El workflow restringe transiciones válidas a `dev -> qa` y `qa -> prod`.

## Aprobaciones
Configurar GitHub Environments con reviewers requeridos:
- `qa`: aprobación de Tech Lead.
- `prod`: aprobación de Tech Lead + Product Owner.

El job `deploy` utiliza `environment: ${{ inputs.to }}` y respeta esas aprobaciones.

## Smoke tests post deploy
Después del deploy, el job `smoke-tests` valida:
- `${HEALTHCHECK_URL}` (API health endpoint)
- `${ADMIN_WEB_URL}` (frontend disponibilidad)

Estas variables deben existir en cada Environment (`qa`, `prod`).

## Rollback
Si falla `smoke-tests` y se informó `rollback_version`, se activa rollback automático.

### Procedimiento operativo recomendado
1. Re-ejecutar workflow con la misma transición y `version=<rollback_version>`.
2. Confirmar estado saludable de API y web.
3. Abrir incidente y registrar RCA.

### Checklist de rollback
- [ ] Identificar versión estable previa.
- [ ] Ejecutar rollback automatizado por workflow.
- [ ] Validar smoke tests.
- [ ] Comunicar restauración al negocio.
- [ ] Documentar causa raíz y acciones preventivas.
