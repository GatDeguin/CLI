# Traceability Matrix

> Matriz explícita RF-*, BR-*, RNF-*, SC-* hacia módulos/pantallas/endpoints/entidades/pruebas.

| ID | Tipo | Módulo/Pantalla | Endpoint(s) | Entidades | Pruebas |
|---|---|---|---|---|---|
| RF-01 | Funcional | Identity / SC-02, SC-03 | `POST /v1/auth/register`, `POST /v1/auth/otp/verify` | AppUser, Patient | TC-RF-01-01, TC-RF-01-02 |
| RF-02 | Funcional | Identity / SC-04 | `POST /v1/auth/login` | AppUser | TC-RF-02-01 |
| RF-03 | Funcional | Patient / SC-23, SC-27, SC-28, SC-29 | `GET/PUT /v1/patients/me`, `GET/POST /v1/patients/me/family` | Patient, AppUser | TC-RF-03-01 |
| RF-04 | Funcional | Directory / SC-06, SC-16 | `GET /v1/directory/specialties`, `GET /v1/directory/professionals` | Specialty, Professional, Site | TC-RF-04-01 |
| RF-05 | Funcional | Scheduling / SC-07, SC-08, SC-09 | `GET /v1/scheduling/slots`, `POST /v1/scheduling/appointments` | Agenda, Slot, Appointment | TC-RF-05-01, TC-RF-05-02 |
| RF-06 | Funcional | Payments / SC-10 | `POST /v1/payments/preferences` | Payment, Appointment | TC-RF-06-01 |
| RF-07 | Funcional | Scheduling / SC-14, SC-15 | `POST /v1/scheduling/appointments/:id/reschedule`, `POST /v1/scheduling/appointments/:id/cancel` | Appointment | TC-RF-07-01 |
| RF-08 | Funcional | Scheduling / SC-12, SC-13 | `GET /v1/scheduling/appointments` | Appointment | TC-RF-08-01 |
| RF-09 | Funcional | Documents / SC-19, SC-20, SC-21, SC-22 | `GET /v1/results`, `GET /v1/documents` | Document | TC-RF-09-01 |
| RF-10 | Funcional | Notifications / SC-26 | `GET/PUT /v1/notifications/preferences` | Notification | TC-RF-10-01 |
| RF-11 | Funcional | Admin Web módulos RBAC | `/v1/admin/*` | AuditLog, Coverage, Payment | TC-RF-11-01 |
| RF-12 | Funcional | Integrations + Worker | `/v1/integrations/*` + adapters externos | AuditLog | TC-RF-12-01 |
| BR-01 | Regla | Rules / SC-09, SC-10 | `POST /v1/scheduling/appointments` | Coverage, Payment | TC-BR-01-01 |
| BR-02 | Regla | Rules+Payments / SC-10 | `POST /v1/payments/preferences` | Payment | TC-BR-02-01 |
| BR-03 | Regla | Rules+Scheduling / SC-09 | `POST /v1/scheduling/appointments` | Appointment | TC-BR-03-01 |
| BR-04 | Regla | Rules+Scheduling / SC-15 | `POST /v1/scheduling/appointments/:id/cancel` | Appointment | TC-BR-04-01 |
| BR-05 | Regla | Rules+Scheduling / SC-14 | `POST /v1/scheduling/appointments/:id/reschedule` | Appointment | TC-BR-05-01 |
| BR-06 | Regla | Rules+Documents / SC-19, SC-21 | `GET /v1/documents` | Document | TC-BR-06-01 |
| BR-07 | Regla | Payments webhook | `POST /v1/payments/webhooks/mercadopago` | Payment, AuditLog | TC-BR-07-01 |
| BR-08 | Regla | Payments webhook | `POST /v1/payments/webhooks/mercadopago` | Payment, AuditLog | TC-BR-08-01 |
| RNF-01 | No funcional | SC-32 Estado de servicios | `/health`, `/ready`, endpoints críticos | - | TC-RNF-01-01 |
| RNF-02 | No funcional | Integrations/Payments | Adapters + pagos | - | TC-RNF-02-01 |
| RNF-03 | No funcional | Observability | Todos con `x-correlation-id` | AuditLog | TC-RNF-03-01 |
| RNF-04 | No funcional | Security + RBAC | Auth/Admin endpoints | AppUser, AuditLog | TC-RNF-04-01 |
| RNF-05 | No funcional | Worker conciliación | Cola `payments-reconciliation` | Payment | TC-RNF-05-01 |
| RNF-06 | No funcional | Eventos/Logs | eventos de negocio | AuditLog | TC-RNF-06-01 |
| SC-02 | Pantalla | Registro | `POST /v1/auth/register` | AppUser | TC-SC-02-01 |
| SC-03 | Pantalla | OTP | `POST /v1/auth/otp/verify` | AppUser | TC-SC-03-01 |
| SC-04 | Pantalla | Login | `POST /v1/auth/login` | AppUser | TC-SC-04-01 |
| SC-06 | Pantalla | Buscar especialidad | `GET /v1/directory/specialties` | Specialty | TC-SC-06-01 |
| SC-08 | Pantalla | Seleccionar agenda | `GET /v1/scheduling/slots` | Agenda, Slot | TC-SC-08-01 |
| SC-09 | Pantalla | Confirmar reserva | `POST /v1/scheduling/appointments` | Appointment | TC-SC-09-01 |
| SC-10 | Pantalla | Pago copago | `POST /v1/payments/preferences` | Payment | TC-SC-10-01 |
| SC-12 | Pantalla | Mis turnos | `GET /v1/scheduling/appointments` | Appointment | TC-SC-12-01 |
| SC-14 | Pantalla | Reprogramar | `POST /v1/scheduling/appointments/:id/reschedule` | Appointment | TC-SC-14-01 |
| SC-15 | Pantalla | Cancelar | `POST /v1/scheduling/appointments/:id/cancel` | Appointment | TC-SC-15-01 |
| SC-19 | Pantalla | Resultados | `GET /v1/results` | Document | TC-SC-19-01 |
| SC-21 | Pantalla | Documentos | `GET /v1/documents` | Document | TC-SC-21-01 |
| SC-27 | Pantalla | Grupo familiar | `GET/POST /v1/patients/me/family` | Patient | TC-SC-27-01 |
| SC-32 | Pantalla | Estado de servicios | `/health` | - | TC-SC-32-01 |
