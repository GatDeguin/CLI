# Roles and Permissions

## Portal Paciente
- Titular: acceso total a sus datos + dependientes autorizados.
- Dependiente: acceso acotado (según tutor).

## Admin Web (RBAC)
| Rol | Módulos habilitados |
|---|---|
| SuperAdmin | Todos |
| Operaciones | profesionales, agendas, coberturas, turnos/incidencias, reportes |
| Finanzas | precios/copagos, pagos/reembolsos, reportes |
| Auditoría | auditoría, reportes, documentos |
| Documentación | documentos, turnos/incidencias, reportes |

## Matriz de permisos clave
| Acción | Rol mínimo |
|---|---|
| Ver/editar reglas globales | SuperAdmin |
| Ejecutar reembolso | Finanzas |
| Ver trazas de auditoría | Auditoría |
| Publicar documento clínico | Documentación |

## Controles
- Autorización por módulo + acción.
- Trazabilidad de mutaciones en AuditLog.
- Segregación de datos por paciente/titular activo.
