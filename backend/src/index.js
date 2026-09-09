/**
 * CleanSenso — Backend API principal
 * Node.js + Express + PostgreSQL
 * Rutas: /api/auth, /api/clients, /api/quotes, /api/appointments, /api/services, /api/notifications
 * Autenticación: JWT (JSON Web Tokens) con expiración de 8 horas
 */

// Carga las variables de entorno desde el archivo .env
require('dotenv').config();
const express = require('express');
const cors = require('cors');
const { Pool } = require('pg');       // Cliente de PostgreSQL
const bcrypt = require('bcryptjs');   // Hashing de contraseñas
const jwt = require('jsonwebtoken');  // Generación y verificación de tokens JWT

const app = express();
const PORT = process.env.PORT || 4000;
// Clave secreta para firmar los tokens JWT (usar variable de entorno en producción)
const JWT_SECRET = process.env.JWT_SECRET || 'cleansenso_secret_2026';

// ── Conexión a PostgreSQL ──────────────────────────────────────────────────────
// Pool de conexiones para manejar múltiples requests simultáneos
const pool = new Pool({
  connectionString: process.env.DATABASE_URL ||
    'postgresql://cleansenso_user:cleansenso_pass@localhost:5432/cleansenso',
});

// ── Middlewares globales ───────────────────────────────────────────────────────
// CORS: permite requests desde el frontend (Next.js)
app.use(cors({ origin: process.env.FRONTEND_URL || 'http://localhost:3000', credentials: true }));
// Parsea el body de los requests como JSON
app.use(express.json());

// ── Middleware de autenticación JWT ───────────────────────────────────────────
// Verifica que el token JWT sea válido antes de procesar la ruta protegida
function authMiddleware(req, res, next) {
  // Extrae el token del header Authorization: "Bearer <token>"
  const token = req.headers.authorization?.split(' ')[1];
  if (!token) return res.status(401).json({ error: 'Token requerido' });
  try {
    // Verifica y decodifica el token — adjunta el payload al request
    req.user = jwt.verify(token, JWT_SECRET);
    next();
  } catch {
    return res.status(401).json({ error: 'Token inválido o expirado' });
  }
}

// ── Middleware de rol admin ────────────────────────────────────────────────────
// Solo permite el acceso a usuarios con rol "admin"
function adminOnly(req, res, next) {
  if (req.user?.role !== 'admin') return res.status(403).json({ error: 'Solo administradores' });
  next();
}

// =============================================================================
// RUTAS DE AUTENTICACIÓN
// =============================================================================

/**
 * POST /api/auth/login
 * Body: { email, password }
 * Retorna: { token, user: { id, email, full_name, role } }
 * Verifica credenciales contra la base de datos y genera un token JWT
 */
app.post('/api/auth/login', async (req, res) => {
  const { email, password } = req.body;
  if (!email || !password) return res.status(400).json({ error: 'Email y contraseña requeridos' });

  try {
    // Busca el usuario activo por email
    const { rows } = await pool.query(
      'SELECT * FROM user_profiles WHERE email = $1 AND is_active = true', [email]
    );
    const user = rows[0];
    if (!user) return res.status(401).json({ error: 'Credenciales incorrectas' });

    // Compara la contraseña con el hash almacenado
    const valid = await bcrypt.compare(password, user.password_hash);
    if (!valid) return res.status(401).json({ error: 'Credenciales incorrectas' });

    // Genera el token JWT con datos del usuario, expira en 8 horas
    const token = jwt.sign(
      { id: user.id, email: user.email, role: user.role, full_name: user.full_name },
      JWT_SECRET,
      { expiresIn: '8h' }
    );

    res.json({
      token,
      user: { id: user.id, email: user.email, full_name: user.full_name, role: user.role }
    });
  } catch (err) {
    res.status(500).json({ error: 'Error interno del servidor' });
  }
});

/**
 * GET /api/auth/me
 * Requiere: token JWT válido
 * Retorna el perfil completo del usuario autenticado
 */
app.get('/api/auth/me', authMiddleware, async (req, res) => {
  try {
    const { rows } = await pool.query(
      'SELECT id, email, full_name, role, phone, avatar_url, is_active, created_at FROM user_profiles WHERE id = $1',
      [req.user.id]
    );
    if (!rows[0]) return res.status(404).json({ error: 'Usuario no encontrado' });
    res.json(rows[0]);
  } catch {
    res.status(500).json({ error: 'Error interno' });
  }
});

/**
 * PUT /api/auth/password
 * Body: { currentPassword, newPassword }
 * Actualiza la contraseña del usuario autenticado después de verificar la actual
 */
app.put('/api/auth/password', authMiddleware, async (req, res) => {
  const { currentPassword, newPassword } = req.body;
  if (!currentPassword || !newPassword) return res.status(400).json({ error: 'Campos requeridos' });

  try {
    // Obtiene el hash actual para verificación
    const { rows } = await pool.query('SELECT password_hash FROM user_profiles WHERE id = $1', [req.user.id]);
    const valid = await bcrypt.compare(currentPassword, rows[0].password_hash);
    if (!valid) return res.status(401).json({ error: 'Contraseña actual incorrecta' });

    // Genera nuevo hash y actualiza en la base de datos
    const hash = await bcrypt.hash(newPassword, 10);
    await pool.query('UPDATE user_profiles SET password_hash = $1 WHERE id = $2', [hash, req.user.id]);
    res.json({ message: 'Contraseña actualizada correctamente' });
  } catch {
    res.status(500).json({ error: 'Error interno' });
  }
});

// =============================================================================
// RUTAS DE USUARIOS (solo admin)
// =============================================================================

/**
 * GET /api/users
 * Lista todos los usuarios del sistema (solo administradores)
 */
app.get('/api/users', authMiddleware, adminOnly, async (req, res) => {
  const { rows } = await pool.query(
    'SELECT id, email, full_name, role, phone, is_active, created_at FROM user_profiles ORDER BY created_at DESC'
  );
  res.json(rows);
});

/**
 * POST /api/users
 * Crea un nuevo usuario con rol admin o supervisor (solo administradores)
 * Body: { email, full_name, password, role }
 */
app.post('/api/users', authMiddleware, adminOnly, async (req, res) => {
  const { email, full_name, password, role } = req.body;
  if (!email || !full_name || !password) return res.status(400).json({ error: 'Campos requeridos' });
  if (!['admin', 'supervisor'].includes(role)) return res.status(400).json({ error: 'Rol inválido' });

  try {
    // Hashea la contraseña antes de guardar
    const hash = await bcrypt.hash(password, 10);
    const { rows } = await pool.query(
      'INSERT INTO user_profiles (email, full_name, password_hash, role) VALUES ($1,$2,$3,$4) RETURNING id, email, full_name, role',
      [email, full_name, hash, role]
    );
    res.status(201).json(rows[0]);
  } catch (err) {
    // Error 23505 = violación de constraint UNIQUE (email duplicado)
    if (err.code === '23505') return res.status(409).json({ error: 'El correo ya está registrado' });
    res.status(500).json({ error: 'Error interno' });
  }
});

// =============================================================================
// RUTAS DE CLIENTES
// =============================================================================

/**
 * GET /api/clients
 * Lista clientes con filtros opcionales por búsqueda, estado y tipo
 * Query params: search, status, type
 */
app.get('/api/clients', authMiddleware, async (req, res) => {
  const { search, status, type } = req.query;
  // Construye la query dinámicamente según los filtros recibidos
  let query = 'SELECT * FROM clients WHERE 1=1';
  const params = [];

  if (search) {
    params.push(`%${search}%`);
    // Busca en nombre, número de documento y email
    query += ` AND (name ILIKE $${params.length} OR doc_number ILIKE $${params.length} OR email ILIKE $${params.length})`;
  }
  if (status) { params.push(status); query += ` AND status = $${params.length}`; }
  if (type)   { params.push(type);   query += ` AND client_type = $${params.length}`; }

  query += ' ORDER BY created_at DESC';
  const { rows } = await pool.query(query, params);
  res.json(rows);
});

/** GET /api/clients/:id — Obtiene un cliente por su ID */
app.get('/api/clients/:id', authMiddleware, async (req, res) => {
  const { rows } = await pool.query('SELECT * FROM clients WHERE id = $1', [req.params.id]);
  if (!rows[0]) return res.status(404).json({ error: 'Cliente no encontrado' });
  res.json(rows[0]);
});

/**
 * POST /api/clients
 * Crea un nuevo cliente en la base de datos
 * Body: { code, name, doc_type, doc_number, client_type, district, phone, email, status, contact_name, address }
 */
app.post('/api/clients', authMiddleware, async (req, res) => {
  const { code, name, doc_type, doc_number, client_type, district, phone, email, status, contact_name, address } = req.body;
  try {
    const { rows } = await pool.query(
      `INSERT INTO clients (code,name,doc_type,doc_number,client_type,district,phone,email,status,contact_name,address,created_by)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12) RETURNING *`,
      [code, name, doc_type, doc_number, client_type, district, phone, email, status, contact_name, address, req.user.id]
    );
    res.status(201).json(rows[0]);
  } catch (err) {
    if (err.code === '23505') return res.status(409).json({ error: 'Código o documento ya existe' });
    res.status(500).json({ error: 'Error interno' });
  }
});

/**
 * PUT /api/clients/:id
 * Actualiza los datos de un cliente existente
 */
app.put('/api/clients/:id', authMiddleware, async (req, res) => {
  const { name, doc_type, doc_number, client_type, district, phone, email, status, contact_name, address } = req.body;
  const { rows } = await pool.query(
    `UPDATE clients SET name=$1,doc_type=$2,doc_number=$3,client_type=$4,district=$5,phone=$6,email=$7,status=$8,contact_name=$9,address=$10
     WHERE id=$11 RETURNING *`,
    [name, doc_type, doc_number, client_type, district, phone, email, status, contact_name, address, req.params.id]
  );
  if (!rows[0]) return res.status(404).json({ error: 'Cliente no encontrado' });
  res.json(rows[0]);
});

/**
 * DELETE /api/clients/:id
 * Elimina un cliente (solo administradores)
 */
app.delete('/api/clients/:id', authMiddleware, adminOnly, async (req, res) => {
  await pool.query('DELETE FROM clients WHERE id = $1', [req.params.id]);
  res.json({ message: 'Cliente eliminado' });
});

// =============================================================================
// RUTAS DE COTIZACIONES
// =============================================================================

/**
 * GET /api/quotes
 * Lista cotizaciones con join a clientes y filtros opcionales
 * Query params: status, search
 */
app.get('/api/quotes', authMiddleware, async (req, res) => {
  const { status, search } = req.query;
  // Join con clients para obtener el nombre del cliente
  let query = `SELECT q.*, c.name as client_name FROM quotes q JOIN clients c ON q.client_id = c.id WHERE 1=1`;
  const params = [];

  if (status) { params.push(status); query += ` AND q.status = $${params.length}`; }
  if (search) { params.push(`%${search}%`); query += ` AND (q.code ILIKE $${params.length} OR c.name ILIKE $${params.length})`; }

  query += ' ORDER BY q.created_at DESC';
  const { rows } = await pool.query(query, params);
  res.json(rows);
});

/** GET /api/quotes/:id — Obtiene una cotización con datos del cliente */
app.get('/api/quotes/:id', authMiddleware, async (req, res) => {
  const { rows } = await pool.query(
    'SELECT q.*, c.name as client_name FROM quotes q JOIN clients c ON q.client_id = c.id WHERE q.id = $1',
    [req.params.id]
  );
  if (!rows[0]) return res.status(404).json({ error: 'Cotización no encontrada' });
  res.json(rows[0]);
});

/**
 * POST /api/quotes
 * Crea una nueva cotización en la base de datos
 * Body: { code, client_id, service_type, surface_m2, staff_count, district, address, scheduled_date, valid_days, expires_at, subtotal, igv, total_soles, status, notes }
 */
app.post('/api/quotes', authMiddleware, async (req, res) => {
  const { code, client_id, service_type, surface_m2, staff_count, district, address, scheduled_date, valid_days, expires_at, subtotal, igv, total_soles, status, notes } = req.body;
  try {
    const { rows } = await pool.query(
      `INSERT INTO quotes (code,client_id,service_type,surface_m2,staff_count,district,address,scheduled_date,valid_days,expires_at,subtotal,igv,total_soles,status,notes,created_by)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16) RETURNING *`,
      [code, client_id, service_type, surface_m2, staff_count, district, address, scheduled_date, valid_days, expires_at, subtotal, igv, total_soles, status || 'borrador', notes, req.user.id]
    );
    res.status(201).json(rows[0]);
  } catch (err) {
    if (err.code === '23505') return res.status(409).json({ error: 'Código ya existe' });
    res.status(500).json({ error: 'Error interno' });
  }
});

/**
 * PUT /api/quotes/:id
 * Actualiza el estado y datos de una cotización existente
 */
app.put('/api/quotes/:id', authMiddleware, async (req, res) => {
  const { status, notes, surface_m2, staff_count, scheduled_date, subtotal, igv, total_soles } = req.body;
  const { rows } = await pool.query(
    `UPDATE quotes SET status=$1,notes=$2,surface_m2=$3,staff_count=$4,scheduled_date=$5,subtotal=$6,igv=$7,total_soles=$8 WHERE id=$9 RETURNING *`,
    [status, notes, surface_m2, staff_count, scheduled_date, subtotal, igv, total_soles, req.params.id]
  );
  if (!rows[0]) return res.status(404).json({ error: 'Cotización no encontrada' });
  res.json(rows[0]);
});

// =============================================================================
// RUTAS DE CITAS
// =============================================================================

/**
 * GET /api/appointments
 * Lista citas con join a clientes y filtros opcionales
 * Query params: status, date_from, date_to
 */
app.get('/api/appointments', authMiddleware, async (req, res) => {
  const { status, date_from, date_to } = req.query;
  let query = `SELECT a.*, c.name as client_name FROM appointments a JOIN clients c ON a.client_id = c.id WHERE 1=1`;
  const params = [];

  if (status)    { params.push(status);    query += ` AND a.status = $${params.length}`; }
  if (date_from) { params.push(date_from); query += ` AND a.service_date >= $${params.length}`; }
  if (date_to)   { params.push(date_to);   query += ` AND a.service_date <= $${params.length}`; }

  // Ordena por fecha y hora de inicio
  query += ' ORDER BY a.service_date ASC, a.start_time ASC';
  const { rows } = await pool.query(query, params);
  res.json(rows);
});

/**
 * POST /api/appointments
 * Crea una nueva cita y la agrega a la agenda
 * Body: { code, client_id, quote_id, service_type, address, district, service_date, start_time, end_time, shift, notes }
 */
app.post('/api/appointments', authMiddleware, async (req, res) => {
  const { code, client_id, quote_id, service_type, address, district, service_date, start_time, end_time, shift, notes } = req.body;
  try {
    const { rows } = await pool.query(
      `INSERT INTO appointments (code,client_id,quote_id,service_type,address,district,service_date,start_time,end_time,shift,notes,created_by)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12) RETURNING *`,
      [code, client_id, quote_id || null, service_type, address, district, service_date, start_time, end_time, shift, notes, req.user.id]
    );
    res.status(201).json(rows[0]);
  } catch (err) {
    if (err.code === '23505') return res.status(409).json({ error: 'Código ya existe' });
    res.status(500).json({ error: 'Error interno' });
  }
});

/**
 * PUT /api/appointments/:id
 * Actualiza el estado, horario o notas de una cita existente
 */
app.put('/api/appointments/:id', authMiddleware, async (req, res) => {
  const { status, notes, start_time, end_time, service_date } = req.body;
  const { rows } = await pool.query(
    `UPDATE appointments SET status=$1,notes=$2,start_time=$3,end_time=$4,service_date=$5 WHERE id=$6 RETURNING *`,
    [status, notes, start_time, end_time, service_date, req.params.id]
  );
  if (!rows[0]) return res.status(404).json({ error: 'Cita no encontrada' });
  res.json(rows[0]);
});

// =============================================================================
// RUTAS DE SERVICIOS
// =============================================================================

/**
 * GET /api/services
 * Lista el catálogo de servicios con filtro opcional por estado
 * Query params: status
 */
app.get('/api/services', authMiddleware, async (req, res) => {
  const { status } = req.query;
  let query = 'SELECT * FROM services WHERE 1=1';
  const params = [];
  if (status) { params.push(status); query += ` AND status = $${params.length}`; }
  query += ' ORDER BY created_at DESC';
  const { rows } = await pool.query(query, params);
  res.json(rows);
});

/**
 * POST /api/services
 * Crea un nuevo servicio en el catálogo (solo administradores)
 * Body: { code, name, description, category, base_price_m2, min_surface_m2, staff_per_100m2, duration_hours, status, includes }
 */
app.post('/api/services', authMiddleware, adminOnly, async (req, res) => {
  const { code, name, description, category, base_price_m2, min_surface_m2, staff_per_100m2, duration_hours, status, includes } = req.body;
  try {
    const { rows } = await pool.query(
      `INSERT INTO services (code,name,description,category,base_price_m2,min_surface_m2,staff_per_100m2,duration_hours,status,includes,created_by)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11) RETURNING *`,
      [code, name, description, category, base_price_m2, min_surface_m2, staff_per_100m2, duration_hours, status || 'activo', includes || [], req.user.id]
    );
    res.status(201).json(rows[0]);
  } catch (err) {
    if (err.code === '23505') return res.status(409).json({ error: 'Código ya existe' });
    res.status(500).json({ error: 'Error interno' });
  }
});

/**
 * PUT /api/services/:id
 * Actualiza nombre, descripción, precio o estado de un servicio (solo administradores)
 */
app.put('/api/services/:id', authMiddleware, adminOnly, async (req, res) => {
  const { name, description, base_price_m2, status } = req.body;
  const { rows } = await pool.query(
    'UPDATE services SET name=$1,description=$2,base_price_m2=$3,status=$4 WHERE id=$5 RETURNING *',
    [name, description, base_price_m2, status, req.params.id]
  );
  if (!rows[0]) return res.status(404).json({ error: 'Servicio no encontrado' });
  res.json(rows[0]);
});

/**
 * DELETE /api/services/:id
 * Elimina un servicio del catálogo (solo administradores)
 */
app.delete('/api/services/:id', authMiddleware, adminOnly, async (req, res) => {
  await pool.query('DELETE FROM services WHERE id = $1', [req.params.id]);
  res.json({ message: 'Servicio eliminado' });
});

// =============================================================================
// RUTAS DE NOTIFICACIONES
// =============================================================================

/**
 * GET /api/notifications
 * Obtiene las últimas 50 notificaciones del usuario autenticado
 */
app.get('/api/notifications', authMiddleware, async (req, res) => {
  const { rows } = await pool.query(
    'SELECT * FROM notifications WHERE user_id = $1 ORDER BY created_at DESC LIMIT 50',
    [req.user.id]
  );
  res.json(rows);
});

/**
 * PUT /api/notifications/:id/read
 * Marca una notificación específica como leída
 */
app.put('/api/notifications/:id/read', authMiddleware, async (req, res) => {
  await pool.query('UPDATE notifications SET is_read = true WHERE id = $1 AND user_id = $2', [req.params.id, req.user.id]);
  res.json({ message: 'Notificación marcada como leída' });
});

// =============================================================================
// RUTAS DE REPORTES / ESTADÍSTICAS
// =============================================================================

/**
 * GET /api/stats/dashboard
 * Retorna las métricas principales para el dashboard:
 * clientes activos, cotizaciones activas, citas próximas e ingresos totales
 */
app.get('/api/stats/dashboard', authMiddleware, async (req, res) => {
  try {
    // Ejecuta todas las consultas en paralelo para mejor rendimiento
    const [clients, quotes, appointments, revenue] = await Promise.all([
      pool.query("SELECT COUNT(*) FROM clients WHERE status = 'activo'"),
      pool.query("SELECT COUNT(*) FROM quotes WHERE status IN ('enviada','aceptada')"),
      pool.query("SELECT COUNT(*) FROM appointments WHERE service_date >= CURRENT_DATE"),
      pool.query("SELECT COALESCE(SUM(total_soles),0) as total FROM quotes WHERE status = 'aceptada'"),
    ]);
    res.json({
      active_clients: parseInt(clients.rows[0].count),
      active_quotes: parseInt(quotes.rows[0].count),
      upcoming_appointments: parseInt(appointments.rows[0].count),
      total_revenue: parseFloat(revenue.rows[0].total),
    });
  } catch {
    res.status(500).json({ error: 'Error al obtener estadísticas' });
  }
});

// ── Health check ───────────────────────────────────────────────────────────────
// Endpoint para verificar que el servidor está funcionando correctamente
app.get('/health', (req, res) => res.json({ status: 'ok', service: 'CleanSenso API', version: '1.0.0' }));

// ── Iniciar servidor ───────────────────────────────────────────────────────────
app.listen(PORT, () => {
  console.log(`✅ CleanSenso API corriendo en http://localhost:${PORT}`);
  console.log(`📊 Base de datos: ${process.env.DATABASE_URL || 'postgresql://localhost:5432/cleansenso'}`);
});
