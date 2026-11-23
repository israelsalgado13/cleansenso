-- =============================================================================
-- CleanSenso — Endurecimiento del PostgreSQL LOCAL (se ejecuta tras init.sql)
-- Idempotente. Para una base ya existente:
--   psql "$DATABASE_URL" -f local-setup/02_hardening.sql
-- =============================================================================

-- 1. Evitar borrados en cascada silenciosos: eliminar un cliente borraba TODAS
--    sus cotizaciones y citas. Ahora se bloquea (el backend responde 409).
ALTER TABLE quotes DROP CONSTRAINT IF EXISTS quotes_client_id_fkey;
ALTER TABLE quotes
  ADD CONSTRAINT quotes_client_id_fkey
  FOREIGN KEY (client_id) REFERENCES clients(id) ON DELETE RESTRICT;

ALTER TABLE appointments DROP CONSTRAINT IF EXISTS appointments_client_id_fkey;
ALTER TABLE appointments
  ADD CONSTRAINT appointments_client_id_fkey
  FOREIGN KEY (client_id) REFERENCES clients(id) ON DELETE RESTRICT;

ALTER TABLE appointments DROP CONSTRAINT IF EXISTS appointments_quote_id_fkey;
ALTER TABLE appointments
  ADD CONSTRAINT appointments_quote_id_fkey
  FOREIGN KEY (quote_id) REFERENCES quotes(id) ON DELETE SET NULL;

-- 2. Correo de usuario único sin distinguir mayúsculas (el login busca en minúsculas)
CREATE UNIQUE INDEX IF NOT EXISTS uq_user_profiles_email_lower ON user_profiles (lower(email));

-- 3. IGV (18 %) y total calculados siempre en la base de datos
CREATE OR REPLACE FUNCTION compute_quote_totals()
RETURNS TRIGGER AS $$
BEGIN
  NEW.subtotal    := round(NEW.subtotal, 2);
  NEW.igv         := round(NEW.subtotal * 0.18, 2);
  NEW.total_soles := NEW.subtotal + NEW.igv;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_quotes_compute_totals_ins ON quotes;
CREATE TRIGGER trg_quotes_compute_totals_ins
  BEFORE INSERT ON quotes
  FOR EACH ROW EXECUTE FUNCTION compute_quote_totals();

DROP TRIGGER IF EXISTS trg_quotes_compute_totals_upd ON quotes;
CREATE TRIGGER trg_quotes_compute_totals_upd
  BEFORE UPDATE ON quotes
  FOR EACH ROW
  WHEN (OLD.subtotal IS DISTINCT FROM NEW.subtotal
     OR OLD.igv IS DISTINCT FROM NEW.igv
     OR OLD.total_soles IS DISTINCT FROM NEW.total_soles)
  EXECUTE FUNCTION compute_quote_totals();

-- 4. Restricciones de integridad (NOT VALID: no fallan por datos históricos)
ALTER TABLE quotes DROP CONSTRAINT IF EXISTS quotes_amounts_nonneg;
ALTER TABLE quotes ADD CONSTRAINT quotes_amounts_nonneg
  CHECK (subtotal >= 0 AND igv >= 0 AND total_soles >= 0) NOT VALID;

ALTER TABLE quotes DROP CONSTRAINT IF EXISTS quotes_surface_positive;
ALTER TABLE quotes ADD CONSTRAINT quotes_surface_positive CHECK (surface_m2 >= 1) NOT VALID;

ALTER TABLE quotes DROP CONSTRAINT IF EXISTS quotes_staff_positive;
ALTER TABLE quotes ADD CONSTRAINT quotes_staff_positive CHECK (staff_count >= 1) NOT VALID;

ALTER TABLE quotes DROP CONSTRAINT IF EXISTS quotes_valid_days_positive;
ALTER TABLE quotes ADD CONSTRAINT quotes_valid_days_positive CHECK (valid_days > 0) NOT VALID;

ALTER TABLE appointments DROP CONSTRAINT IF EXISTS appointments_time_order;
ALTER TABLE appointments ADD CONSTRAINT appointments_time_order CHECK (end_time > start_time) NOT VALID;

-- 5. AVISO: init.sql crea usuarios de demostración (admin@cleansenso.pe / supervisor@cleansenso.pe)
--    con contraseñas conocidas. Úsalos SOLO en desarrollo y cámbialos o bórralos
--    si esta base se expone fuera de tu máquina.
