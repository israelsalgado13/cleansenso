-- =============================================================================
-- CleanSenso — Migración completa de base de datos
-- Grupo Consenso Perú — Sistema de gestión de servicios de limpieza
-- Fecha: 2026-09-09
-- Incluye: Autenticación con roles, Clientes, Cotizaciones, Citas, Servicios,
--          Notificaciones y datos de prueba
-- =============================================================================

-- ─────────────────────────────────────────────────────────────────────────────
-- SECCIÓN 1: TIPOS ENUMERADOS (ENUMs)
-- Definen los valores permitidos para campos de estado y categoría
-- ─────────────────────────────────────────────────────────────────────────────

-- Roles de usuario en el sistema
DROP TYPE IF EXISTS public.user_role CASCADE;
CREATE TYPE public.user_role AS ENUM ('admin', 'supervisor', 'cliente');

-- Estados de cotización
DROP TYPE IF EXISTS public.quote_status CASCADE;
CREATE TYPE public.quote_status AS ENUM ('borrador', 'enviada', 'aceptada', 'rechazada', 'vencida');

-- Estados de cliente
DROP TYPE IF EXISTS public.client_status CASCADE;
CREATE TYPE public.client_status AS ENUM ('activo', 'inactivo', 'prospecto');

-- Tipo de cliente (persona jurídica o natural)
DROP TYPE IF EXISTS public.client_type CASCADE;
CREATE TYPE public.client_type AS ENUM ('empresa', 'persona_natural');

-- Tipo de documento de identidad
DROP TYPE IF EXISTS public.doc_type CASCADE;
CREATE TYPE public.doc_type AS ENUM ('RUC', 'DNI');

-- Estados de cita/agenda
DROP TYPE IF EXISTS public.appointment_status CASCADE;
CREATE TYPE public.appointment_status AS ENUM ('programada', 'confirmada', 'en_progreso', 'completada', 'cancelada');

-- Turno de trabajo
DROP TYPE IF EXISTS public.shift_type CASCADE;
CREATE TYPE public.shift_type AS ENUM ('mañana', 'tarde');

-- Estados de servicio del catálogo
DROP TYPE IF EXISTS public.service_status CASCADE;
CREATE TYPE public.service_status AS ENUM ('activo', 'inactivo', 'en_revision');

-- Categorías de servicio
DROP TYPE IF EXISTS public.service_category CASCADE;
CREATE TYPE public.service_category AS ENUM (
  'limpieza_general',
  'limpieza_especializada',
  'desinfeccion',
  'lavado',
  'mantenimiento'
);

-- Tipos de notificación
DROP TYPE IF EXISTS public.notification_type CASCADE;
CREATE TYPE public.notification_type AS ENUM (
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

-- Tabla de perfiles de usuario (vinculada a auth.users)
-- Almacena datos adicionales del usuario: rol, nombre, estado
CREATE TABLE IF NOT EXISTS public.user_profiles (
  id            UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email         TEXT NOT NULL UNIQUE,
  full_name     TEXT NOT NULL DEFAULT '',
  role          public.user_role NOT NULL DEFAULT 'cliente'::public.user_role,
  avatar_url    TEXT,
  phone         TEXT,
  is_active     BOOLEAN NOT NULL DEFAULT true,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Tabla de clientes del negocio
-- Registra empresas y personas naturales que contratan servicios
CREATE TABLE IF NOT EXISTS public.clients (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code            TEXT NOT NULL UNIQUE,
  name            TEXT NOT NULL,
  doc_type        public.doc_type NOT NULL DEFAULT 'RUC'::public.doc_type,
  doc_number      TEXT NOT NULL,
  client_type     public.client_type NOT NULL DEFAULT 'empresa'::public.client_type,
  district        TEXT NOT NULL DEFAULT '',
  phone           TEXT NOT NULL DEFAULT '',
  email           TEXT NOT NULL DEFAULT '',
  status          public.client_status NOT NULL DEFAULT 'prospecto'::public.client_status,
  contact_name    TEXT NOT NULL DEFAULT '',
  address         TEXT NOT NULL DEFAULT '',
  notes           TEXT,
  total_quotes    INTEGER NOT NULL DEFAULT 0,
  last_service_date TEXT,
  registered_by   UUID REFERENCES public.user_profiles(id) ON DELETE SET NULL,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Tabla de catálogo de servicios
-- Define los tipos de servicios que ofrece CleanSenso con precios base
CREATE TABLE IF NOT EXISTS public.services (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code            TEXT NOT NULL UNIQUE,
  name            TEXT NOT NULL,
  description     TEXT,
  category        public.service_category NOT NULL DEFAULT 'limpieza_general'::public.service_category,
  base_price_m2   NUMERIC(10,2) NOT NULL DEFAULT 0,
  min_surface_m2  NUMERIC(10,2) NOT NULL DEFAULT 1,
  staff_per_100m2 INTEGER NOT NULL DEFAULT 1,
  duration_hours  NUMERIC(4,1) NOT NULL DEFAULT 2,
  status          public.service_status NOT NULL DEFAULT 'activo'::public.service_status,
  includes        TEXT[],
  created_by      UUID REFERENCES public.user_profiles(id) ON DELETE SET NULL,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Tabla de cotizaciones
-- Registra presupuestos generados para clientes
CREATE TABLE IF NOT EXISTS public.quotes (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code            TEXT NOT NULL UNIQUE,
  client_id       UUID NOT NULL REFERENCES public.clients(id) ON DELETE RESTRICT,
  service_type    TEXT NOT NULL,
  surface_m2      NUMERIC(10,2) NOT NULL DEFAULT 1 CHECK (surface_m2 >= 1),
  rooms_count     INTEGER,
  staff_count     INTEGER NOT NULL DEFAULT 1,
  district        TEXT NOT NULL DEFAULT '',
  address         TEXT NOT NULL DEFAULT '',
  scheduled_date  DATE NOT NULL,
  valid_days      INTEGER NOT NULL DEFAULT 14,
  expires_at      DATE NOT NULL,
  subtotal        NUMERIC(12,2) NOT NULL DEFAULT 0,
  igv             NUMERIC(12,2) NOT NULL DEFAULT 0,
  total_soles     NUMERIC(12,2) NOT NULL DEFAULT 0,
  status          public.quote_status NOT NULL DEFAULT 'borrador'::public.quote_status,
  notes           TEXT,
  payment_terms   TEXT,
  created_by      UUID REFERENCES public.user_profiles(id) ON DELETE SET NULL,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Tabla de personal operativo
-- Registra los operarios disponibles para asignación de citas
CREATE TABLE IF NOT EXISTS public.staff_members (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name        TEXT NOT NULL,
  specialty   TEXT NOT NULL DEFAULT 'Limpieza general',
  phone       TEXT,
  is_active   BOOLEAN NOT NULL DEFAULT true,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Tabla de citas y agenda
-- Registra los servicios programados con asignación de personal
CREATE TABLE IF NOT EXISTS public.appointments (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code                TEXT NOT NULL UNIQUE,
  client_id           UUID NOT NULL REFERENCES public.clients(id) ON DELETE RESTRICT,
  quote_id            UUID REFERENCES public.quotes(id) ON DELETE SET NULL,
  service_type        TEXT NOT NULL,
  address             TEXT NOT NULL DEFAULT '',
  district            TEXT NOT NULL DEFAULT '',
  service_date        DATE NOT NULL,
  start_time          TIME NOT NULL,
  end_time            TIME NOT NULL,
  shift               public.shift_type NOT NULL DEFAULT 'mañana'::public.shift_type,
  status              public.appointment_status NOT NULL DEFAULT 'programada'::public.appointment_status,
  service_order_code  TEXT,
  has_conflict        BOOLEAN NOT NULL DEFAULT false,
  notes               TEXT,
  created_by          UUID REFERENCES public.user_profiles(id) ON DELETE SET NULL,
  created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at          TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Tabla de asignación de personal a citas (relación muchos a muchos)
CREATE TABLE IF NOT EXISTS public.appointment_staff (
  appointment_id  UUID NOT NULL REFERENCES public.appointments(id) ON DELETE CASCADE,
  staff_id        UUID NOT NULL REFERENCES public.staff_members(id) ON DELETE CASCADE,
  PRIMARY KEY (appointment_id, staff_id)
);

-- Tabla de notificaciones del sistema
-- Almacena alertas y mensajes para los usuarios
CREATE TABLE IF NOT EXISTS public.notifications (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     UUID NOT NULL REFERENCES public.user_profiles(id) ON DELETE CASCADE,
  type        public.notification_type NOT NULL DEFAULT 'sistema'::public.notification_type,
  title       TEXT NOT NULL,
  message     TEXT NOT NULL,
  is_read     BOOLEAN NOT NULL DEFAULT false,
  related_id  UUID,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ─────────────────────────────────────────────────────────────────────────────
-- SECCIÓN 3: ÍNDICES
-- Mejoran el rendimiento de consultas frecuentes
-- ─────────────────────────────────────────────────────────────────────────────

CREATE INDEX IF NOT EXISTS idx_user_profiles_email ON public.user_profiles(email);
CREATE INDEX IF NOT EXISTS idx_user_profiles_role ON public.user_profiles(role);
CREATE INDEX IF NOT EXISTS idx_clients_code ON public.clients(code);
CREATE INDEX IF NOT EXISTS idx_clients_status ON public.clients(status);
CREATE INDEX IF NOT EXISTS idx_clients_doc_number ON public.clients(doc_number);
CREATE INDEX IF NOT EXISTS idx_quotes_code ON public.quotes(code);
CREATE INDEX IF NOT EXISTS idx_quotes_client_id ON public.quotes(client_id);
CREATE INDEX IF NOT EXISTS idx_quotes_status ON public.quotes(status);
CREATE INDEX IF NOT EXISTS idx_quotes_created_at ON public.quotes(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_appointments_code ON public.appointments(code);
CREATE INDEX IF NOT EXISTS idx_appointments_client_id ON public.appointments(client_id);
CREATE INDEX IF NOT EXISTS idx_appointments_service_date ON public.appointments(service_date);
CREATE INDEX IF NOT EXISTS idx_appointments_status ON public.appointments(status);
CREATE INDEX IF NOT EXISTS idx_notifications_user_id ON public.notifications(user_id);
CREATE INDEX IF NOT EXISTS idx_notifications_is_read ON public.notifications(is_read);

-- ─────────────────────────────────────────────────────────────────────────────
-- SECCIÓN 4: FUNCIONES
-- Deben crearse ANTES de las políticas RLS que las referencian
-- ─────────────────────────────────────────────────────────────────────────────

-- Función: Crea automáticamente el perfil de usuario al registrarse
-- Se ejecuta como trigger después de INSERT en auth.users
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  INSERT INTO public.user_profiles (id, email, full_name, avatar_url, role)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'full_name', split_part(NEW.email, '@', 1)),
    COALESCE(NEW.raw_user_meta_data->>'avatar_url', ''),
    COALESCE(NEW.raw_user_meta_data->>'role', 'cliente')::public.user_role
  )
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END;
$$;

-- Función: Actualiza el campo updated_at automáticamente
CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;

-- Función: Verifica si el usuario actual es administrador
-- Consulta auth.users para evitar recursión en user_profiles
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
AS $$
  SELECT EXISTS (
    SELECT 1 FROM auth.users au
    WHERE au.id = auth.uid()
    AND (
      au.raw_user_meta_data->>'role' = 'admin'
      OR au.raw_app_meta_data->>'role' = 'admin'
    )
  );
$$;

-- Función: Verifica si el usuario actual es admin o supervisor
CREATE OR REPLACE FUNCTION public.is_admin_or_supervisor()
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_profiles up
    WHERE up.id = auth.uid()
    AND up.role IN ('admin'::public.user_role, 'supervisor'::public.user_role)
  );
$$;

-- ─────────────────────────────────────────────────────────────────────────────
-- SECCIÓN 5: HABILITAR ROW LEVEL SECURITY (RLS)
-- Protege las tablas a nivel de fila según el usuario autenticado
-- ─────────────────────────────────────────────────────────────────────────────

ALTER TABLE public.user_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.clients ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.quotes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.services ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.staff_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.appointments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.appointment_staff ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

-- ─────────────────────────────────────────────────────────────────────────────
-- SECCIÓN 6: POLÍTICAS RLS
-- Controlan quién puede leer/escribir cada tabla
-- ─────────────────────────────────────────────────────────────────────────────

-- Políticas para user_profiles
DROP POLICY IF EXISTS "users_view_own_profile" ON public.user_profiles;
CREATE POLICY "users_view_own_profile"
ON public.user_profiles FOR SELECT
TO authenticated
USING (id = auth.uid() OR public.is_admin());

DROP POLICY IF EXISTS "users_update_own_profile" ON public.user_profiles;
CREATE POLICY "users_update_own_profile"
ON public.user_profiles FOR UPDATE
TO authenticated
USING (id = auth.uid())
WITH CHECK (id = auth.uid());

DROP POLICY IF EXISTS "admin_manage_profiles" ON public.user_profiles;
CREATE POLICY "admin_manage_profiles"
ON public.user_profiles FOR ALL
TO authenticated
USING (public.is_admin())
WITH CHECK (public.is_admin());

-- Políticas para clients: admin y supervisor pueden gestionar, cliente solo ve los suyos
DROP POLICY IF EXISTS "staff_manage_clients" ON public.clients;
CREATE POLICY "staff_manage_clients"
ON public.clients FOR ALL
TO authenticated
USING (public.is_admin_or_supervisor())
WITH CHECK (public.is_admin_or_supervisor());

-- Políticas para quotes: admin y supervisor gestionan todas
DROP POLICY IF EXISTS "staff_manage_quotes" ON public.quotes;
CREATE POLICY "staff_manage_quotes"
ON public.quotes FOR ALL
TO authenticated
USING (public.is_admin_or_supervisor())
WITH CHECK (public.is_admin_or_supervisor());

-- Políticas para services: todos pueden ver, solo admin gestiona
DROP POLICY IF EXISTS "all_view_services" ON public.services;
CREATE POLICY "all_view_services"
ON public.services FOR SELECT
TO authenticated
USING (true);

DROP POLICY IF EXISTS "admin_manage_services" ON public.services;
CREATE POLICY "admin_manage_services"
ON public.services FOR ALL
TO authenticated
USING (public.is_admin())
WITH CHECK (public.is_admin());

-- Políticas para staff_members: todos pueden ver
DROP POLICY IF EXISTS "all_view_staff" ON public.staff_members;
CREATE POLICY "all_view_staff"
ON public.staff_members FOR SELECT
TO authenticated
USING (true);

DROP POLICY IF EXISTS "admin_manage_staff" ON public.staff_members;
CREATE POLICY "admin_manage_staff"
ON public.staff_members FOR ALL
TO authenticated
USING (public.is_admin_or_supervisor())
WITH CHECK (public.is_admin_or_supervisor());

-- Políticas para appointments: admin y supervisor gestionan
DROP POLICY IF EXISTS "staff_manage_appointments" ON public.appointments;
CREATE POLICY "staff_manage_appointments"
ON public.appointments FOR ALL
TO authenticated
USING (public.is_admin_or_supervisor())
WITH CHECK (public.is_admin_or_supervisor());

-- Políticas para appointment_staff
DROP POLICY IF EXISTS "staff_manage_appointment_staff" ON public.appointment_staff;
CREATE POLICY "staff_manage_appointment_staff"
ON public.appointment_staff FOR ALL
TO authenticated
USING (public.is_admin_or_supervisor())
WITH CHECK (public.is_admin_or_supervisor());

-- Políticas para notifications: cada usuario ve solo sus notificaciones
DROP POLICY IF EXISTS "users_view_own_notifications" ON public.notifications;
CREATE POLICY "users_view_own_notifications"
ON public.notifications FOR SELECT
TO authenticated
USING (user_id = auth.uid());

DROP POLICY IF EXISTS "users_update_own_notifications" ON public.notifications;
CREATE POLICY "users_update_own_notifications"
ON public.notifications FOR UPDATE
TO authenticated
USING (user_id = auth.uid())
WITH CHECK (user_id = auth.uid());

DROP POLICY IF EXISTS "system_insert_notifications" ON public.notifications;
CREATE POLICY "system_insert_notifications"
ON public.notifications FOR INSERT
TO authenticated
WITH CHECK (true);

-- ─────────────────────────────────────────────────────────────────────────────
-- SECCIÓN 7: TRIGGERS
-- Automatizan acciones al insertar/actualizar registros
-- ─────────────────────────────────────────────────────────────────────────────

-- Trigger: Crea perfil de usuario automáticamente al registrarse
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Triggers: Actualiza updated_at automáticamente en cada tabla
DROP TRIGGER IF EXISTS set_updated_at_user_profiles ON public.user_profiles;
CREATE TRIGGER set_updated_at_user_profiles
  BEFORE UPDATE ON public.user_profiles
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

DROP TRIGGER IF EXISTS set_updated_at_clients ON public.clients;
CREATE TRIGGER set_updated_at_clients
  BEFORE UPDATE ON public.clients
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

DROP TRIGGER IF EXISTS set_updated_at_quotes ON public.quotes;
CREATE TRIGGER set_updated_at_quotes
  BEFORE UPDATE ON public.quotes
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

DROP TRIGGER IF EXISTS set_updated_at_appointments ON public.appointments;
CREATE TRIGGER set_updated_at_appointments
  BEFORE UPDATE ON public.appointments
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

DROP TRIGGER IF EXISTS set_updated_at_services ON public.services;
CREATE TRIGGER set_updated_at_services
  BEFORE UPDATE ON public.services
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- ─────────────────────────────────────────────────────────────────────────────
-- SECCIÓN 8: DATOS DE PRUEBA (MOCK DATA)
-- Usuarios de demostración y datos iniciales para el sistema
-- Credenciales: admin@cleansenso.pe / Admin2026!
--               supervisor@cleansenso.pe / Super2026!
--               cliente@cleansenso.pe / Cliente2026!
-- ─────────────────────────────────────────────────────────────────────────────

DO $$
DECLARE
  admin_uuid    UUID := gen_random_uuid();
  super_uuid    UUID := gen_random_uuid();
  client_uuid   UUID := gen_random_uuid();

  -- UUIDs de clientes de prueba
  cli_001 UUID := gen_random_uuid();
  cli_002 UUID := gen_random_uuid();
  cli_003 UUID := gen_random_uuid();
  cli_004 UUID := gen_random_uuid();
  cli_005 UUID := gen_random_uuid();
  cli_006 UUID := gen_random_uuid();
  cli_007 UUID := gen_random_uuid();
  cli_008 UUID := gen_random_uuid();

  -- UUIDs de cotizaciones de prueba
  q_001 UUID := gen_random_uuid();
  q_002 UUID := gen_random_uuid();
  q_003 UUID := gen_random_uuid();
  q_004 UUID := gen_random_uuid();
  q_005 UUID := gen_random_uuid();
  q_006 UUID := gen_random_uuid();

  -- UUIDs de servicios del catálogo
  svc_001 UUID := gen_random_uuid();
  svc_002 UUID := gen_random_uuid();
  svc_003 UUID := gen_random_uuid();
  svc_004 UUID := gen_random_uuid();
  svc_005 UUID := gen_random_uuid();

  -- UUIDs de personal operativo
  stf_001 UUID := gen_random_uuid();
  stf_002 UUID := gen_random_uuid();
  stf_003 UUID := gen_random_uuid();
  stf_004 UUID := gen_random_uuid();
  stf_005 UUID := gen_random_uuid();

  -- UUIDs de citas de prueba
  apt_001 UUID := gen_random_uuid();
  apt_002 UUID := gen_random_uuid();
  apt_003 UUID := gen_random_uuid();
  apt_004 UUID := gen_random_uuid();

BEGIN

  -- ── Usuarios de autenticación (auth.users) ──────────────────────────────
  -- El trigger handle_new_user creará automáticamente los perfiles en user_profiles

  INSERT INTO auth.users (
    id, instance_id, aud, role, email, encrypted_password, email_confirmed_at,
    created_at, updated_at, raw_user_meta_data, raw_app_meta_data,
    is_sso_user, is_anonymous, confirmation_token, confirmation_sent_at,
    recovery_token, recovery_sent_at, email_change_token_new, email_change,
    email_change_sent_at, email_change_token_current, email_change_confirm_status,
    reauthentication_token, reauthentication_sent_at, phone, phone_change,
    phone_change_token, phone_change_sent_at
  ) VALUES
    -- Administrador principal
    (admin_uuid, '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated',
     'admin@cleansenso.pe', crypt('Admin2026!', gen_salt('bf', 10)), now(), now(), now(),
     jsonb_build_object('full_name', 'Carlos Alvarado', 'role', 'admin'),
     jsonb_build_object('provider', 'email', 'providers', ARRAY['email']::TEXT[]),
     false, false, '', null, '', null, '', '', null, '', 0, '', null, null, '', '', null),
    -- Supervisor
    (super_uuid, '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated',
     'supervisor@cleansenso.pe', crypt('Super2026!', gen_salt('bf', 10)), now(), now(), now(),
     jsonb_build_object('full_name', 'María Torres', 'role', 'supervisor'),
     jsonb_build_object('provider', 'email', 'providers', ARRAY['email']::TEXT[]),
     false, false, '', null, '', null, '', '', null, '', 0, '', null, null, '', '', null),
    -- Cliente de prueba
    (client_uuid, '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated',
     'cliente@cleansenso.pe', crypt('Cliente2026!', gen_salt('bf', 10)), now(), now(), now(),
     jsonb_build_object('full_name', 'Gerardo Huamán Torres', 'role', 'cliente'),
     jsonb_build_object('provider', 'email', 'providers', ARRAY['email']::TEXT[]),
     false, false, '', null, '', null, '', '', null, '', 0, '', null, null, '', '', null)
  ON CONFLICT (id) DO NOTHING;

  -- ── Clientes del negocio ─────────────────────────────────────────────────

  INSERT INTO public.clients (
    id, code, name, doc_type, doc_number, client_type, district, phone, email,
    status, contact_name, address, total_quotes, last_service_date, registered_by
  ) VALUES
    (cli_001, 'CLI-001', 'Empresa Inmobiliaria Rímac S.A.C.', 'RUC', '20512345678', 'empresa',
     'Rímac', '+51 987 654 321', 'administracion@inmorimac.pe', 'activo',
     'Gerardo Huamán Torres', 'Av. Túpac Amaru 890, Rímac', 5, '01/09/2026', admin_uuid),
    (cli_002, 'CLI-002', 'Residencial Los Álamos', 'RUC', '20487651234', 'empresa',
     'Miraflores', '+51 991 234 567', 'junta@residencialalamos.pe', 'activo',
     'Rosa Mendoza Quispe', 'Calle Los Álamos 245, Miraflores', 8, '28/08/2026', admin_uuid),
    (cli_003, 'CLI-003', 'Clínica San Borja S.A.', 'RUC', '20156789012', 'empresa',
     'San Borja', '+51 01 225 8800', 'logistica@clinicasanborja.pe', 'activo',
     'Marco Delgado Castillo', 'Av. Guardia Civil 385, San Borja', 12, '04/09/2026', admin_uuid),
    (cli_004, 'CLI-004', 'Almacenes Del Centro E.I.R.L.', 'RUC', '20345678901', 'empresa',
     'Cercado de Lima', '+51 942 111 222', 'operaciones@almacentro.pe', 'activo',
     'Luis Vargas Romero', 'Jr. Paruro 567, Cercado de Lima', 3, '15/08/2026', admin_uuid),
    (cli_005, 'CLI-005', 'Patricia Rodríguez Vega', 'DNI', '43567891', 'persona_natural',
     'Surco', '+51 998 765 432', 'patricia.rodriguez@gmail.com', 'activo',
     'Patricia Rodríguez Vega', 'Calle Los Rosales 123, Surco', 4, '06/09/2026', admin_uuid),
    (cli_006, 'CLI-006', 'Torre Empresarial Javier Prado', 'RUC', '20609876543', 'empresa',
     'San Isidro', '+51 01 441 5500', 'facilities@torrejp.pe', 'activo',
     'Andrea Flores Suárez', 'Av. Javier Prado Este 1234, San Isidro', 15, '07/09/2026', admin_uuid),
    (cli_007, 'CLI-007', 'Restaurante La Tradición S.R.L.', 'RUC', '20512987654', 'empresa',
     'Barranco', '+51 965 432 109', 'administracion@latradicion.pe', 'inactivo',
     'Fernando Chávez Pinto', 'Jr. Grau 89, Barranco', 2, '10/07/2026', admin_uuid),
    (cli_008, 'CLI-008', 'Edificio Residencial Parque Norte', 'RUC', '20401234567', 'empresa',
     'Jesús María', '+51 01 463 9900', 'junta@parquenorte.pe', 'activo',
     'Carmen Villanueva López', 'Av. Salaverry 2456, Jesús María', 7, '02/09/2026', admin_uuid)
  ON CONFLICT (id) DO NOTHING;

  -- ── Catálogo de servicios ────────────────────────────────────────────────

  INSERT INTO public.services (
    id, code, name, description, category, base_price_m2, min_surface_m2,
    staff_per_100m2, duration_hours, status, includes, created_by
  ) VALUES
    (svc_001, 'SVC-001', 'Limpieza de Oficinas',
     'Servicio completo de limpieza para espacios de trabajo: pisos, escritorios, baños y áreas comunes.',
     'limpieza_general', 2.50, 20, 1, 3.0, 'activo',
     ARRAY['Limpieza de pisos', 'Desinfección de baños', 'Limpieza de escritorios', 'Vaciado de papeleras'],
     admin_uuid),
    (svc_002, 'SVC-002', 'Lavado de Alfombras',
     'Lavado profundo con equipos especializados y productos de alta eficacia.',
     'lavado', 4.50, 10, 1, 2.0, 'activo',
     ARRAY['Aspirado previo', 'Aplicación de espuma', 'Lavado a presión', 'Secado rápido'],
     admin_uuid),
    (svc_003, 'SVC-003', 'Desinfección Post-Obra',
     'Limpieza y desinfección profunda después de trabajos de construcción o remodelación.',
     'desinfeccion', 5.00, 30, 2, 5.0, 'activo',
     ARRAY['Retiro de escombros menores', 'Limpieza de polvo de obra', 'Desinfección de superficies', 'Limpieza de ventanas'],
     admin_uuid),
    (svc_004, 'SVC-004', 'Limpieza de Almacenes',
     'Servicio especializado para almacenes y depósitos industriales.',
     'limpieza_especializada', 1.80, 50, 1, 4.0, 'activo',
     ARRAY['Barrido industrial', 'Limpieza de estanterías', 'Desinfección de pisos', 'Retiro de residuos'],
     admin_uuid),
    (svc_005, 'SVC-005', 'Lavado de Sillones y Sillas',
     'Lavado y desinfección de tapizados, sillones de oficina y sillas de sala.',
     'lavado', 35.00, 1, 1, 1.5, 'activo',
     ARRAY['Aspirado de tapizado', 'Aplicación de limpiador especializado', 'Cepillado', 'Secado'],
     admin_uuid)
  ON CONFLICT (id) DO NOTHING;

  -- ── Personal operativo ───────────────────────────────────────────────────

  INSERT INTO public.staff_members (id, name, specialty, phone, is_active) VALUES
    (stf_001, 'Miguel Quispe', 'Limpieza general', '+51 987 001 001', true),
    (stf_002, 'Ana Flores', 'Lavado especializado', '+51 987 001 002', true),
    (stf_003, 'Juan Ccopa', 'Limpieza general', '+51 987 001 003', true),
    (stf_004, 'Luis Mamani', 'Desinfección', '+51 987 001 004', true),
    (stf_005, 'Rosa Tito', 'Alfombras y tapizados', '+51 987 001 005', true)
  ON CONFLICT (id) DO NOTHING;

  -- ── Cotizaciones de prueba ───────────────────────────────────────────────

  INSERT INTO public.quotes (
    id, code, client_id, service_type, surface_m2, staff_count, district, address,
    scheduled_date, valid_days, expires_at, subtotal, igv, total_soles, status, created_by
  ) VALUES
    (q_001, 'COT-2026-001', cli_001, 'Limpieza de Oficinas', 320, 3, 'Rímac',
     'Av. Túpac Amaru 890', '2026-09-15', 14, '2026-09-29', 720.34, 129.66, 850.00, 'aceptada', admin_uuid),
    (q_002, 'COT-2026-002', cli_002, 'Lavado de Alfombras', 180, 2, 'Miraflores',
     'Calle Los Álamos 245', '2026-09-16', 14, '2026-09-30', 457.63, 82.37, 540.00, 'enviada', admin_uuid),
    (q_003, 'COT-2026-003', cli_003, 'Desinfección Post-Obra', 600, 5, 'San Borja',
     'Av. Guardia Civil 385', '2026-09-11', 14, '2026-09-25', 1779.66, 320.34, 2100.00, 'aceptada', admin_uuid),
    (q_004, 'COT-2026-004', cli_004, 'Limpieza de Almacenes', 850, 6, 'Cercado de Lima',
     'Jr. Paruro 567', '2026-09-19', 14, '2026-10-03', 2372.88, 427.12, 2800.00, 'borrador', admin_uuid),
    (q_005, 'COT-2026-005', cli_005, 'Lavado de Sillones', 45, 1, 'Surco',
     'Calle Los Rosales 123', '2026-09-18', 14, '2026-10-02', 152.54, 27.46, 180.00, 'aceptada', admin_uuid),
    (q_006, 'COT-2026-006', cli_006, 'Limpieza de Oficinas', 2400, 12, 'San Isidro',
     'Av. Javier Prado Este 1234', '2026-09-08', 14, '2026-09-22', 5254.24, 945.76, 6200.00, 'aceptada', admin_uuid)
  ON CONFLICT (id) DO NOTHING;

  -- ── Citas de prueba ──────────────────────────────────────────────────────

  INSERT INTO public.appointments (
    id, code, client_id, quote_id, service_type, address, district,
    service_date, start_time, end_time, shift, status, service_order_code, has_conflict, created_by
  ) VALUES
    (apt_001, 'CITA-2026-018', cli_001, q_001, 'Limpieza de Oficinas',
     'Av. Túpac Amaru 890', 'Rímac', '2026-09-15', '08:00', '12:00', 'mañana', 'confirmada', 'OS-2026-018', false, admin_uuid),
    (apt_002, 'CITA-2026-019', cli_003, q_003, 'Desinfección Post-Obra',
     'Av. Guardia Civil 385', 'San Borja', '2026-09-11', '09:00', '14:00', 'mañana', 'confirmada', 'OS-2026-019', true, admin_uuid),
    (apt_003, 'CITA-2026-020', cli_008, null, 'Limpieza de Condominios',
     'Av. Salaverry 2456', 'Jesús María', '2026-09-16', '14:00', '18:00', 'tarde', 'programada', null, false, admin_uuid),
    (apt_004, 'CITA-2026-021', cli_005, q_005, 'Lavado de Sillones',
     'Calle Los Rosales 123', 'Surco', '2026-09-18', '15:00', '17:00', 'tarde', 'programada', null, false, admin_uuid)
  ON CONFLICT (id) DO NOTHING;

  -- Asignación de personal a citas
  INSERT INTO public.appointment_staff (appointment_id, staff_id) VALUES
    (apt_001, stf_001), (apt_001, stf_002), (apt_001, stf_003),
    (apt_002, stf_004), (apt_002, stf_005),
    (apt_003, stf_001), (apt_003, stf_002),
    (apt_004, stf_003)
  ON CONFLICT DO NOTHING;

  -- ── Notificaciones de prueba ─────────────────────────────────────────────

  INSERT INTO public.notifications (user_id, type, title, message, is_read) VALUES
    (admin_uuid, 'conflicto_agenda', 'Conflicto de horario detectado',
     'La cita CITA-2026-019 tiene solapamiento de personal con otra cita el 11/09/2026.', false),
    (admin_uuid, 'cotizacion_aceptada', 'Cotización aceptada',
     'El cliente Torre Empresarial Javier Prado aceptó la cotización COT-2026-006 por S/ 6,200.', true),
    (admin_uuid, 'cita_recordatorio', 'Recordatorio de cita mañana',
     'Cita CITA-2026-018 programada para mañana 15/09/2026 a las 08:00 en Rímac.', false),
    (super_uuid, 'nuevo_cliente', 'Nuevo cliente registrado',
     'Se registró el cliente Farmacia Vida Sana S.A.C. como prospecto.', false)
  ON CONFLICT (id) DO NOTHING;

EXCEPTION
  WHEN OTHERS THEN
    RAISE NOTICE 'Error al insertar datos de prueba: %', SQLERRM;
END $$;
