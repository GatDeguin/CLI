# Information Architecture

## Navegación mobile
Tabs principales: **Inicio, Turnos, Cartilla, Resultados, Mi cuenta**.

### Mapa de pantallas (SC)
- Inicio: SC-01, SC-05, SC-30, SC-32.
- Turnos: SC-06 a SC-15.
- Cartilla: SC-16 a SC-18.
- Resultados: SC-19 a SC-22.
- Mi cuenta: SC-02, SC-03, SC-04, SC-23 a SC-29, SC-31.

## Backoffice web
Módulos: profesionales, agendas, coberturas, precios/copagos, turnos/incidencias, pagos/reembolsos, documentos, auditoría, parámetros globales, reportes.

## Objetos de información
- Persona/identidad: AppUser, Patient.
- Prestación: Specialty, Professional, Site, Agenda, Slot, Appointment.
- Cobranza: Payment.
- Evidencia clínica: Document.
- Comunicación: Notification.
- Gobierno: AuditLog, reglas (RulesEngine).

## Relación pantallas ↔ recursos API
| Pantalla | Endpoint principal | Entidades |
|---|---|---|
| SC-06 Buscar especialidad | `GET /v1/directory/specialties` | Specialty |
| SC-07 Profesional | `GET /v1/directory/professionals` | Professional, Site |
| SC-08 Agenda | `GET /v1/scheduling/slots` | Agenda, Slot |
| SC-09 Confirmar | `POST /v1/scheduling/appointments` | Appointment |
| SC-10 Copago | `POST /v1/payments/preferences` | Payment |
| SC-12 Mis turnos | `GET /v1/scheduling/appointments` | Appointment |
| SC-19 Resultados | `GET /v1/results` | Document |
| SC-21 Documentos | `GET /v1/documents` | Document |
| SC-27 Grupo familiar | `GET/POST /v1/patients/me/family` | Patient |
