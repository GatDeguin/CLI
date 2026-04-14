-- Initial domain schema for appointment + coverage + billing workflows
CREATE TYPE profile_type AS ENUM ('PARTICULAR','TOTAL_COVERAGE','COPAY','PENDING_COVERAGE','TUTOR_DEPENDENT');
CREATE TYPE coverage_status AS ENUM ('ACTIVE','PENDING','EXPIRED','SUSPENDED');
CREATE TYPE appointment_status AS ENUM ('REQUESTED','CONFIRMED','CANCELLED','RESCHEDULED','COMPLETED','NO_SHOW');
CREATE TYPE payment_status AS ENUM ('PENDING','APPROVED','DECLINED','REFUNDED');
CREATE TYPE notification_channel AS ENUM ('PUSH','EMAIL','SMS','WHATSAPP');
CREATE TYPE notification_status AS ENUM ('QUEUED','SENT','FAILED','READ');

CREATE TABLE app_user (
  id TEXT PRIMARY KEY,
  email TEXT NOT NULL UNIQUE,
  dni TEXT NOT NULL UNIQUE,
  full_name TEXT NOT NULL,
  profile profile_type NOT NULL,
  is_tutor BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE patient (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES app_user(id),
  dependent_of_user_id TEXT REFERENCES app_user(id),
  dni TEXT NOT NULL UNIQUE,
  full_name TEXT NOT NULL,
  birth_date DATE NOT NULL,
  phone TEXT,
  email TEXT,
  active_coverage_id TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX idx_patient_user ON patient(user_id);
CREATE INDEX idx_patient_dependent ON patient(dependent_of_user_id);

CREATE TABLE coverage_plan (
  id TEXT PRIMARY KEY,
  code TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  includes_copay BOOLEAN NOT NULL DEFAULT FALSE,
  valid_from TIMESTAMPTZ NOT NULL,
  valid_to TIMESTAMPTZ
);
CREATE INDEX idx_coverage_plan_validity ON coverage_plan(valid_from, valid_to);

CREATE TABLE coverage (
  id TEXT PRIMARY KEY,
  patient_id TEXT NOT NULL REFERENCES patient(id),
  plan_id TEXT NOT NULL REFERENCES coverage_plan(id),
  member_number TEXT NOT NULL,
  status coverage_status NOT NULL,
  valid_from TIMESTAMPTZ NOT NULL,
  valid_to TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(patient_id, plan_id, member_number),
  CHECK (valid_to IS NULL OR valid_to >= valid_from)
);
CREATE INDEX idx_coverage_patient_status ON coverage(patient_id, status);
CREATE INDEX idx_coverage_validity ON coverage(valid_from, valid_to);

CREATE TABLE specialty (
  id TEXT PRIMARY KEY,
  code TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL
);

CREATE TABLE professional (
  id TEXT PRIMARY KEY,
  license_number TEXT NOT NULL UNIQUE,
  full_name TEXT NOT NULL
);

CREATE TABLE _professional_specialties (
  "A" TEXT NOT NULL REFERENCES professional(id) ON DELETE CASCADE,
  "B" TEXT NOT NULL REFERENCES specialty(id) ON DELETE CASCADE,
  PRIMARY KEY ("A", "B")
);

CREATE TABLE site (
  id TEXT PRIMARY KEY,
  code TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  address TEXT NOT NULL
);

CREATE TABLE agenda (
  id TEXT PRIMARY KEY,
  professional_id TEXT NOT NULL REFERENCES professional(id),
  site_id TEXT NOT NULL REFERENCES site(id),
  valid_from TIMESTAMPTZ NOT NULL,
  valid_to TIMESTAMPTZ,
  CHECK (valid_to IS NULL OR valid_to >= valid_from)
);
CREATE INDEX idx_agenda_prof_site ON agenda(professional_id, site_id);
CREATE INDEX idx_agenda_validity ON agenda(valid_from, valid_to);

CREATE TABLE slot (
  id TEXT PRIMARY KEY,
  agenda_id TEXT NOT NULL REFERENCES agenda(id),
  starts_at TIMESTAMPTZ NOT NULL,
  ends_at TIMESTAMPTZ NOT NULL,
  is_available BOOLEAN NOT NULL DEFAULT TRUE,
  UNIQUE(agenda_id, starts_at),
  CHECK (ends_at > starts_at)
);
CREATE INDEX idx_slot_range ON slot(starts_at, ends_at);

CREATE TABLE appointment (
  id TEXT PRIMARY KEY,
  patient_id TEXT NOT NULL REFERENCES patient(id),
  slot_id TEXT NOT NULL UNIQUE REFERENCES slot(id),
  status appointment_status NOT NULL,
  reason TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX idx_appointment_patient_status ON appointment(patient_id, status);

CREATE TABLE payment (
  id TEXT PRIMARY KEY,
  patient_id TEXT NOT NULL REFERENCES patient(id),
  appointment_id TEXT,
  amount NUMERIC(10,2) NOT NULL,
  currency TEXT NOT NULL DEFAULT 'ARS',
  status payment_status NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CHECK (amount >= 0)
);
CREATE INDEX idx_payment_patient_status ON payment(patient_id, status);

CREATE TABLE document (
  id TEXT PRIMARY KEY,
  patient_id TEXT NOT NULL REFERENCES patient(id),
  appointment_id TEXT,
  type TEXT NOT NULL,
  url TEXT NOT NULL,
  published_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX idx_document_patient_type ON document(patient_id, type);

CREATE TABLE notification (
  id TEXT PRIMARY KEY,
  patient_id TEXT NOT NULL REFERENCES patient(id),
  channel notification_channel NOT NULL,
  status notification_status NOT NULL,
  title TEXT NOT NULL,
  body TEXT NOT NULL,
  scheduled_at TIMESTAMPTZ,
  sent_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX idx_notification_patient_status ON notification(patient_id, status);

CREATE TABLE audit_log (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES app_user(id),
  action TEXT NOT NULL,
  entity TEXT NOT NULL,
  entity_id TEXT NOT NULL,
  payload JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX idx_audit_entity ON audit_log(entity, entity_id);
CREATE INDEX idx_audit_created ON audit_log(created_at);
