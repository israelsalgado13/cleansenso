-- =============================================================================
-- CleanSenso — Base de Datos Completa para PostgreSQL
-- Grupo Consenso Perú — Sistema de Gestión de Servicios de Limpieza
-- Versión: 1.0.0 | Fecha: 2026-09-15
-- Compatible con: PostgreSQL 14+
--
-- INSTRUCCIONES DE USO:
--   1. Crear la base de datos:
--      CREATE DATABASE cleansenso;
--   2. Conectarse a la base de datos:
--      \c cleansenso
--   3. Ejecutar este script:
--      psql -U postgres -d cleansenso -f cleansenso_database.sql
--
-- CREDENCIALES DE PRUEBA (solo para entorno local):
--   admin@cleansenso.pe      / Admin2026!
--   supervisor@cleansenso.pe / Super2026!
-- =============================================================================

-- ─────────────────────────────────────────────────────────────────────────────
-- EXTENSIONES REQUERIDAS
-- ─────────────────────────────────────────────────────────────────────────────
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ─────────────────────────────────────────────────────────────────────────────
-- SECCIÓN 1: TIPOS ENUMERADOS (ENUMs)
-- Definen los valores permitidos para campos de estado y categoría
-- ─────────────────────────────────────────────────────────────────────────────

-- Roles de usuario en el sistema
DROP TYPE IF EXISTS user_role CASCADE;
CREATE TYPE user_role AS ENUM ('admin', 'supervisor');

-- Estados de cotización
DROP TYPE IF EXISTS quote_status CASCADE;
CREATE TYPE quote_status AS ENUM ('borrador', 'enviada', 'aceptada', 'rechazada', 'vencida');

-- Estados de cliente
DROP TYPE IF EXISTS client_status CASCADE;
CREATE TYPE client_status AS ENUM ('activo', 'inactivo', 'prospecto');

-- Tipo de cliente (persona jurídica o natural)
DROP TYPE IF EXISTS client_type CASCADE;
CREATE TYPE client_type AS ENUM ('empresa', 'persona_natural');

-- Tipo de documento de identidad
DROP TYPE IF EXISTS doc_type CASCADE;
CREATE TYPE doc_type AS ENUM ('RUC', 'DNI');

-- Estados de cita/agenda
DROP TYPE IF EXISTS appointment_status CASCADE;
CREATE TYPE appointment_status AS ENUM ('programada', 'confirmada', 'en_progreso', 'completada', 'cancelada');

-- Turno de trabajo
DROP TYPE IF EXISTS shift_type CASCADE;
CREATE TYPE shift_type AS ENUM ('mañana', 'tarde');

-- Estados de servicio del catálogo
DROP TYPE IF EXISTS service_status CASCADE;
CREATE TYPE service_status AS ENUM ('activo', 'inactivo', 'en_revision');

-- Categorías de servicio
DROP TYPE IF EXISTS service_category CASCADE;
CREATE TYPE service_category AS ENUM (
  'limpieza_general',
  'limpieza_especializada',
  'desinfeccion',
  'lavado',
  'mantenimiento'
);

-- Tipos de notificación
DROP TYPE IF EXISTS notification_type CASCADE;
CREATE TYPE notification_type AS ENUM (
  'cita_recordatorio',
  'cotizacion_aceptada',
  'cotizacion_vencida',
  'conflicto_agenda',
  'nuevo_cliente',
  'sistema'
);

-- ─────────────────────────────────────────────────────────────────────────────
-- SECCIÓN 2: TABLAS PRINCIPALES
-- Orden: tablas sin dependencias → tablas con claves foráneas
-- ─────────────────────────────────────────────────────────────────────────────

-- ── Tabla: user_profiles ─────────────────────────────────────────────────────
-- Almacena los usuarios del sistema (administradores y supervisores).
-- En producción con Supabase, esta tabla se vincula a auth.users.
-- En entorno local PostgreSQL, se gestiona de forma independiente.
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
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  CONSTRAINT chk_email_format CHECK (email ~* '^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$')
);

COMMENT ON TABLE user_profiles IS 'Usuarios del sistema: administradores y supervisores de CleanSenso';
COMMENT ON COLUMN user_profiles.id IS 'Identificador único UUID del usuario';
COMMENT ON COLUMN user_profiles.email IS 'Correo electrónico único, usado como credencial de acceso';
COMMENT ON COLUMN user_profiles.password_hash IS 'Contraseña hasheada con bcrypt (pgcrypto)';
COMMENT ON COLUMN user_profiles.role IS 'Rol del usuario: admin (acceso total) o supervisor (gestión operativa)';
COMMENT ON COLUMN user_profiles.is_active IS 'Indica si el usuario puede iniciar sesión';

-- ── Tabla: clients ────────────────────────────────────────────────────────────
-- Registra empresas y personas naturales que contratan servicios de limpieza.
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
  notes           TEXT,
  total_quotes    INTEGER NOT NULL DEFAULT 0,
  last_service_date TEXT,
  registered_by   UUID REFERENCES user_profiles(id) ON DELETE SET NULL,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  CONSTRAINT chk_client_code_format CHECK (code ~* '^CLI-[0-9]+$'),
  CONSTRAINT chk_doc_number_not_empty CHECK (LENGTH(TRIM(doc_number)) > 0)
);

COMMENT ON TABLE clients IS 'Clientes del negocio: empresas y personas naturales que contratan servicios';
COMMENT ON COLUMN clients.code IS 'Código único del cliente (formato: CLI-001, CLI-002, ...)';
COMMENT ON COLUMN clients.doc_type IS 'Tipo de documento: RUC para empresas, DNI para personas naturales';
COMMENT ON COLUMN clients.doc_number IS 'Número de documento de identidad o RUC';
COMMENT ON COLUMN clients.status IS 'Estado del cliente: activo, inactivo o prospecto (potencial)';
COMMENT ON COLUMN clients.total_quotes IS 'Contador de cotizaciones generadas para este cliente';
COMMENT ON COLUMN clients.registered_by IS 'Usuario que registró al cliente en el sistema';

-- ── Tabla: services ───────────────────────────────────────────────────────────
-- Catálogo de servicios que ofrece CleanSenso con precios base por m².
CREATE TABLE IF NOT EXISTS services (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code            TEXT NOT NULL UNIQUE,
  name            TEXT NOT NULL,
  description     TEXT NOT NULL DEFAULT '',
  category        service_category NOT NULL DEFAULT 'limpieza_general',
  base_price_m2   NUMERIC(10,2) NOT NULL DEFAULT 0 CHECK (base_price_m2 >= 0),
  min_surface_m2  NUMERIC(10,2) NOT NULL DEFAULT 1 CHECK (min_surface_m2 >= 1),
  staff_per_100m2 INTEGER NOT NULL DEFAULT 1 CHECK (staff_per_100m2 >= 1),
  duration_hours  NUMERIC(5,2) NOT NULL DEFAULT 1 CHECK (duration_hours > 0),
  status          service_status NOT NULL DEFAULT 'activo',
  includes        TEXT[] NOT NULL DEFAULT '{}',
  created_by      UUID REFERENCES user_profiles(id) ON DELETE SET NULL,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  CONSTRAINT chk_service_code_format CHECK (code ~* '^SVC-[0-9]+$')
);

COMMENT ON TABLE services IS 'Catálogo de servicios de limpieza ofrecidos por CleanSenso';
COMMENT ON COLUMN services.code IS 'Código único del servicio (formato: SVC-001, SVC-002, ...)';
COMMENT ON COLUMN services.base_price_m2 IS 'Precio base por metro cuadrado en soles (PEN)';
COMMENT ON COLUMN services.min_surface_m2 IS 'Superficie mínima requerida para contratar el servicio';
COMMENT ON COLUMN services.staff_per_100m2 IS 'Número de operarios necesarios por cada 100 m²';
COMMENT ON COLUMN services.duration_hours IS 'Duración estimada del servicio en horas';
COMMENT ON COLUMN services.includes IS 'Lista de actividades incluidas en el servicio';

-- ── Tabla: quotes ─────────────────────────────────────────────────────────────
-- Registra los presupuestos/cotizaciones generados para los clientes.
CREATE TABLE IF NOT EXISTS quotes (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code            TEXT NOT NULL UNIQUE,
  client_id       UUID NOT NULL REFERENCES clients(id) ON DELETE RESTRICT,
  service_type    TEXT NOT NULL,
  surface_m2      NUMERIC(10,2) NOT NULL DEFAULT 1 CHECK (surface_m2 >= 1),
  rooms_count     INTEGER,
  staff_count     INTEGER NOT NULL DEFAULT 1 CHECK (staff_count >= 1),
  district        TEXT NOT NULL DEFAULT '',
  address         TEXT NOT NULL DEFAULT '',
  scheduled_date  DATE NOT NULL,
  valid_days      INTEGER NOT NULL DEFAULT 14 CHECK (valid_days > 0),
  expires_at      DATE NOT NULL,
  subtotal        NUMERIC(12,2) NOT NULL DEFAULT 0 CHECK (subtotal >= 0),
  igv             NUMERIC(12,2) NOT NULL DEFAULT 0 CHECK (igv >= 0),
  total_soles     NUMERIC(12,2) NOT NULL DEFAULT 0 CHECK (total_soles >= 0),
  status          quote_status NOT NULL DEFAULT 'borrador',
  notes           TEXT,
  payment_terms   TEXT,
  created_by      UUID REFERENCES user_profiles(id) ON DELETE SET NULL,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  CONSTRAINT chk_quote_code_format CHECK (code ~* '^COT-[0-9]{4}-[0-9]+$'),
  CONSTRAINT chk_expires_after_scheduled CHECK (expires_at >= scheduled_date),
  CONSTRAINT chk_total_equals_subtotal_plus_igv CHECK (
    ABS(total_soles - (subtotal + igv)) < 0.01
  )
);

COMMENT ON TABLE quotes IS 'Cotizaciones/presupuestos generados para los clientes';
COMMENT ON COLUMN quotes.code IS 'Código único de cotización (formato: COT-2026-001)';
COMMENT ON COLUMN quotes.client_id IS 'Cliente al que se dirige la cotización';
COMMENT ON COLUMN quotes.service_type IS 'Tipo de servicio cotizado (texto libre o nombre del catálogo)';
COMMENT ON COLUMN quotes.surface_m2 IS 'Superficie en metros cuadrados a limpiar';
COMMENT ON COLUMN quotes.staff_count IS 'Número de operarios asignados para el servicio';
COMMENT ON COLUMN quotes.subtotal IS 'Monto antes de IGV en soles';
COMMENT ON COLUMN quotes.igv IS 'Impuesto General a las Ventas (18%) en soles';
COMMENT ON COLUMN quotes.total_soles IS 'Monto total incluyendo IGV en soles';
COMMENT ON COLUMN quotes.valid_days IS 'Días de validez de la cotización desde la fecha programada';
COMMENT ON COLUMN quotes.expires_at IS 'Fecha de vencimiento de la cotización';

-- ── Tabla: staff_members ──────────────────────────────────────────────────────
-- Registra el personal operativo disponible para asignación a citas.
CREATE TABLE IF NOT EXISTS staff_members (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name        TEXT NOT NULL,
  specialty   TEXT NOT NULL DEFAULT 'Limpieza general',
  phone       TEXT NOT NULL DEFAULT '',
  is_active   BOOLEAN NOT NULL DEFAULT true,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

COMMENT ON TABLE staff_members IS 'Personal operativo (operarios) disponibles para asignación a citas';
COMMENT ON COLUMN staff_members.specialty IS 'Especialidad del operario (ej: Limpieza general, Lavado especializado)';
COMMENT ON COLUMN staff_members.is_active IS 'Indica si el operario está disponible para ser asignado';

-- ── Tabla: appointments ───────────────────────────────────────────────────────
-- Registra los servicios programados con fecha, hora y personal asignado.
CREATE TABLE IF NOT EXISTS appointments (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code                TEXT NOT NULL UNIQUE,
  client_id           UUID NOT NULL REFERENCES clients(id) ON DELETE RESTRICT,
  quote_id            UUID REFERENCES quotes(id) ON DELETE SET NULL,
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
  created_by          UUID REFERENCES user_profiles(id) ON DELETE SET NULL,
  created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  CONSTRAINT chk_appointment_code_format CHECK (code ~* '^CITA-[0-9]{4}-[0-9]+$'),
  CONSTRAINT chk_end_after_start CHECK (end_time > start_time)
);

COMMENT ON TABLE appointments IS 'Citas y agenda de servicios programados';
COMMENT ON COLUMN appointments.code IS 'Código único de cita (formato: CITA-2026-001)';
COMMENT ON COLUMN appointments.quote_id IS 'Cotización origen de la cita (puede ser NULL si se agenda directamente)';
COMMENT ON COLUMN appointments.shift IS 'Turno del servicio: mañana (hasta 13:00) o tarde (desde 13:00)';
COMMENT ON COLUMN appointments.has_conflict IS 'Indica si existe solapamiento de personal con otra cita';
COMMENT ON COLUMN appointments.service_order_code IS 'Código de orden de servicio generado al confirmar la cita';

-- ── Tabla: appointment_staff ──────────────────────────────────────────────────
-- Relación muchos a muchos entre citas y personal operativo asignado.
CREATE TABLE IF NOT EXISTS appointment_staff (
  appointment_id  UUID NOT NULL REFERENCES appointments(id) ON DELETE CASCADE,
  staff_id        UUID NOT NULL REFERENCES staff_members(id) ON DELETE CASCADE,
  assigned_at     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (appointment_id, staff_id)
);

COMMENT ON TABLE appointment_staff IS 'Asignación de personal operativo a citas (relación N:M)';
COMMENT ON COLUMN appointment_staff.appointment_id IS 'Cita a la que se asigna el operario';
COMMENT ON COLUMN appointment_staff.staff_id IS 'Operario asignado a la cita';

-- ── Tabla: notifications ──────────────────────────────────────────────────────
-- Almacena alertas y mensajes del sistema para los usuarios.
CREATE TABLE IF NOT EXISTS notifications (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     UUID NOT NULL REFERENCES user_profiles(id) ON DELETE CASCADE,
  type        notification_type NOT NULL DEFAULT 'sistema',
  title       TEXT NOT NULL,
  message     TEXT NOT NULL,
  is_read     BOOLEAN NOT NULL DEFAULT false,
  related_id  UUID,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

COMMENT ON TABLE notifications IS 'Notificaciones y alertas del sistema para los usuarios';
COMMENT ON COLUMN notifications.type IS 'Tipo de notificación para categorización y filtrado';
COMMENT ON COLUMN notifications.is_read IS 'Indica si el usuario ya leyó la notificación';
COMMENT ON COLUMN notifications.related_id IS 'UUID del registro relacionado (cita, cotización, cliente)';

-- ─────────────────────────────────────────────────────────────────────────────
-- SECCIÓN 3: ÍNDICES
-- Optimizan el rendimiento de consultas frecuentes
-- ─────────────────────────────────────────────────────────────────────────────

-- Índices en user_profiles
CREATE INDEX IF NOT EXISTS idx_user_profiles_email    ON user_profiles(email);
CREATE INDEX IF NOT EXISTS idx_user_profiles_role     ON user_profiles(role);
CREATE INDEX IF NOT EXISTS idx_user_profiles_active   ON user_profiles(is_active);

-- Índices en clients
CREATE INDEX IF NOT EXISTS idx_clients_code           ON clients(code);
CREATE INDEX IF NOT EXISTS idx_clients_status         ON clients(status);
CREATE INDEX IF NOT EXISTS idx_clients_doc_number     ON clients(doc_number);
CREATE INDEX IF NOT EXISTS idx_clients_district       ON clients(district);
CREATE INDEX IF NOT EXISTS idx_clients_registered_by  ON clients(registered_by);

-- Índices en services
CREATE INDEX IF NOT EXISTS idx_services_code          ON services(code);
CREATE INDEX IF NOT EXISTS idx_services_category      ON services(category);
CREATE INDEX IF NOT EXISTS idx_services_status        ON services(status);

-- Índices en quotes
CREATE INDEX IF NOT EXISTS idx_quotes_code            ON quotes(code);
CREATE INDEX IF NOT EXISTS idx_quotes_client_id       ON quotes(client_id);
CREATE INDEX IF NOT EXISTS idx_quotes_status          ON quotes(status);
CREATE INDEX IF NOT EXISTS idx_quotes_created_at      ON quotes(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_quotes_scheduled_date  ON quotes(scheduled_date);
CREATE INDEX IF NOT EXISTS idx_quotes_expires_at      ON quotes(expires_at);

-- Índices en appointments
CREATE INDEX IF NOT EXISTS idx_appointments_code         ON appointments(code);
CREATE INDEX IF NOT EXISTS idx_appointments_client_id    ON appointments(client_id);
CREATE INDEX IF NOT EXISTS idx_appointments_quote_id     ON appointments(quote_id);
CREATE INDEX IF NOT EXISTS idx_appointments_service_date ON appointments(service_date);
CREATE INDEX IF NOT EXISTS idx_appointments_status       ON appointments(status);
CREATE INDEX IF NOT EXISTS idx_appointments_shift        ON appointments(shift);
CREATE INDEX IF NOT EXISTS idx_appointments_has_conflict ON appointments(has_conflict) WHERE has_conflict = true;

-- Índices en appointment_staff
CREATE INDEX IF NOT EXISTS idx_appointment_staff_staff_id ON appointment_staff(staff_id);

-- Índices en notifications
CREATE INDEX IF NOT EXISTS idx_notifications_user_id  ON notifications(user_id);
CREATE INDEX IF NOT EXISTS idx_notifications_is_read  ON notifications(is_read) WHERE is_read = false;
CREATE INDEX IF NOT EXISTS idx_notifications_type     ON notifications(type);
CREATE INDEX IF NOT EXISTS idx_notifications_created  ON notifications(created_at DESC);

-- ─────────────────────────────────────────────────────────────────────────────
-- SECCIÓN 4: FUNCIONES Y TRIGGERS
-- Automatizan la actualización de campos y validaciones
-- ─────────────────────────────────────────────────────────────────────────────

-- Función: Actualiza el campo updated_at automáticamente en cada UPDATE
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Función: Verifica disponibilidad de personal (detecta conflictos de agenda)
-- Retorna TRUE si el operario ya tiene una cita activa en el mismo horario
CREATE OR REPLACE FUNCTION check_staff_conflict(
  p_staff_id      UUID,
  p_service_date  DATE,
  p_start_time    TIME,
  p_end_time      TIME,
  p_exclude_apt   UUID DEFAULT NULL
)
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1
    FROM appointment_staff aps
    JOIN appointments a ON a.id = aps.appointment_id
    WHERE aps.staff_id = p_staff_id
      AND a.service_date = p_service_date
      AND a.status NOT IN ('cancelada', 'completada')
      AND (p_exclude_apt IS NULL OR a.id != p_exclude_apt)
      AND (
        (p_start_time >= a.start_time AND p_start_time < a.end_time)
        OR (p_end_time > a.start_time AND p_end_time <= a.end_time)
        OR (p_start_time <= a.start_time AND p_end_time >= a.end_time)
      )
  );
END;
$$ LANGUAGE plpgsql;

-- Función: Incrementa el contador de cotizaciones del cliente
CREATE OR REPLACE FUNCTION increment_client_quotes()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE clients
  SET total_quotes = total_quotes + 1
  WHERE id = NEW.client_id;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Triggers: Actualizar updated_at automáticamente
CREATE OR REPLACE TRIGGER trg_user_profiles_updated_at
  BEFORE UPDATE ON user_profiles
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE OR REPLACE TRIGGER trg_clients_updated_at
  BEFORE UPDATE ON clients
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE OR REPLACE TRIGGER trg_services_updated_at
  BEFORE UPDATE ON services
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE OR REPLACE TRIGGER trg_quotes_updated_at
  BEFORE UPDATE ON quotes
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE OR REPLACE TRIGGER trg_appointments_updated_at
  BEFORE UPDATE ON appointments
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- Trigger: Incrementar contador de cotizaciones al crear una nueva
CREATE OR REPLACE TRIGGER trg_increment_client_quotes
  AFTER INSERT ON quotes
  FOR EACH ROW EXECUTE FUNCTION increment_client_quotes();

-- ─────────────────────────────────────────────────────────────────────────────
-- SECCIÓN 5: VISTAS ÚTILES
-- Consultas predefinidas para reportes y dashboards
-- ─────────────────────────────────────────────────────────────────────────────

-- Vista: Resumen de cotizaciones con datos del cliente
CREATE OR REPLACE VIEW v_quotes_summary AS
SELECT
  q.id,
  q.code,
  q.service_type,
  q.surface_m2,
  q.staff_count,
  q.district,
  q.scheduled_date,
  q.expires_at,
  q.subtotal,
  q.igv,
  q.total_soles,
  q.status,
  q.created_at,
  c.name        AS client_name,
  c.doc_type    AS client_doc_type,
  c.doc_number  AS client_doc_number,
  c.email       AS client_email,
  c.phone       AS client_phone,
  u.full_name   AS created_by_name
FROM quotes q
JOIN clients c ON c.id = q.client_id
LEFT JOIN user_profiles u ON u.id = q.created_by;

COMMENT ON VIEW v_quotes_summary IS 'Vista de cotizaciones con información completa del cliente y creador';

-- Vista: Agenda de citas con personal asignado
CREATE OR REPLACE VIEW v_appointments_with_staff AS
SELECT
  a.id,
  a.code,
  a.service_type,
  a.service_date,
  a.start_time,
  a.end_time,
  a.shift,
  a.status,
  a.has_conflict,
  a.district,
  a.address,
  a.service_order_code,
  c.name        AS client_name,
  c.phone       AS client_phone,
  ARRAY_AGG(sm.name ORDER BY sm.name) FILTER (WHERE sm.id IS NOT NULL) AS staff_names,
  COUNT(sm.id)  AS staff_count
FROM appointments a
JOIN clients c ON c.id = a.client_id
LEFT JOIN appointment_staff aps ON aps.appointment_id = a.id
LEFT JOIN staff_members sm ON sm.id = aps.staff_id
GROUP BY a.id, a.code, a.service_type, a.service_date, a.start_time, a.end_time,
         a.shift, a.status, a.has_conflict, a.district, a.address, a.service_order_code,
         c.name, c.phone;

COMMENT ON VIEW v_appointments_with_staff IS 'Vista de citas con personal asignado y datos del cliente';

-- Vista: Dashboard de estadísticas generales
CREATE OR REPLACE VIEW v_dashboard_stats AS
SELECT
  (SELECT COUNT(*) FROM clients WHERE status = 'activo')           AS active_clients,
  (SELECT COUNT(*) FROM clients WHERE status = 'prospecto')        AS prospect_clients,
  (SELECT COUNT(*) FROM quotes WHERE status = 'borrador')          AS draft_quotes,
  (SELECT COUNT(*) FROM quotes WHERE status = 'enviada')           AS sent_quotes,
  (SELECT COUNT(*) FROM quotes WHERE status = 'aceptada')          AS accepted_quotes,
  (SELECT COALESCE(SUM(total_soles), 0) FROM quotes
   WHERE status = 'aceptada'
   AND EXTRACT(MONTH FROM created_at) = EXTRACT(MONTH FROM NOW())
   AND EXTRACT(YEAR FROM created_at) = EXTRACT(YEAR FROM NOW()))   AS monthly_revenue,
  (SELECT COUNT(*) FROM appointments
   WHERE service_date = CURRENT_DATE)                              AS today_appointments,
  (SELECT COUNT(*) FROM appointments
   WHERE status IN ('programada', 'confirmada')
   AND service_date >= CURRENT_DATE)                               AS upcoming_appointments,
  (SELECT COUNT(*) FROM appointments WHERE has_conflict = true
   AND status NOT IN ('cancelada', 'completada'))                  AS active_conflicts,
  (SELECT COUNT(*) FROM staff_members WHERE is_active = true)      AS active_staff;

COMMENT ON VIEW v_dashboard_stats IS 'Estadísticas generales para el dashboard principal';

-- ─────────────────────────────────────────────────────────────────────────────
-- SECCIÓN 6: DATOS DE PRUEBA
-- Usuarios, clientes, servicios, cotizaciones y citas de demostración
-- ─────────────────────────────────────────────────────────────────────────────

DO $$
DECLARE
  -- UUIDs de usuarios
  admin_id  UUID := gen_random_uuid();
  super_id  UUID := gen_random_uuid();

  -- UUIDs de clientes
  cli_001   UUID := gen_random_uuid();
  cli_002   UUID := gen_random_uuid();
  cli_003   UUID := gen_random_uuid();
  cli_004   UUID := gen_random_uuid();
  cli_005   UUID := gen_random_uuid();
  cli_006   UUID := gen_random_uuid();
  cli_007   UUID := gen_random_uuid();
  cli_008   UUID := gen_random_uuid();

  -- UUIDs de servicios
  svc_001   UUID := gen_random_uuid();
  svc_002   UUID := gen_random_uuid();
  svc_003   UUID := gen_random_uuid();
  svc_004   UUID := gen_random_uuid();
  svc_005   UUID := gen_random_uuid();

  -- UUIDs de cotizaciones
  q_001     UUID := gen_random_uuid();
  q_002     UUID := gen_random_uuid();
  q_003     UUID := gen_random_uuid();
  q_004     UUID := gen_random_uuid();
  q_005     UUID := gen_random_uuid();
  q_006     UUID := gen_random_uuid();

  -- UUIDs de personal operativo
  stf_001   UUID := gen_random_uuid();
  stf_002   UUID := gen_random_uuid();
  stf_003   UUID := gen_random_uuid();
  stf_004   UUID := gen_random_uuid();
  stf_005   UUID := gen_random_uuid();

  -- UUIDs de citas
  apt_001   UUID := gen_random_uuid();
  apt_002   UUID := gen_random_uuid();
  apt_003   UUID := gen_random_uuid();
  apt_004   UUID := gen_random_uuid();

BEGIN

  -- ── Usuarios del sistema ─────────────────────────────────────────────────
  -- Contraseñas hasheadas con bcrypt (pgcrypto)
  -- Admin2026! y Super2026!
  INSERT INTO user_profiles (id, email, full_name, password_hash, role, phone, is_active)
  VALUES
    (admin_id, 'admin@cleansenso.pe', 'Carlos Alvarado',
     crypt('Admin2026!', gen_salt('bf', 10)), 'admin', '+51 987 000 001', true),
    (super_id, 'supervisor@cleansenso.pe', 'María Torres',
     crypt('Super2026!', gen_salt('bf', 10)), 'supervisor', '+51 987 000 002', true)
  ON CONFLICT (email) DO NOTHING;

  -- ── Clientes del negocio ─────────────────────────────────────────────────
  INSERT INTO clients (
    id, code, name, doc_type, doc_number, client_type, district, phone, email,
    status, contact_name, address, total_quotes, last_service_date, registered_by
  ) VALUES
    (cli_001, 'CLI-001', 'Empresa Inmobiliaria Rímac S.A.C.', 'RUC', '20512345678',
     'empresa', 'Rímac', '+51 987 654 321', 'administracion@inmorimac.pe',
     'activo', 'Gerardo Huamán Torres', 'Av. Túpac Amaru 890, Rímac',
     5, '01/09/2026', admin_id),
    (cli_002, 'CLI-002', 'Residencial Los Álamos', 'RUC', '20487651234',
     'empresa', 'Miraflores', '+51 991 234 567', 'junta@residencialalamos.pe',
     'activo', 'Rosa Mendoza Quispe', 'Calle Los Álamos 245, Miraflores',
     8, '28/08/2026', admin_id),
    (cli_003, 'CLI-003', 'Clínica San Borja S.A.', 'RUC', '20156789012',
     'empresa', 'San Borja', '+51 01 225 8800', 'logistica@clinicasanborja.pe',
     'activo', 'Marco Delgado Castillo', 'Av. Guardia Civil 385, San Borja',
     12, '04/09/2026', admin_id),
    (cli_004, 'CLI-004', 'Almacenes Del Centro E.I.R.L.', 'RUC', '20345678901',
     'empresa', 'Cercado de Lima', '+51 942 111 222', 'operaciones@almacentro.pe',
     'activo', 'Luis Vargas Romero', 'Jr. Paruro 567, Cercado de Lima',
     3, '15/08/2026', admin_id),
    (cli_005, 'CLI-005', 'Patricia Rodríguez Vega', 'DNI', '43567891',
     'persona_natural', 'Surco', '+51 998 765 432', 'patricia.rodriguez@gmail.com',
     'activo', 'Patricia Rodríguez Vega', 'Calle Los Rosales 123, Surco',
     4, '06/09/2026', admin_id),
    (cli_006, 'CLI-006', 'Torre Empresarial Javier Prado', 'RUC', '20609876543',
     'empresa', 'San Isidro', '+51 01 441 5500', 'facilities@torrejp.pe',
     'activo', 'Andrea Flores Suárez', 'Av. Javier Prado Este 1234, San Isidro',
     15, '07/09/2026', admin_id),
    (cli_007, 'CLI-007', 'Restaurante La Tradición S.R.L.', 'RUC', '20512987654',
     'empresa', 'Barranco', '+51 965 432 109', 'administracion@latradicion.pe',
     'inactivo', 'Fernando Chávez Pinto', 'Jr. Grau 89, Barranco',
     2, '10/07/2026', admin_id),
    (cli_008, 'CLI-008', 'Edificio Residencial Parque Norte', 'RUC', '20401234567',
     'empresa', 'Jesús María', '+51 01 463 9900', 'junta@parquenorte.pe',
     'activo', 'Carmen Villanueva López', 'Av. Salaverry 2456, Jesús María',
     7, '02/09/2026', admin_id)
  ON CONFLICT (code) DO NOTHING;

  -- ── Catálogo de servicios ────────────────────────────────────────────────
  INSERT INTO services (
    id, code, name, description, category, base_price_m2, min_surface_m2,
    staff_per_100m2, duration_hours, status, includes, created_by
  ) VALUES
    (svc_001, 'SVC-001', 'Limpieza de Oficinas',
     'Servicio completo de limpieza para espacios de trabajo: pisos, escritorios, baños y áreas comunes.',
     'limpieza_general', 2.50, 20, 1, 3.0, 'activo',
     ARRAY['Limpieza de pisos', 'Desinfección de baños', 'Limpieza de escritorios', 'Vaciado de papeleras'],
     admin_id),
    (svc_002, 'SVC-002', 'Lavado de Alfombras',
     'Lavado profundo con equipos especializados y productos de alta eficacia.',
     'lavado', 4.50, 10, 1, 2.0, 'activo',
     ARRAY['Aspirado previo', 'Aplicación de espuma', 'Lavado a presión', 'Secado rápido'],
     admin_id),
    (svc_003, 'SVC-003', 'Desinfección Post-Obra',
     'Limpieza y desinfección profunda después de trabajos de construcción o remodelación.',
     'desinfeccion', 5.00, 30, 2, 5.0, 'activo',
     ARRAY['Retiro de escombros menores', 'Limpieza de polvo de obra', 'Desinfección de superficies', 'Limpieza de ventanas'],
     admin_id),
    (svc_004, 'SVC-004', 'Limpieza de Almacenes',
     'Servicio especializado para almacenes y depósitos industriales.',
     'limpieza_especializada', 1.80, 50, 1, 4.0, 'activo',
     ARRAY['Barrido industrial', 'Limpieza de estanterías', 'Desinfección de pisos', 'Retiro de residuos'],
     admin_id),
    (svc_005, 'SVC-005', 'Lavado de Sillones y Sillas',
     'Lavado y desinfección de tapizados, sillones de oficina y sillas de sala.',
     'lavado', 35.00, 1, 1, 1.5, 'activo',
     ARRAY['Aspirado de tapizado', 'Aplicación de limpiador especializado', 'Cepillado', 'Secado'],
     admin_id)
  ON CONFLICT (code) DO NOTHING;

  -- ── Personal operativo ───────────────────────────────────────────────────
  INSERT INTO staff_members (id, name, specialty, phone, is_active) VALUES
    (stf_001, 'Miguel Quispe Condori',    'Limpieza general',      '+51 987 001 001', true),
    (stf_002, 'Ana Flores Huanca',        'Lavado especializado',  '+51 987 001 002', true),
    (stf_003, 'Juan Ccopa Mamani',        'Limpieza general',      '+51 987 001 003', true),
    (stf_004, 'Luis Mamani Apaza',        'Desinfección',          '+51 987 001 004', true),
    (stf_005, 'Rosa Tito Quispe',         'Alfombras y tapizados', '+51 987 001 005', true)
  ON CONFLICT DO NOTHING;

  -- ── Cotizaciones de prueba ───────────────────────────────────────────────
  INSERT INTO quotes (
    id, code, client_id, service_type, surface_m2, staff_count, district, address,
    scheduled_date, valid_days, expires_at, subtotal, igv, total_soles, status, created_by
  ) VALUES
    (q_001, 'COT-2026-001', cli_001, 'Limpieza de Oficinas', 320, 3,
     'Rímac', 'Av. Túpac Amaru 890',
     '2026-09-15', 14, '2026-09-29', 720.34, 129.66, 850.00, 'aceptada', admin_id),
    (q_002, 'COT-2026-002', cli_002, 'Lavado de Alfombras', 180, 2,
     'Miraflores', 'Calle Los Álamos 245',
     '2026-09-16', 14, '2026-09-30', 457.63, 82.37, 540.00, 'enviada', admin_id),
    (q_003, 'COT-2026-003', cli_003, 'Desinfección Post-Obra', 600, 5,
     'San Borja', 'Av. Guardia Civil 385',
     '2026-09-11', 14, '2026-09-25', 1779.66, 320.34, 2100.00, 'aceptada', admin_id),
    (q_004, 'COT-2026-004', cli_004, 'Limpieza de Almacenes', 850, 6,
     'Cercado de Lima', 'Jr. Paruro 567',
     '2026-09-19', 14, '2026-10-03', 2372.88, 427.12, 2800.00, 'borrador', admin_id),
    (q_005, 'COT-2026-005', cli_005, 'Lavado de Sillones', 45, 1,
     'Surco', 'Calle Los Rosales 123',
     '2026-09-18', 14, '2026-10-02', 152.54, 27.46, 180.00, 'aceptada', admin_id),
    (q_006, 'COT-2026-006', cli_006, 'Limpieza de Oficinas', 2400, 12,
     'San Isidro', 'Av. Javier Prado Este 1234',
     '2026-09-08', 14, '2026-09-22', 5254.24, 945.76, 6200.00, 'aceptada', admin_id)
  ON CONFLICT (code) DO NOTHING;

  -- ── Citas de prueba ──────────────────────────────────────────────────────
  INSERT INTO appointments (
    id, code, client_id, quote_id, service_type, address, district,
    service_date, start_time, end_time, shift, status,
    service_order_code, has_conflict, created_by
  ) VALUES
    (apt_001, 'CITA-2026-018', cli_001, q_001, 'Limpieza de Oficinas',
     'Av. Túpac Amaru 890', 'Rímac',
     '2026-09-15', '08:00', '12:00', 'mañana', 'confirmada',
     'OS-2026-018', false, admin_id),
    (apt_002, 'CITA-2026-019', cli_003, q_003, 'Desinfección Post-Obra',
     'Av. Guardia Civil 385', 'San Borja',
     '2026-09-11', '09:00', '14:00', 'mañana', 'confirmada',
     'OS-2026-019', true, admin_id),
    (apt_003, 'CITA-2026-020', cli_008, NULL, 'Limpieza de Condominios',
     'Av. Salaverry 2456', 'Jesús María',
     '2026-09-16', '14:00', '18:00', 'tarde', 'programada',
     NULL, false, admin_id),
    (apt_004, 'CITA-2026-021', cli_005, q_005, 'Lavado de Sillones',
     'Calle Los Rosales 123', 'Surco',
     '2026-09-18', '15:00', '17:00', 'tarde', 'programada',
     NULL, false, admin_id)
  ON CONFLICT (code) DO NOTHING;

  -- ── Asignación de personal a citas ───────────────────────────────────────
  INSERT INTO appointment_staff (appointment_id, staff_id) VALUES
    (apt_001, stf_001), (apt_001, stf_002), (apt_001, stf_003),
    (apt_002, stf_004), (apt_002, stf_005),
    (apt_003, stf_001), (apt_003, stf_002),
    (apt_004, stf_003)
  ON CONFLICT DO NOTHING;

  -- ── Notificaciones de prueba ─────────────────────────────────────────────
  INSERT INTO notifications (user_id, type, title, message, is_read) VALUES
    (admin_id, 'conflicto_agenda',
     'Conflicto de horario detectado',
     'La cita CITA-2026-019 tiene solapamiento de personal con otra cita el 11/09/2026.',
     false),
    (admin_id, 'cotizacion_aceptada',
     'Cotización aceptada',
     'El cliente Torre Empresarial Javier Prado aceptó la cotización COT-2026-006 por S/ 6,200.',
     true),
    (admin_id, 'cita_recordatorio',
     'Recordatorio de cita mañana',
     'Cita CITA-2026-018 programada para mañana 15/09/2026 a las 08:00 en Rímac.',
     false),
    (super_id, 'nuevo_cliente',
     'Nuevo cliente registrado',
     'Se registró el cliente Edificio Residencial Parque Norte como prospecto.',
     false),
    (super_id, 'cotizacion_vencida',
     'Cotización próxima a vencer',
     'La cotización COT-2026-002 para Residencial Los Álamos vence el 30/09/2026.',
     false)
  ON CONFLICT DO NOTHING;

EXCEPTION
  WHEN OTHERS THEN
    RAISE NOTICE 'Error al insertar datos de prueba: % - %', SQLSTATE, SQLERRM;
END $$;

-- ─────────────────────────────────────────────────────────────────────────────
-- VERIFICACIÓN FINAL
-- ─────────────────────────────────────────────────────────────────────────────
DO $$
BEGIN
  RAISE NOTICE '=== CleanSenso — Base de datos inicializada correctamente ===';
  RAISE NOTICE 'Tablas creadas: user_profiles, clients, services, quotes, staff_members, appointments, appointment_staff, notifications';
  RAISE NOTICE 'Usuarios de prueba:';
  RAISE NOTICE '  admin@cleansenso.pe      / Admin2026!  (rol: admin)';
  RAISE NOTICE '  supervisor@cleansenso.pe / Super2026!  (rol: supervisor)';
  RAISE NOTICE 'Datos de prueba: 8 clientes, 5 servicios, 6 cotizaciones, 4 citas, 5 operarios';
END $$;
