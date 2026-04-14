# Branding y Design System

Este documento define la base visual y de interacción para `apps/patient-mobile` y `apps/admin-web`, manteniendo coherencia institucional con Clínica y preparando reemplazo de assets oficiales sin refactor.

## 1) Principios de marca

- **Sobrio sanitario**: prioridad en legibilidad y claridad clínica.
- **Confiable**: tono visual institucional, sin patrones de "marketplace".
- **Consistente multi-canal**: mobile-first para pacientes, desktop-first para operación.
- **Accesible por defecto**: contraste AA, tamaños táctiles mínimos y jerarquía textual clara (`RNF-011`).

## 2) Activos y reemplazo controlado

- Los logos y recursos institucionales se inyectan desde carpeta de assets por aplicación.
- El diseño se apoya en tokens para evitar hardcode de estilos en componentes.
- Si la clínica entrega nuevo manual de marca, se actualizan tokens y assets, no la lógica de pantallas.

## 3) Design tokens (base)

| Token | Valor | Uso |
|---|---|---|
| `color.primary.600` | `#0B5FA5` | CTA principal, links clave |
| `color.primary.700` | `#084D86` | Hover/pressed CTA |
| `color.neutral.900` | `#10243E` | Titulares y texto crítico |
| `color.neutral.700` | `#3F4F63` | Texto secundario |
| `color.neutral.100` | `#EEF2F6` | Bordes y divisores |
| `color.surface` | `#FFFFFF` | Fondo de cards |
| `color.background` | `#F7F9FC` | Fondo general |
| `color.success` | `#0F8A4B` | Estados aprobados |
| `color.warning` | `#B7791F` | Pendientes/atención |
| `color.error` | `#C53030` | Rechazos/errores |

### Tipografía

- Preferida: tipografía institucional (si está disponible en licenciamiento clínico).
- Fallback: `Inter` / `System UI`.
- Escala recomendada:
  - `heading-xl` 28/36
  - `heading-lg` 22/30
  - `heading-md` 18/26
  - `body-md` 16/24
  - `body-sm` 14/20
  - `caption` 12/16

### Espaciado y radios

- Base spacing: múltiplos de 4 (`4, 8, 12, 16, 20, 24, 32`).
- Radius: `8` (inputs), `12` (cards), `16` (modales).
- Elevación discreta para superficies operativas.

## 4) Componentes núcleo

Reutilizar y extender en `packages/ui`:

- `Button` (primary/secondary/ghost/destructive)
- `Input` + feedback de validación
- `Select`/`Autocomplete` para cartilla y filtros
- `StatusBadge` para estados de turno/pago/cobertura/documento
- `DataTable` en panel admin con filtros persistentes
- `Timeline` para auditoría e historial
- `Card` para home y resumen de turno

## 5) Microcopy (es-AR)

- Lenguaje directo y calmado, sin tecnicismos innecesarios.
- Nunca incluir datos clínicos sensibles en push/lock screen (`BR-11`, `RNF-012`).
- Formatos:
  - Fecha: `dd/MM/yyyy`
  - Hora: `HH:mm`
  - Moneda: `ARS` con locale `es-AR`

## 6) Accesibilidad mínima obligatoria

- Contraste mínimo AA en texto y controles (`RNF-011`).
- Tamaño táctil mínimo 44x44 px en mobile.
- Labels y ayudas para lectores de pantalla.
- Feedback no dependiente solo de color (ícono + texto).
- Gestión visible de errores en formularios (OTP, cobertura, pagos).

## 7) Mapeo a pantallas críticas

- `SC-07 Home`: cards de próximos turnos, resultados y pagos pendientes en prioridad visual.
- `SC-15 Resumen del turno`: destacar reglas económicas según perfil (`BR-01` a `BR-04`).
- `SC-16 Pago`: estado y mensaje inequívoco de aprobación/rechazo (`BR-13`).
- `SC-20/21 Resultados`: separación entre preview y descarga segura (`RF-047`, `RF-049`, `RF-054`).
- `SC-29 Notificaciones`: copy no sensible y controles de preferencia.

## 8) Gobierno de diseño

- Toda nueva pantalla debe declarar IDs funcionales (`SC-*`) y requerimientos trazados (`RF-*`, `BR-*`, `RNF-*`).
- Cambios de tokens requieren registro en ADR si alteran experiencia global.
- El panel admin prioriza densidad informativa; la app móvil prioriza claridad de acción.
