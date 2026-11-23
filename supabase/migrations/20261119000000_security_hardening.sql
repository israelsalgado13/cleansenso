-- =============================================================================
-- CleanSenso — Endurecimiento de seguridad (migración ADITIVA)
-- Fecha: 2026-11-19
--
-- No modifica la migración inicial (20260909193727_cleansenso_full_schema.sql);
-- la complementa. Es idempotente: se puede ejecutar más de una vez.
--
-- Corrige:
--  1. Escalada de privilegios: cualquiera podía registrarse como admin enviando
--     role='admin' en user_metadata (handle_new_user e is_admin confiaban en él).
--  2. Un usuario podía cambiar su propio rol / is_active con UPDATE sobre user_profiles.
--  3. Cualquier usuario autenticado podía insertar notificaciones para otros usuarios.
--  4. Los montos de cotización (IGV y total) podían ser manipulados desde el cliente.
--  5. Faltaban restricciones de integridad (montos negativos, horarios invertidos...).
--  6. Funciones SECURITY DEFINER sin search_path fijo.
-- =============================================================================

-- ────────────────────────────────────────────────────────────────────────────────────────
-- 1. Alta de usuarios: el rol NUNCA viene del cliente
--    Todo registro nuevo es 'cliente'. Para crear admin/supervisor, un admin
--    actualiza user_profiles.role desde el panel o con SQL.
-- ────────────────────────────────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.user_profiles (id, email, full_name, avatar_url, role)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'full_name', split_part(NEW.email, '@', 1)),
    COALESCE(NEW.raw_user_meta_data->>'avatar_url', ''),
    'cliente'::public.user_role
  )
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END;
$$;

-- ────────────────────────────────────────────────────────────────────────────────────────
-- 2. Funciones de autorización basadas en user_profiles (no en user_metadata,
--    que el propio usuario puede editar). SECURITY DEFINER evita la recursión de RLS.
--    Además exigen is_active = true.
-- ────────────────────────────────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_profiles up
    WHERE up.id = auth.uid()
      AND up.is_active
      AND up.role = 'admin'::public.user_role
  );
$$;

CREATE OR REPLACE FUNCTION public.is_admin_or_supervisor()
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_profiles up
    WHERE up.id = auth.uid()
      AND up.is_active
      AND up.role IN ('admin'::public.user_role, 'supervisor'::public.user_role)
  );
$$;

-- set_updated_at también con search_path fijo
CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;

-- ────────────────────────────────────────────────────────────────────────────────────────
-- 3. Un usuario NO puede cambiar su propio rol ni su estado activo.
--    Solo un admin (o el service_role / SQL editor, donde auth.uid() es NULL).
-- ────────────────────────────────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.prevent_profile_privilege_escalation()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF auth.uid() IS NOT NULL AND NOT public.is_admin() THEN
    IF NEW.role IS DISTINCT FROM OLD.role
       OR NEW.is_active IS DISTINCT FROM OLD.is_active THEN
      RAISE EXCEPTION 'No tienes permiso para modificar el rol o el estado del perfil'
        USING ERRCODE = '42501';
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_prevent_profile_escalation ON public.user_profiles;
CREATE TRIGGER trg_prevent_profile_escalation
  BEFORE UPDATE ON public.user_profiles
  FOR EACH ROW EXECUTE FUNCTION public.prevent_profile_privilege_escalation();

-- ────────────────────────────────────────────────────────────────────────────────────────
-- 4. Notificaciones: solo para uno mismo, o creadas por admin/supervisor
-- ────────────────────────────────────────────────────────────────────────────────────────
DROP POLICY IF EXISTS "system_insert_notifications" ON public.notifications;
DROP POLICY IF EXISTS "insert_own_or_staff_notifications" ON public.notifications;
CREATE POLICY "insert_own_or_staff_notifications"
ON public.notifications FOR INSERT
TO authenticated
WITH CHECK (user_id = auth.uid() OR public.is_admin_or_supervisor());

-- ────────────────────────────────────────────────────────────────────────────────────────
-- 5. Cotizaciones: IGV (18 %) y total se calculan SIEMPRE en la base de datos
--    a partir del subtotal. Se aplica en INSERT y cuando cambia algún monto,
--    por lo que no se pueden falsear desde el cliente. Las filas existentes
--    no se modifican.
-- ────────────────────────────────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.compute_quote_totals()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  NEW.subtotal    := round(NEW.subtotal, 2);
  NEW.igv         := round(NEW.subtotal * 0.18, 2);
  NEW.total_soles := NEW.subtotal + NEW.igv;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_quotes_compute_totals_ins ON public.quotes;
CREATE TRIGGER trg_quotes_compute_totals_ins
  BEFORE INSERT ON public.quotes
  FOR EACH ROW EXECUTE FUNCTION public.compute_quote_totals();

DROP TRIGGER IF EXISTS trg_quotes_compute_totals_upd ON public.quotes;
CREATE TRIGGER trg_quotes_compute_totals_upd
  BEFORE UPDATE ON public.quotes
  FOR EACH ROW
  WHEN (OLD.subtotal IS DISTINCT FROM NEW.subtotal
     OR OLD.igv IS DISTINCT FROM NEW.igv
     OR OLD.total_soles IS DISTINCT FROM NEW.total_soles)
  EXECUTE FUNCTION public.compute_quote_totals();

-- ────────────────────────────────────────────────────────────────────────────────────────
-- 6. Restricciones de integridad. NOT VALID: se aplican a filas nuevas/editadas
--    sin fallar por datos históricos. Para validar el histórico, después:
--      ALTER TABLE public.quotes VALIDATE CONSTRAINT quotes_amounts_nonneg;
--    (y análogamente para las demás)
-- ────────────────────────────────────────────────────────────────────────────────────────
ALTER TABLE public.quotes DROP CONSTRAINT IF EXISTS quotes_amounts_nonneg;
ALTER TABLE public.quotes
  ADD CONSTRAINT quotes_amounts_nonneg
  CHECK (subtotal >= 0 AND igv >= 0 AND total_soles >= 0) NOT VALID;

ALTER TABLE public.quotes DROP CONSTRAINT IF EXISTS quotes_staff_positive;
ALTER TABLE public.quotes
  ADD CONSTRAINT quotes_staff_positive CHECK (staff_count >= 1) NOT VALID;

ALTER TABLE public.quotes DROP CONSTRAINT IF EXISTS quotes_valid_days_positive;
ALTER TABLE public.quotes
  ADD CONSTRAINT quotes_valid_days_positive CHECK (valid_days > 0) NOT VALID;

ALTER TABLE public.appointments DROP CONSTRAINT IF EXISTS appointments_time_order;
ALTER TABLE public.appointments
  ADD CONSTRAINT appointments_time_order CHECK (end_time > start_time) NOT VALID;

-- ────────────────────────────────────────────────────────────────────────────────────────
-- 7. ACCIÓN MANUAL ANTES DE PRODUCCIÓN (no se ejecuta automáticamente)
--
--    La migración inicial creó usuarios de DEMOSTRACIÓN con contraseñas
--    escritas en el repositorio (admin@cleansenso.pe, supervisor@cleansenso.pe,
--    cliente@cleansenso.pe). Si este proyecto de Supabase es el de producción,
--    elimínalos o cámbiales la contraseña:
--
--      -- Opción A: eliminarlos (borra también sus perfiles por ON DELETE CASCADE)
--      -- DELETE FROM auth.users
--      --  WHERE email IN ('admin@cleansenso.pe','supervisor@cleansenso.pe','cliente@cleansenso.pe');
--
--    Antes de eliminarlos, crea tu propio usuario administrador:
--      1) Regístrate normalmente (quedarás como 'cliente').
--      2) UPDATE public.user_profiles SET role = 'admin' WHERE email = 'tu-correo@dominio.com';
--
--    También revisa en Supabase → Authentication → Providers/Settings si necesitas
--    que el registro público esté habilitado; si no, desactívalo.
-- ────────────────────────────────────────────────────────────────────────────────────────
