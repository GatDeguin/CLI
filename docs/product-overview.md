# Product Overview

## Propósito
Plataforma de salud digital con dos superficies principales:
- **Portal Paciente (mobile)** para registro, autenticación, turnos, pagos de copago, documentos y resultados.
- **Admin Web** para operación, reglas, coberturas, auditoría y reportes.

## Alcance funcional (MVP+)
- Identidad, perfil y grupo familiar.
- Cartilla, agenda, reserva, reprogramación y cancelación de turnos.
- Coberturas, reglas de negocio y cálculo/visibilidad de copagos.
- Pagos online y conciliación.
- Publicación/consulta de documentos clínicos.
- Integraciones con scheduling legado, laboratorio, RIS/PACS y mensajería.
- Observabilidad con correlation-id, eventos de negocio y auditoría.

## Actores
- Paciente titular.
- Integrante de grupo familiar (dependiente).
- Operaciones, Finanzas, Auditoría, Documentación, SuperAdmin.
- Sistemas externos (PSP, LIS, RIS/PACS, legado).

## Catálogo de requisitos
### Requisitos funcionales (RF)
| ID | Descripción |
|---|---|
| RF-01 | Registro de cuenta y validación OTP. |
| RF-02 | Inicio de sesión y sesión activa. |
| RF-03 | Gestión de perfil y grupo familiar. |
| RF-04 | Búsqueda de cartilla (especialidad/profesional/sede). |
| RF-05 | Reserva de turno con selección de agenda y slot. |
| RF-06 | Pago de copago y confirmación de reserva. |
| RF-07 | Reprogramación/cancelación según ventana habilitada. |
| RF-08 | Consulta de turnos e historial. |
| RF-09 | Consulta/publicación de resultados y documentos. |
| RF-10 | Notificaciones transaccionales (OTP, recordatorios, resultados). |
| RF-11 | Operación administrativa con RBAC y reportes. |
| RF-12 | Integraciones y sincronizaciones externas auditables. |

### Reglas de negocio (BR)
| ID | Descripción |
|---|---|
| BR-01 | Visibilidad de precio para perfil particular. |
| BR-02 | Copago obligatorio para perfil COPAY. |
| BR-03 | Límite máximo de turnos activos por paciente. |
| BR-04 | Bloqueo de cancelación con baja antelación. |
| BR-05 | Bloqueo de reprogramación con baja antelación. |
| BR-06 | Publicación de documentos solo para perfiles elegibles y tipos permitidos. |
| BR-07 | Idempotencia de webhook de pagos. |
| BR-08 | Firma válida obligatoria en webhook PSP. |

### Requisitos no funcionales (RNF)
| ID | Descripción |
|---|---|
| RNF-01 | Disponibilidad de canales críticos (turnos/pagos/documentos). |
| RNF-02 | Tiempos de respuesta con timeout/retry en integraciones. |
| RNF-03 | Trazabilidad extremo a extremo con correlation-id. |
| RNF-04 | Seguridad de datos, segregación por rol y auditoría. |
| RNF-05 | Escalabilidad de procesamiento asíncrono para conciliación. |
| RNF-06 | Observabilidad con eventos de negocio y logs estructurados. |

## KPIs sugeridos
- Conversión SC-06→SC-11 (búsqueda a reserva exitosa).
- % pagos aprobados en primer intento.
- % notificaciones entregadas por canal.
- Tiempo medio de publicación de resultados.
- % errores de integración recuperados por retry.
