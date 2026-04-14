# Architecture

## Vista de alto nivel
Monorepo con arquitectura modular:
- `apps/patient-mobile`: front mobile (Expo/React Native).
- `apps/admin-web`: front web (Next.js app router).
- `services/api`: backend NestJS modular.
- `services/worker`: procesamiento asíncrono BullMQ (conciliación).
- `packages/*`: utilidades y shared packages.

## Componentes backend
- **IdentityModule**: registro/login/OTP (target, endpoints en este documento).
- **PatientModule**: perfil, grupo familiar, credencial.
- **CoverageModule**: cobertura activa y planes.
- **DirectoryModule**: cartilla, profesionales, sedes.
- **SchedulingModule**: agendas, slots, turnos.
- **PaymentsModule**: checkout preference + webhook PSP.
- **DocumentsModule**: resultados/documentos.
- **NotificationsModule**: push/email/sms/whatsapp.
- **IntegrationsModule**: adapters externos con política de resiliencia.
- **RulesModule**: motor de reglas BR.
- **AuditModule/AdminModule**: gobierno y operación.

## Endpoints (target API pública)
| Dominio | Endpoint | Método | RF/BR |
|---|---|---|---|
| Auth | `/v1/auth/register` | POST | RF-01 |
| Auth | `/v1/auth/otp/verify` | POST | RF-01 |
| Auth | `/v1/auth/login` | POST | RF-02 |
| Paciente | `/v1/patients/me` | GET/PUT | RF-03 |
| Familia | `/v1/patients/me/family` | GET/POST | RF-03 |
| Cartilla | `/v1/directory/specialties` | GET | RF-04 |
| Cartilla | `/v1/directory/professionals` | GET | RF-04 |
| Scheduling | `/v1/scheduling/slots` | GET | RF-05 |
| Scheduling | `/v1/scheduling/appointments` | POST | RF-05, BR-03 |
| Scheduling | `/v1/scheduling/appointments/:id/reschedule` | POST | RF-07, BR-05 |
| Scheduling | `/v1/scheduling/appointments/:id/cancel` | POST | RF-07, BR-04 |
| Payments | `/v1/payments/preferences` | POST | RF-06 |
| Payments | `/v1/payments/webhooks/mercadopago` | POST | BR-07, BR-08 |
| Documents | `/v1/documents` | GET | RF-09, BR-06 |
| Results | `/v1/results` | GET | RF-09 |
| Notifications | `/v1/notifications/preferences` | GET/PUT | RF-10 |

## Endpoints externos ya modelados en adapters
| Sistema | Endpoint externo | Método | Uso |
|---|---|---|---|
| Legacy Scheduling | `/api/v1/shifts?date=...` | GET | Sync de turnos legados |
| Laboratory (LIS) | `/api/v1/orders` | POST | Crear orden laboratorio |
| RIS/PACS | `/api/v1/studies` | POST | Registrar estudio imágenes |

## Entidades de dominio (Prisma)
AppUser, Patient, CoveragePlan, Coverage, Specialty, Professional, Site, Agenda, Slot, Appointment, Payment, Document, Notification, AuditLog.

## Mapeo explícito RF/BR/RNF/SC → módulos/pantallas/endpoints/entidades/pruebas
Ver `docs/traceability-matrix.md` (matriz consolidada).
