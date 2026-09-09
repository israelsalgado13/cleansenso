-- =============================================================================
-- CleanSenso — Script de inicialización para PostgreSQL LOCAL
-- Grupo Consenso Perú — Sistema de gestión de servicios de limpieza
-- Ejecutar con: psql -U postgres -d cleansenso -f init.sql
-- =============================================================================

-- Crear base de datos (ejecutar como superusuario si no existe)
-- CREATE DATABASE cleansenso;

-- ─────────────────────────────────────────────────────────────────────────────
-- EXTENSIONES
-- ─────────────────────────────────────────────────────────────────────────────
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ─────────────────────────────────────────────────────────────────────────────
-- TIPOS ENUMERADOS
-- ─────────────────────────────────────────────────────────────────────────────

DROP TYPE IF EXISTS user_role CASCADE;
CREATE TYPE user_role AS ENUM ('admin', 'supervisor');

DROP TYPE IF EXISTS quote_status CASCADE;
CREATE TYPE quote_status AS ENUM ('borrador', 'enviada', 'aceptada', 'rechazada', 'vencida');

DROP TYPE IF EXISTS client_status CASCADE;
CREATE TYPE client_status AS ENUM ('activo', 'inactivo', 'prospecto');

DROP TYPE IF EXISTS client_type CASCADE;
CREATE TYPE client_type AS ENUM ('empresa', 'persona_natural');

DROP TYPE IF EXISTS doc_type CASCADE;
CREATE TYPE doc_type AS ENUM ('RUC', 'DNI');

DROP TYPE IF EXISTS appointment_status CASCADE;
CREATE TYPE appointment_status AS ENUM ('programada', 'confirmada', 'en_progreso', 'completada', 'cancelada');

DROP TYPE IF EXISTS shift_type CASCADE;
CREATE TYPE shift_type AS ENUM ('mañana', 'tarde');

DROP TYPE IF EXISTS service_status CASCADE;
CREATE TYPE service_status AS ENUM ('activo', 'inactivo', 'en_revision');

DROP TYPE IF EXISTS service_category CASCADE;
CREATE TYPE service_category AS ENUM (
  'limpieza_general', 'limpieza_especializada', 'desinfeccion', 'lavado', 'mantenimiento'
);

DROP TYPE IF EXISTS notification_type CASCADE;
CREATE TYPE notification_type AS ENUM (
  'cita_recordatorio', 'cotizacion_aceptada', 'cotizacion_vencida',
  'conflicto_agenda', 'nuevo_cliente', 'sistema'
);

-- ─────────────────────────────────────────────────────────────────────────────
-- TABLA: user_profiles (reemplaza auth.users de Supabase)
-- ─────────────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS user_profiles (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email         TEXT NOT NULL UNIQUE,
  full_name     TEXT NOT NULL DEFAULT '',
  password_hash TEXT NOT NULL,
  role          user_role NOT NULL DEFAULT 'supervisor',
  avatar_url    TEXT,
  phone         TEXT,
  is_active     BOOLEAN NOT NULL DEFAULT true,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ─────────────────────────────────────────────────────────────────────────────
-- TABLA: clients
-- ─────────────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS clients (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code            TEXT NOT NULL UNIQUE,
  name            TEXT NOT NULL,
  doc_type        doc_type NOT NULL DEFAULT 'RUC',
  doc_number      TEXT NOT NULL,
  client_type     client_type NOT NULL DEFAULT 'empresa',
  district        TEXT NOT NULL DEFAULT '',
  phone           TEXT NOT NULL DEFAULT '',
  email           TEXT NOT NULL DEFAULT '',
  status          client_status NOT NULL DEFAULT 'prospecto',
  contact_name    TEXT NOT NULL DEFAULT '',
  address         TEXT NOT NULL DEFAULT '',
  services_count  INTEGER NOT NULL DEFAULT 0,
  last_service    TEXT,
  created_by      UUID REFERENCES user_profiles(id),
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ─────────────────────────────────────────────────────────────────────────────
-- TABLA: services
-- ─────────────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS services (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code              TEXT NOT NULL UNIQUE,
  name              TEXT NOT NULL,
  description       TEXT NOT NULL DEFAULT '',
  category          service_category NOT NULL DEFAULT 'limpieza_general',
  base_price_m2     NUMERIC(10,2) NOT NULL DEFAULT 0,
  min_surface_m2    NUMERIC(10,2) NOT NULL DEFAULT 1,
  staff_per_100m2   INTEGER NOT NULL DEFAULT 1,
  duration_hours    NUMERIC(5,2) NOT NULL DEFAULT 1,
  status            service_status NOT NULL DEFAULT 'activo',
  includes          TEXT[] NOT NULL DEFAULT '{}',
  created_by        UUID REFERENCES user_profiles(id),
  created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at        TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ─────────────────────────────────────────────────────────────────────────────
-- TABLA: quotes
-- ─────────────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS quotes (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code            TEXT NOT NULL UNIQUE,
  client_id       UUID NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
  service_type    TEXT NOT NULL,
  surface_m2      NUMERIC(10,2) NOT NULL DEFAULT 1,
  staff_count     INTEGER NOT NULL DEFAULT 1,
  district        TEXT NOT NULL DEFAULT '',
  address         TEXT NOT NULL DEFAULT '',
  scheduled_date  DATE NOT NULL,
  valid_days      INTEGER NOT NULL DEFAULT 14,
  expires_at      DATE NOT NULL,
  subtotal        NUMERIC(12,2) NOT NULL DEFAULT 0,
  igv             NUMERIC(12,2) NOT NULL DEFAULT 0,
  total_soles     NUMERIC(12,2) NOT NULL DEFAULT 0,
  status          quote_status NOT NULL DEFAULT 'borrador',
  notes           TEXT,
  created_by      UUID REFERENCES user_profiles(id),
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ─────────────────────────────────────────────────────────────────────────────
-- TABLA: staff_members
-- ─────────────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS staff_members (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name        TEXT NOT NULL,
  specialty   TEXT NOT NULL DEFAULT '',
  phone       TEXT NOT NULL DEFAULT '',
  is_active   BOOLEAN NOT NULL DEFAULT true,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ─────────────────────────────────────────────────────────────────────────────
-- TABLA: appointments
-- ─────────────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS appointments (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code                TEXT NOT NULL UNIQUE,
  client_id           UUID NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
  quote_id            UUID REFERENCES quotes(id),
  service_type        TEXT NOT NULL,
  address             TEXT NOT NULL DEFAULT '',
  district            TEXT NOT NULL DEFAULT '',
  service_date        DATE NOT NULL,
  start_time          TIME NOT NULL,
  end_time            TIME NOT NULL,
  shift               shift_type NOT NULL DEFAULT 'mañana',
  status              appointment_status NOT NULL DEFAULT 'programada',
  service_order_code  TEXT,
  has_conflict        BOOLEAN NOT NULL DEFAULT false,
  notes               TEXT,
  created_by          UUID REFERENCES user_profiles(id),
  created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at          TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ─────────────────────────────────────────────────────────────────────────────
-- TABLA: appointment_staff
-- ─────────────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS appointment_staff (
  appointment_id  UUID NOT NULL REFERENCES appointments(id) ON DELETE CASCADE,
  staff_id        UUID NOT NULL REFERENCES staff_members(id) ON DELETE CASCADE,
  PRIMARY KEY (appointment_id, staff_id)
);

-- ─────────────────────────────────────────────────────────────────────────────
-- TABLA: notifications
-- ─────────────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS notifications (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     UUID NOT NULL REFERENCES user_profiles(id) ON DELETE CASCADE,
  type        notification_type NOT NULL DEFAULT 'sistema',
  title       TEXT NOT NULL,
  message     TEXT NOT NULL,
  is_read     BOOLEAN NOT NULL DEFAULT false,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ─────────────────────────────────────────────────────────────────────────────
-- ÍNDICES
-- ─────────────────────────────────────────────────────────────────────────────
CREATE INDEX IF NOT EXISTS idx_clients_status ON clients(status);
CREATE INDEX IF NOT EXISTS idx_quotes_status ON quotes(status);
CREATE INDEX IF NOT EXISTS idx_quotes_client ON quotes(client_id);
CREATE INDEX IF NOT EXISTS idx_appointments_date ON appointments(service_date);
CREATE INDEX IF NOT EXISTS idx_appointments_status ON appointments(status);
CREATE INDEX IF NOT EXISTS idx_notifications_user ON notifications(user_id);

-- ─────────────────────────────────────────────────────────────────────────────
-- FUNCIÓN: actualizar updated_at automáticamente
-- ─────────────────────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE TRIGGER trg_clients_updated_at
  BEFORE UPDATE ON clients FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE OR REPLACE TRIGGER trg_quotes_updated_at
  BEFORE UPDATE ON quotes FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE OR REPLACE TRIGGER trg_appointments_updated_at
  BEFORE UPDATE ON appointments FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE OR REPLACE TRIGGER trg_services_updated_at
  BEFORE UPDATE ON services FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE OR REPLACE TRIGGER trg_user_profiles_updated_at
  BEFORE UPDATE ON user_profiles FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- ─────────────────────────────────────────────────────────────────────────────
-- DATOS DE PRUEBA
-- ─────────────────────────────────────────────────────────────────────────────
DO $$
DECLARE
  admin_id  UUID := gen_random_uuid();
  super_id  UUID := gen_random_uuid();
  cli_001   UUID := gen_random_uuid();
  cli_002   UUID := gen_random_uuid();
  cli_003   UUID := gen_random_uuid();
  svc_001   UUID := gen_random_uuid();
  svc_002   UUID := gen_random_uuid();
  q_001     UUID := gen_random_uuid();
  q_002     UUID := gen_random_uuid();
  stf_001   UUID := gen_random_uuid();
  stf_002   UUID := gen_random_uuid();
  apt_001   UUID := gen_random_uuid();
BEGIN
  -- Usuarios (contraseñas hasheadas con pgcrypto: Admin2026! y Super2026!)
  INSERT INTO user_profiles (id, email, full_name, password_hash, role, is_active) VALUES
    (admin_id, 'admin@cleansenso.pe', 'Carlos Alvarado', crypt('Admin2026!', gen_salt('bf')), 'admin', true),
    (super_id, 'supervisor@cleansenso.pe', 'María Torres', crypt('Super2026!', gen_salt('bf')), 'supervisor', true)
  ON CONFLICT (email) DO NOTHING;

  -- Clientes
  INSERT INTO clients (id, code, name, doc_type, doc_number, client_type, district, phone, email, status, contact_name, address, services_count, last_service, created_by) VALUES
    (cli_001, 'CLI-001', 'Farmacia Vida Sana S.A.C.', 'RUC', '20512345678', 'empresa', 'Rímac', '+51 987 654 321', 'gerencia@vidasana.pe', 'activo', 'Jorge Pérez Huamán', 'Av. Túpac Amaru 890, Rímac', 5, '01/09/2026', admin_id),
    (cli_002, 'CLI-002', 'Residencial Los Álamos', 'RUC', '20487651234', 'empresa', 'Miraflores', '+51 991 234 567', 'junta@residencialalamos.pe', 'activo', 'Rosa Mendoza Quispe', 'Calle Los Álamos 245, Miraflores', 8, '28/08/2026', admin_id),
    (cli_003, 'CLI-003', 'Clínica San Borja S.A.', 'RUC', '20156789012', 'empresa', 'San Borja', '+51 01 225 8800', 'logistica@clinicasanborja.pe', 'activo', 'Marco Delgado Castillo', 'Av. Guardia Civil 385, San Borja', 12, '04/09/2026', admin_id)
  ON CONFLICT (code) DO NOTHING;

  -- Servicios
  INSERT INTO services (id, code, name, description, category, base_price_m2, min_surface_m2, staff_per_100m2, duration_hours, status, includes, created_by) VALUES
    (svc_001, 'SVC-001', 'Limpieza de Oficinas', 'Servicio completo de limpieza para espacios de trabajo.', 'limpieza_general', 2.50, 20, 1, 3.0, 'activo', ARRAY['Limpieza de pisos', 'Desinfección de baños', 'Limpieza de escritorios'], admin_id),
    (svc_002, 'SVC-002', 'Lavado de Alfombras', 'Lavado profundo con equipos especializados.', 'lavado', 4.50, 10, 1, 2.0, 'activo', ARRAY['Aspirado previo', 'Aplicación de espuma', 'Secado rápido'], admin_id)
  ON CONFLICT (code) DO NOTHING;

  -- Personal
  INSERT INTO staff_members (id, name, specialty, phone, is_active) VALUES
    (stf_001, 'Miguel Quispe', 'Limpieza general', '+51 987 001 001', true),
    (stf_002, 'Ana Flores', 'Lavado especializado', '+51 987 001 002', true)
  ON CONFLICT DO NOTHING;

  -- Cotizaciones
  INSERT INTO quotes (id, code, client_id, service_type, surface_m2, staff_count, district, address, scheduled_date, valid_days, expires_at, subtotal, igv, total_soles, status, created_by) VALUES
    (q_001, 'COT-2026-001', cli_001, 'Limpieza de Oficinas', 320, 3, 'Rímac', 'Av. Túpac Amaru 890', '2026-09-15', 14, '2026-09-29', 720.34, 129.66, 850.00, 'aceptada', admin_id),
    (q_002, 'COT-2026-002', cli_002, 'Lavado de Alfombras', 180, 2, 'Miraflores', 'Calle Los Álamos 245', '2026-09-16', 14, '2026-09-30', 457.63, 82.37, 540.00, 'enviada', admin_id)
  ON CONFLICT (code) DO NOTHING;

  -- Citas
  INSERT INTO appointments (id, code, client_id, quote_id, service_type, address, district, service_date, start_time, end_time, shift, status, service_order_code, has_conflict, created_by) VALUES
    (apt_001, 'CITA-2026-018', cli_001, q_001, 'Limpieza de Oficinas', 'Av. Túpac Amaru 890', 'Rímac', '2026-09-15', '08:00', '12:00', 'mañana', 'confirmada', 'OS-2026-018', false, admin_id)
  ON CONFLICT (code) DO NOTHING;

  -- Notificaciones
  INSERT INTO notifications (user_id, type, title, message, is_read) VALUES
    (admin_id, 'cotizacion_aceptada', 'Cotización aceptada', 'El cliente Farmacia Vida Sana aceptó la cotización COT-2026-001 por S/ 850.', true),
    (super_id, 'nuevo_cliente', 'Nuevo cliente registrado', 'Se registró el cliente Residencial Los Álamos como prospecto.', false)
  ON CONFLICT DO NOTHING;

EXCEPTION
  WHEN OTHERS THEN
    RAISE NOTICE 'Error al insertar datos de prueba: %', SQLERRM;
END $$;
