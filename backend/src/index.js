/**
 * CleanSenso — Backend API principal
 * Node.js + Express 4 + PostgreSQL
 * Rutas: /api/auth, /api/users, /api/clients, /api/quotes, /api/appointments,
 *        /api/services, /api/notifications, /api/stats
 *
 * Seguridad (ver CAMBIOS.md):
 *  - JWT_SECRET y DATABASE_URL son obligatorios (sin valores por defecto).
 *  - El token se valida contra la base de datos en cada request (is_active y rol vigentes).
 *  - Login con límite de intentos, validación de entradas y whitelist de campos.
 *  - Los montos de las cotizaciones (IGV y total) se calculan siempre en el servidor.
 */
'use strict';

require('dotenv').config();
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const { Pool } = require('pg');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

// =============================================================================
// CONFIGURACIÓN
// =============================================================================

function requireEnv(name) {
  const value = process.env[name];
  if (!value || !value.trim()) {
    console.error(`❌ Falta la variable de entorno obligatoria: ${name}`);
    process.exit(1);
  }
  return value;
}

const JWT_SECRET = requireEnv('JWT_SECRET');
if (JWT_SECRET.length < 32) {
  console.error('❌ JWT_SECRET debe tener al menos 32 caracteres (usa: openssl rand -hex 32)');
  process.exit(1);
}
const DATABASE_URL = requireEnv('DATABASE_URL');
const PORT = Number(process.env.PORT) || 4000;
const FRONTEND_URL = process.env.FRONTEND_URL || 'http://localhost:3000';
const IGV_RATE = 0.18; // IGV Perú
const BCRYPT_ROUNDS = 12;

const pool = new Pool({ connectionString: DATABASE_URL, max: 10 });
pool.on('error', (err) => console.error('Error inesperado en el pool de PostgreSQL:', err.message));

const app = express();
if (process.env.TRUST_PROXY) {
  const tp = process.env.TRUST_PROXY;
  app.set('trust proxy', /^\d+$/.test(tp) ? Number(tp) : tp === 'true' ? true : tp);
}
app.use(helmet());
app.use(cors({ origin: FRONTEND_URL.split(',').map((s) => s.trim()), credentials: true }));
app.use(express.json({ limit: '100kb' }));

// =============================================================================
// UTILIDADES
// =============================================================================

class HttpError extends Error {
  constructor(status, message) {
    super(message);
    this.status = status;
  }
}
const bad = (msg) => new HttpError(400, msg);

// Express 4 no captura errores de handlers async: este wrapper los envía al manejador central
const ah = (fn) => (req, res, next) => Promise.resolve(fn(req, res, next)).catch(next);

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const TIME_RE = /^([01]\d|2[0-3]):[0-5]\d(:[0-5]\d)?$/;

const ENUMS = {
  user_role: ['admin', 'supervisor'],
  quote_status: ['borrador', 'enviada', 'aceptada', 'rechazada', 'vencida'],
  client_status: ['activo', 'inactivo', 'prospecto'],
  client_type: ['empresa', 'persona_natural'],
  doc_type: ['RUC', 'DNI'],
  appointment_status: ['programada', 'confirmada', 'en_progreso', 'completada', 'cancelada'],
  shift_type: ['mañana', 'tarde'],
  service_status: ['activo', 'inactivo', 'en_revision'],
  service_category: ['limpieza_general', 'limpieza_especializada', 'desinfeccion', 'lavado', 'mantenimiento'],
};

const isStr = (x) => typeof x === 'string';
const toNum = (x) => (typeof x === 'number' ? x : isStr(x) && x.trim() !== '' ? Number(x) : NaN);
const round2 = (n) => Math.round((n + Number.EPSILON) * 100) / 100;
const escapeLike = (s) => s.replace(/[\\%_]/g, '\\$&');
const toMinutes = (t) => {
  const [h, m] = t.split(':');
  return Number(h) * 60 + Number(m);
};

function isValidDate(x) {
  if (!isStr(x) || !/^\d{4}-\d{2}-\d{2}$/.test(x)) return false;
  try {
    return new Date(`${x}T00:00:00Z`).toISOString().slice(0, 10) === x;
  } catch {
    return false;
  }
}

function addDays(dateStr, days) {
  const d = new Date(`${dateStr}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + Number(days));
  return d.toISOString().slice(0, 10);
}

// ── Validadores de campos: devuelven el valor limpio o lanzan 400 ────────────
const check = {
  text: (max = 255) => (x, f) => {
    if (!isStr(x) || x.trim() === '' || x.length > max) throw bad(`${f}: texto de 1 a ${max} caracteres`);
    return x.trim();
  },
  // Columnas NOT NULL DEFAULT '' → null/'' se guardan como ''
  looseText: (max = 255) => (x, f) => {
    if (x === null || x === '') return '';
    if (!isStr(x) || x.length > max) throw bad(`${f}: texto de hasta ${max} caracteres`);
    return x.trim();
  },
  // Columnas que aceptan NULL
  nullableText: (max = 2000) => (x, f) => {
    if (x === null || x === '') return null;
    if (!isStr(x) || x.length > max) throw bad(`${f}: texto de hasta ${max} caracteres`);
    return x.trim();
  },
  looseEmail: (x, f) => {
    if (x === null || x === '') return '';
    if (!isStr(x) || x.length > 254 || !EMAIL_RE.test(x.trim())) throw bad(`${f}: correo inválido`);
    return x.trim().toLowerCase();
  },
  oneOf: (list) => (x, f) => {
    if (!list.includes(x)) throw bad(`${f}: debe ser uno de [${list.join(', ')}]`);
    return x;
  },
  uuid: (x, f) => {
    if (!isStr(x) || !UUID_RE.test(x)) throw bad(`${f}: UUID inválido`);
    return x;
  },
  nullableUuid: (x, f) => (x === null || x === '' ? null : check.uuid(x, f)),
  number: (min, max) => (x, f) => {
    const n = toNum(x);
    if (!Number.isFinite(n) || n < min || n > max) throw bad(`${f}: número entre ${min} y ${max}`);
    return n;
  },
  integer: (min, max) => (x, f) => {
    const n = toNum(x);
    if (!Number.isInteger(n) || n < min || n > max) throw bad(`${f}: entero entre ${min} y ${max}`);
    return n;
  },
  boolean: (x, f) => {
    if (typeof x !== 'boolean') throw bad(`${f}: debe ser true o false`);
    return x;
  },
  date: (x, f) => {
    if (!isValidDate(x)) throw bad(`${f}: fecha inválida (formato AAAA-MM-DD)`);
    return x;
  },
  time: (x, f) => {
    if (!isStr(x) || !TIME_RE.test(x)) throw bad(`${f}: hora inválida (formato HH:MM)`);
    return x;
  },
  textArray: (maxItems = 50, maxLen = 200) => (x, f) => {
    if (!Array.isArray(x) || x.length > maxItems) throw bad(`${f}: lista de hasta ${maxItems} elementos`);
    return x.map((item) => {
      if (!isStr(item) || item.trim() === '' || item.length > maxLen) throw bad(`${f}: elementos de texto de hasta ${maxLen} caracteres`);
      return item.trim();
    });
  },
};

const F = (fn, required = false) => ({ fn, required });
const omit = (obj, keys) => Object.fromEntries(Object.entries(obj).filter(([k]) => !keys.includes(k)));

/**
 * Valida el body contra un esquema. Solo devuelve los campos del esquema (whitelist),
 * así ningún cliente puede escribir columnas no previstas (mass assignment).
 * Con { partial: true } los campos requeridos pasan a ser opcionales (PUT parcial).
 */
function parseBody(body, schema, { partial = false } = {}) {
  if (!body || typeof body !== 'object' || Array.isArray(body)) throw bad('Se requiere un body JSON');
  const out = {};
  for (const [field, { fn, required }] of Object.entries(schema)) {
    const value = body[field];
    if (value === undefined) {
      if (required && !partial) throw bad(`${field} es requerido`);
      continue;
    }
    out[field] = fn(value, field);
  }
  return out;
}

// Los nombres de columna salen SIEMPRE de las claves de los esquemas (no del usuario)
function buildInsert(table, data) {
  const cols = Object.keys(data);
  return {
    text: `INSERT INTO ${table} (${cols.join(', ')}) VALUES (${cols.map((_, i) => `$${i + 1}`).join(', ')}) RETURNING *`,
    params: cols.map((c) => data[c]),
  };
}
function buildUpdate(table, data, id) {
  const cols = Object.keys(data);
  if (!cols.length) throw bad('No hay campos válidos para actualizar');
  return {
    text: `UPDATE ${table} SET ${cols.map((c, i) => `${c} = $${i + 1}`).join(', ')} WHERE id = $${cols.length + 1} RETURNING *`,
    params: [...cols.map((c) => data[c]), id],
  };
}

// Ejecuta una query traduciendo errores de PostgreSQL a mensajes HTTP claros
async function run(text, params, { unique, fk } = {}) {
  try {
    return await pool.query(text, params);
  } catch (err) {
    if (err.code === '23505' && unique) throw new HttpError(409, unique);
    if (err.code === '23503' && fk) throw new HttpError(409, fk);
    throw err;
  }
}

// ── Parámetros de query ──────────────────────────────────────────────────────
function queryText(value, name) {
  if (value === undefined || value === '') return undefined;
  if (!isStr(value) || value.length > 100) throw bad(`${name}: texto de hasta 100 caracteres`);
  return value.trim();
}
function queryEnum(value, list, name) {
  if (value === undefined || value === '') return undefined;
  return check.oneOf(list)(value, name);
}
function queryDate(value, name) {
  if (value === undefined || value === '') return undefined;
  return check.date(value, name);
}
function pageClause(query, params) {
  const limit = Math.min(Math.max(parseInt(query.limit, 10) || 1000, 1), 1000);
  const offset = Math.max(parseInt(query.offset, 10) || 0, 0);
  params.push(limit, offset);
  return ` LIMIT $${params.length - 1} OFFSET $${params.length}`;
}

// Valida :id en todas las rutas que lo usen (evita errores 22P02 de PostgreSQL)
app.param('id', (req, res, next, id) => (UUID_RE.test(id) ? next() : next(bad('id inválido'))));

// ── Contraseñas ──────────────────────────────────────────────────────────────
function validatePassword(p, field = 'password') {
  if (!isStr(p) || p.length < 10 || p.length > 72 || !/[A-Za-z]/.test(p) || !/\d/.test(p)) {
    throw bad(`${field}: entre 10 y 72 caracteres, con al menos una letra y un número`);
  }
  return p;
}
// Hash de relleno: login con usuario inexistente tarda lo mismo que con usuario real
const DUMMY_HASH = bcrypt.hashSync('contraseña-de-relleno-1', BCRYPT_ROUNDS);

// =============================================================================
// AUTENTICACIÓN Y AUTORIZACIÓN
// =============================================================================

/**
 * Verifica el JWT y confirma contra la BD que el usuario sigue activo.
 * El rol se toma de la BD (no del token), por lo que cambios de rol o
 * desactivaciones aplican de inmediato.
 */
const authMiddleware = ah(async (req, res, next) => {
  const match = /^Bearer (.+)$/.exec(req.headers.authorization || '');
  if (!match) throw new HttpError(401, 'Token requerido');

  let payload;
  try {
    payload = jwt.verify(match[1], JWT_SECRET, { algorithms: ['HS256'] });
  } catch {
    throw new HttpError(401, 'Token inválido o expirado');
  }
  if (!isStr(payload.id) || !UUID_RE.test(payload.id)) throw new HttpError(401, 'Token inválido');

  const { rows } = await pool.query(
    'SELECT id, email, full_name, role, is_active FROM user_profiles WHERE id = $1',
    [payload.id]
  );
  const user = rows[0];
  if (!user || !user.is_active) throw new HttpError(401, 'Usuario inactivo o inexistente');

  req.user = { id: user.id, email: user.email, full_name: user.full_name, role: user.role };
  next();
});

function adminOnly(req, res, next) {
  if (req.user?.role !== 'admin') return next(new HttpError(403, 'Solo administradores'));
  next();
}

// Máximo 10 intentos de login por IP cada 15 minutos
const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 10,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Demasiados intentos de inicio de sesión. Intenta de nuevo en 15 minutos.' },
});

// =============================================================================
// RUTAS DE AUTENTICACIÓN
// =============================================================================

/** POST /api/auth/login — Body: { email, password } → { token, user } */
app.post('/api/auth/login', loginLimiter, ah(async (req, res) => {
  const { email, password } = req.body || {};
  if (!isStr(email) || !isStr(password) || !email || !password || password.length > 200) {
    throw bad('Email y contraseña requeridos');
  }

  const { rows } = await pool.query(
    'SELECT * FROM user_profiles WHERE lower(email) = $1 AND is_active = true',
    [email.trim().toLowerCase()]
  );
  const user = rows[0];
  const valid = await bcrypt.compare(password, user ? user.password_hash : DUMMY_HASH);
  if (!user || !valid) throw new HttpError(401, 'Credenciales incorrectas');

  const token = jwt.sign(
    { id: user.id, email: user.email, role: user.role, full_name: user.full_name },
    JWT_SECRET,
    { algorithm: 'HS256', expiresIn: '8h' }
  );
  res.json({
    token,
    user: { id: user.id, email: user.email, full_name: user.full_name, role: user.role },
  });
}));

/** GET /api/auth/me — Perfil del usuario autenticado */
app.get('/api/auth/me', authMiddleware, ah(async (req, res) => {
  const { rows } = await pool.query(
    'SELECT id, email, full_name, role, phone, avatar_url, is_active, created_at FROM user_profiles WHERE id = $1',
    [req.user.id]
  );
  if (!rows[0]) throw new HttpError(404, 'Usuario no encontrado');
  res.json(rows[0]);
}));

/** PUT /api/auth/password — Body: { currentPassword, newPassword } */
app.put('/api/auth/password', authMiddleware, ah(async (req, res) => {
  const { currentPassword, newPassword } = req.body || {};
  if (!isStr(currentPassword) || !currentPassword) throw bad('currentPassword requerido');
  validatePassword(newPassword, 'newPassword');
  if (newPassword === currentPassword) throw bad('La nueva contraseña debe ser distinta de la actual');

  const { rows } = await pool.query('SELECT password_hash FROM user_profiles WHERE id = $1', [req.user.id]);
  const valid = rows[0] && (await bcrypt.compare(currentPassword, rows[0].password_hash));
  if (!valid) throw new HttpError(401, 'Contraseña actual incorrecta');

  const hash = await bcrypt.hash(newPassword, BCRYPT_ROUNDS);
  await pool.query('UPDATE user_profiles SET password_hash = $1 WHERE id = $2', [hash, req.user.id]);
  res.json({ message: 'Contraseña actualizada correctamente' });
}));

// =============================================================================
// RUTAS DE USUARIOS (solo admin)
// =============================================================================

const userCreateSchema = {
  email: F((x, f) => {
    if (!isStr(x) || x.length > 254 || !EMAIL_RE.test(x.trim())) throw bad(`${f}: correo inválido`);
    return x.trim().toLowerCase();
  }, true),
  full_name: F(check.text(150), true),
  role: F(check.oneOf(ENUMS.user_role), true),
  phone: F(check.nullableText(30)),
};
const userUpdateSchema = {
  full_name: F(check.text(150)),
  role: F(check.oneOf(ENUMS.user_role)),
  phone: F(check.nullableText(30)),
  is_active: F(check.boolean),
};

/** GET /api/users */
app.get('/api/users', authMiddleware, adminOnly, ah(async (req, res) => {
  const { rows } = await pool.query(
    'SELECT id, email, full_name, role, phone, is_active, created_at FROM user_profiles ORDER BY created_at DESC'
  );
  res.json(rows);
}));

/** POST /api/users — Body: { email, full_name, password, role } */
app.post('/api/users', authMiddleware, adminOnly, ah(async (req, res) => {
  const data = parseBody(req.body, userCreateSchema);
  validatePassword(req.body.password);
  const password_hash = await bcrypt.hash(req.body.password, BCRYPT_ROUNDS);
  const q = buildInsert('user_profiles', { ...data, password_hash });
  const { rows } = await run(
    q.text.replace('RETURNING *', 'RETURNING id, email, full_name, role, phone, is_active'),
    q.params,
    { unique: 'El correo ya está registrado' }
  );
  res.status(201).json(rows[0]);
}));

/** PUT /api/users/:id — Permite desactivar usuarios o cambiar su rol */
app.put('/api/users/:id', authMiddleware, adminOnly, ah(async (req, res) => {
  const data = parseBody(req.body, userUpdateSchema, { partial: true });
  if (req.params.id === req.user.id && (data.is_active === false || (data.role && data.role !== req.user.role))) {
    throw bad('No puedes desactivarte ni cambiar tu propio rol');
  }
  const q = buildUpdate('user_profiles', data, req.params.id);
  const { rows } = await pool.query(
    q.text.replace('RETURNING *', 'RETURNING id, email, full_name, role, phone, is_active'),
    q.params
  );
  if (!rows[0]) throw new HttpError(404, 'Usuario no encontrado');
  res.json(rows[0]);
}));

// =============================================================================
// RUTAS DE CLIENTES
// =============================================================================

const clientSchema = {
  code: F(check.text(30), true),
  name: F(check.text(200), true),
  doc_type: F(check.oneOf(ENUMS.doc_type)),
  doc_number: F(check.text(20), true),
  client_type: F(check.oneOf(ENUMS.client_type)),
  district: F(check.looseText(100)),
  phone: F(check.looseText(30)),
  email: F(check.looseEmail),
  status: F(check.oneOf(ENUMS.client_status)),
  contact_name: F(check.looseText(150)),
  address: F(check.looseText(250)),
};
const clientUpdateSchema = omit(clientSchema, ['code']);

function checkDocument(docType, docNumber) {
  const ok = docType === 'DNI' ? /^\d{8}$/.test(docNumber) : /^\d{11}$/.test(docNumber);
  if (!ok) throw bad(`doc_number no es un ${docType} válido (${docType === 'DNI' ? '8' : '11'} dígitos)`);
}

/** GET /api/clients — Filtros: search, status, type, limit, offset */
app.get('/api/clients', authMiddleware, ah(async (req, res) => {
  const params = [];
  let sql = 'SELECT * FROM clients WHERE 1=1';

  const search = queryText(req.query.search, 'search');
  if (search) {
    params.push(`%${escapeLike(search)}%`);
    const n = params.length;
    sql += ` AND (name ILIKE $${n} OR doc_number ILIKE $${n} OR email ILIKE $${n})`;
  }
  const status = queryEnum(req.query.status, ENUMS.client_status, 'status');
  if (status) { params.push(status); sql += ` AND status = $${params.length}`; }
  const type = queryEnum(req.query.type, ENUMS.client_type, 'type');
  if (type) { params.push(type); sql += ` AND client_type = $${params.length}`; }

  sql += ' ORDER BY created_at DESC' + pageClause(req.query, params);
  const { rows } = await pool.query(sql, params);
  res.json(rows);
}));

/** GET /api/clients/:id */
app.get('/api/clients/:id', authMiddleware, ah(async (req, res) => {
  const { rows } = await pool.query('SELECT * FROM clients WHERE id = $1', [req.params.id]);
  if (!rows[0]) throw new HttpError(404, 'Cliente no encontrado');
  res.json(rows[0]);
}));

/** POST /api/clients */
app.post('/api/clients', authMiddleware, ah(async (req, res) => {
  const data = parseBody(req.body, clientSchema);
  checkDocument(data.doc_type || 'RUC', data.doc_number);
  const q = buildInsert('clients', { ...data, created_by: req.user.id });
  const { rows } = await run(q.text, q.params, { unique: 'Código o documento ya existe' });
  res.status(201).json(rows[0]);
}));

/** PUT /api/clients/:id — Actualización parcial: solo cambia los campos enviados */
app.put('/api/clients/:id', authMiddleware, ah(async (req, res) => {
  const data = parseBody(req.body, clientUpdateSchema, { partial: true });
  if (data.doc_type !== undefined || data.doc_number !== undefined) {
    const { rows } = await pool.query('SELECT doc_type, doc_number FROM clients WHERE id = $1', [req.params.id]);
    if (!rows[0]) throw new HttpError(404, 'Cliente no encontrado');
    checkDocument(data.doc_type ?? rows[0].doc_type, data.doc_number ?? rows[0].doc_number);
  }
  const q = buildUpdate('clients', data, req.params.id);
  const { rows } = await run(q.text, q.params, { unique: 'Código o documento ya existe' });
  if (!rows[0]) throw new HttpError(404, 'Cliente no encontrado');
  res.json(rows[0]);
}));

/** DELETE /api/clients/:id — Solo admin. Se bloquea si tiene cotizaciones o citas */
app.delete('/api/clients/:id', authMiddleware, adminOnly, ah(async (req, res) => {
  const { rowCount } = await run('DELETE FROM clients WHERE id = $1', [req.params.id], {
    fk: 'No se puede eliminar: el cliente tiene cotizaciones o citas asociadas. Márcalo como inactivo.',
  });
  if (!rowCount) throw new HttpError(404, 'Cliente no encontrado');
  res.json({ message: 'Cliente eliminado' });
}));

// =============================================================================
// RUTAS DE COTIZACIONES
// =============================================================================

const quoteSchema = {
  code: F(check.text(30), true),
  client_id: F(check.uuid, true),
  service_type: F(check.text(200), true),
  surface_m2: F(check.number(1, 10000000), true),
  staff_count: F(check.integer(1, 500)),
  district: F(check.looseText(100)),
  address: F(check.looseText(250)),
  scheduled_date: F(check.date, true),
  valid_days: F(check.integer(1, 365)),
  expires_at: F(check.date),
  subtotal: F(check.number(0, 1000000000)),
  status: F(check.oneOf(ENUMS.quote_status)),
  notes: F(check.nullableText(2000)),
};
const quoteUpdateSchema = {
  status: quoteSchema.status,
  notes: quoteSchema.notes,
  surface_m2: quoteSchema.surface_m2,
  staff_count: quoteSchema.staff_count,
  scheduled_date: quoteSchema.scheduled_date,
  subtotal: quoteSchema.subtotal,
};

/** IGV y total SIEMPRE se calculan aquí; nunca se aceptan del cliente */
function totalsFromSubtotal(subtotal) {
  const sub = round2(subtotal);
  const igv = round2(sub * IGV_RATE);
  return { subtotal: sub, igv, total_soles: round2(sub + igv) };
}

/** Precio del catálogo: base_price_m2 × max(superficie, superficie mínima). null si no existe */
async function priceFromCatalog(serviceName, surface) {
  const { rows } = await pool.query(
    "SELECT base_price_m2, min_surface_m2 FROM services WHERE lower(name) = lower($1) AND status = 'activo' LIMIT 1",
    [serviceName]
  );
  if (!rows[0]) return null;
  return round2(Number(rows[0].base_price_m2) * Math.max(surface, Number(rows[0].min_surface_m2)));
}

/** GET /api/quotes — Filtros: status, search, limit, offset */
app.get('/api/quotes', authMiddleware, ah(async (req, res) => {
  const params = [];
  let sql = 'SELECT q.*, c.name AS client_name FROM quotes q JOIN clients c ON q.client_id = c.id WHERE 1=1';

  const status = queryEnum(req.query.status, ENUMS.quote_status, 'status');
  if (status) { params.push(status); sql += ` AND q.status = $${params.length}`; }
  const search = queryText(req.query.search, 'search');
  if (search) {
    params.push(`%${escapeLike(search)}%`);
    const n = params.length;
    sql += ` AND (q.code ILIKE $${n} OR c.name ILIKE $${n})`;
  }

  sql += ' ORDER BY q.created_at DESC' + pageClause(req.query, params);
  const { rows } = await pool.query(sql, params);
  res.json(rows);
}));

/** GET /api/quotes/:id */
app.get('/api/quotes/:id', authMiddleware, ah(async (req, res) => {
  const { rows } = await pool.query(
    'SELECT q.*, c.name AS client_name FROM quotes q JOIN clients c ON q.client_id = c.id WHERE q.id = $1',
    [req.params.id]
  );
  if (!rows[0]) throw new HttpError(404, 'Cotización no encontrada');
  res.json(rows[0]);
}));

/**
 * POST /api/quotes
 * - Servicio del catálogo: el subtotal sale del catálogo (solo un admin puede fijar otro, p. ej. un descuento).
 * - Servicio fuera del catálogo: el subtotal es obligatorio.
 */
app.post('/api/quotes', authMiddleware, ah(async (req, res) => {
  const data = parseBody(req.body, quoteSchema);
  const catalog = await priceFromCatalog(data.service_type, data.surface_m2);

  let subtotal;
  if (catalog !== null) {
    subtotal = req.user.role === 'admin' && data.subtotal !== undefined ? data.subtotal : catalog;
  } else if (data.subtotal !== undefined) {
    subtotal = data.subtotal;
  } else {
    throw bad('subtotal es requerido para servicios que no están en el catálogo');
  }

  const validDays = data.valid_days ?? 14;
  const { subtotal: _ignored, ...rest } = data;
  const row = {
    ...rest,
    valid_days: validDays,
    expires_at: data.expires_at ?? addDays(data.scheduled_date, validDays),
    ...totalsFromSubtotal(subtotal),
    created_by: req.user.id,
  };
  const q = buildInsert('quotes', row);
  const { rows } = await run(q.text, q.params, {
    unique: 'Código ya existe',
    fk: 'El cliente indicado no existe',
  });
  res.status(201).json(rows[0]);
}));

/** PUT /api/quotes/:id — Actualización parcial; los montos se recalculan en el servidor */
app.put('/api/quotes/:id', authMiddleware, ah(async (req, res) => {
  const data = parseBody(req.body, quoteUpdateSchema, { partial: true });
  const { rows: found } = await pool.query('SELECT * FROM quotes WHERE id = $1', [req.params.id]);
  const current = found[0];
  if (!current) throw new HttpError(404, 'Cotización no encontrada');

  const update = { ...data };
  delete update.subtotal;

  if (data.surface_m2 !== undefined || data.subtotal !== undefined) {
    const surface = data.surface_m2 ?? Number(current.surface_m2);
    const catalog = await priceFromCatalog(current.service_type, surface);
    const explicit = data.subtotal !== undefined && (req.user.role === 'admin' || catalog === null);
    const subtotal = explicit ? data.subtotal : catalog !== null ? catalog : Number(current.subtotal);
    Object.assign(update, totalsFromSubtotal(subtotal));
  }
  if (data.scheduled_date !== undefined) {
    update.expires_at = addDays(data.scheduled_date, current.valid_days);
  }

  const q = buildUpdate('quotes', update, req.params.id);
  const { rows } = await pool.query(q.text, q.params);
  res.json(rows[0]);
}));

// =============================================================================
// RUTAS DE CITAS
// =============================================================================

const appointmentSchema = {
  code: F(check.text(30), true),
  client_id: F(check.uuid, true),
  quote_id: F(check.nullableUuid),
  service_type: F(check.text(200), true),
  address: F(check.looseText(250)),
  district: F(check.looseText(100)),
  service_date: F(check.date, true),
  start_time: F(check.time, true),
  end_time: F(check.time, true),
  shift: F(check.oneOf(ENUMS.shift_type)),
  notes: F(check.nullableText(2000)),
};
const appointmentUpdateSchema = {
  status: F(check.oneOf(ENUMS.appointment_status)),
  notes: appointmentSchema.notes,
  start_time: appointmentSchema.start_time,
  end_time: appointmentSchema.end_time,
  service_date: appointmentSchema.service_date,
};

function checkTimeOrder(start, end) {
  if (toMinutes(end) <= toMinutes(start)) throw bad('end_time debe ser posterior a start_time');
}

/** GET /api/appointments — Filtros: status, date_from, date_to, limit, offset */
app.get('/api/appointments', authMiddleware, ah(async (req, res) => {
  const params = [];
  let sql = 'SELECT a.*, c.name AS client_name FROM appointments a JOIN clients c ON a.client_id = c.id WHERE 1=1';

  const status = queryEnum(req.query.status, ENUMS.appointment_status, 'status');
  if (status) { params.push(status); sql += ` AND a.status = $${params.length}`; }
  const from = queryDate(req.query.date_from, 'date_from');
  if (from) { params.push(from); sql += ` AND a.service_date >= $${params.length}`; }
  const to = queryDate(req.query.date_to, 'date_to');
  if (to) { params.push(to); sql += ` AND a.service_date <= $${params.length}`; }

  sql += ' ORDER BY a.service_date ASC, a.start_time ASC' + pageClause(req.query, params);
  const { rows } = await pool.query(sql, params);
  res.json(rows);
}));

/** POST /api/appointments */
app.post('/api/appointments', authMiddleware, ah(async (req, res) => {
  const data = parseBody(req.body, appointmentSchema);
  checkTimeOrder(data.start_time, data.end_time);
  const q = buildInsert('appointments', { ...data, created_by: req.user.id });
  const { rows } = await run(q.text, q.params, {
    unique: 'Código ya existe',
    fk: 'El cliente o la cotización indicados no existen',
  });
  res.status(201).json(rows[0]);
}));

/** PUT /api/appointments/:id — Actualización parcial */
app.put('/api/appointments/:id', authMiddleware, ah(async (req, res) => {
  const data = parseBody(req.body, appointmentUpdateSchema, { partial: true });
  if (data.start_time !== undefined || data.end_time !== undefined) {
    const { rows } = await pool.query('SELECT start_time, end_time FROM appointments WHERE id = $1', [req.params.id]);
    if (!rows[0]) throw new HttpError(404, 'Cita no encontrada');
    checkTimeOrder(data.start_time ?? rows[0].start_time, data.end_time ?? rows[0].end_time);
  }
  const q = buildUpdate('appointments', data, req.params.id);
  const { rows } = await pool.query(q.text, q.params);
  if (!rows[0]) throw new HttpError(404, 'Cita no encontrada');
  res.json(rows[0]);
}));

// =============================================================================
// RUTAS DE SERVICIOS
// =============================================================================

const serviceSchema = {
  code: F(check.text(30), true),
  name: F(check.text(200), true),
  description: F(check.looseText(2000)),
  category: F(check.oneOf(ENUMS.service_category)),
  base_price_m2: F(check.number(0, 1000000)),
  min_surface_m2: F(check.number(0.01, 10000000)),
  staff_per_100m2: F(check.integer(1, 100)),
  duration_hours: F(check.number(0.1, 168)),
  status: F(check.oneOf(ENUMS.service_status)),
  includes: F(check.textArray()),
};
const serviceUpdateSchema = {
  name: serviceSchema.name,
  description: serviceSchema.description,
  base_price_m2: serviceSchema.base_price_m2,
  status: serviceSchema.status,
};

/** GET /api/services — Filtro: status */
app.get('/api/services', authMiddleware, ah(async (req, res) => {
  const params = [];
  let sql = 'SELECT * FROM services WHERE 1=1';
  const status = queryEnum(req.query.status, ENUMS.service_status, 'status');
  if (status) { params.push(status); sql += ` AND status = $${params.length}`; }
  sql += ' ORDER BY created_at DESC' + pageClause(req.query, params);
  const { rows } = await pool.query(sql, params);
  res.json(rows);
}));

/** POST /api/services — Solo admin */
app.post('/api/services', authMiddleware, adminOnly, ah(async (req, res) => {
  const data = parseBody(req.body, serviceSchema);
  const q = buildInsert('services', { ...data, created_by: req.user.id });
  const { rows } = await run(q.text, q.params, { unique: 'Código ya existe' });
  res.status(201).json(rows[0]);
}));

/** PUT /api/services/:id — Solo admin. Actualización parcial */
app.put('/api/services/:id', authMiddleware, adminOnly, ah(async (req, res) => {
  const data = parseBody(req.body, serviceUpdateSchema, { partial: true });
  const q = buildUpdate('services', data, req.params.id);
  const { rows } = await pool.query(q.text, q.params);
  if (!rows[0]) throw new HttpError(404, 'Servicio no encontrado');
  res.json(rows[0]);
}));

/** DELETE /api/services/:id — Solo admin */
app.delete('/api/services/:id', authMiddleware, adminOnly, ah(async (req, res) => {
  const { rowCount } = await pool.query('DELETE FROM services WHERE id = $1', [req.params.id]);
  if (!rowCount) throw new HttpError(404, 'Servicio no encontrado');
  res.json({ message: 'Servicio eliminado' });
}));

// =============================================================================
// RUTAS DE NOTIFICACIONES
// =============================================================================

/** GET /api/notifications — Últimas 50 del usuario autenticado */
app.get('/api/notifications', authMiddleware, ah(async (req, res) => {
  const { rows } = await pool.query(
    'SELECT * FROM notifications WHERE user_id = $1 ORDER BY created_at DESC LIMIT 50',
    [req.user.id]
  );
  res.json(rows);
}));

/** PUT /api/notifications/:id/read */
app.put('/api/notifications/:id/read', authMiddleware, ah(async (req, res) => {
  const { rowCount } = await pool.query(
    'UPDATE notifications SET is_read = true WHERE id = $1 AND user_id = $2',
    [req.params.id, req.user.id]
  );
  if (!rowCount) throw new HttpError(404, 'Notificación no encontrada');
  res.json({ message: 'Notificación marcada como leída' });
}));

// =============================================================================
// RUTAS DE REPORTES / ESTADÍSTICAS
// =============================================================================

/** GET /api/stats/dashboard — Métricas principales (las citas canceladas no cuentan como próximas) */
app.get('/api/stats/dashboard', authMiddleware, ah(async (req, res) => {
  const [clients, quotes, appointments, revenue] = await Promise.all([
    pool.query("SELECT COUNT(*) FROM clients WHERE status = 'activo'"),
    pool.query("SELECT COUNT(*) FROM quotes WHERE status IN ('enviada','aceptada')"),
    pool.query("SELECT COUNT(*) FROM appointments WHERE service_date >= CURRENT_DATE AND status <> 'cancelada'"),
    pool.query("SELECT COALESCE(SUM(total_soles),0) AS total FROM quotes WHERE status = 'aceptada'"),
  ]);
  res.json({
    active_clients: parseInt(clients.rows[0].count, 10),
    active_quotes: parseInt(quotes.rows[0].count, 10),
    upcoming_appointments: parseInt(appointments.rows[0].count, 10),
    total_revenue: parseFloat(revenue.rows[0].total),
  });
}));

// ── Health check ───────────────────────────────────────────────────────────────
app.get('/health', (req, res) => res.json({ status: 'ok', service: 'CleanSenso API', version: '1.1.0' }));

// =============================================================================
// MANEJO DE ERRORES
// =============================================================================

app.use((req, res) => res.status(404).json({ error: 'Ruta no encontrada' }));

// eslint-disable-next-line no-unused-vars
app.use((err, req, res, next) => {
  if (err instanceof HttpError) return res.status(err.status).json({ error: err.message });
  if (err.type === 'entity.parse.failed') return res.status(400).json({ error: 'JSON inválido' });
  if (err.type === 'entity.too.large') return res.status(413).json({ error: 'Body demasiado grande' });
  if (err.code === '23505') return res.status(409).json({ error: 'El registro ya existe' });
  if (err.code === '23503') return res.status(409).json({ error: 'Operación bloqueada por registros relacionados' });
  if (err.code === '23514' || err.code === '22P02' || err.code === '22007') {
    return res.status(400).json({ error: 'Datos inválidos' });
  }
  console.error('Error no controlado:', err);
  res.status(500).json({ error: 'Error interno del servidor' });
});

// =============================================================================
// ARRANQUE
// =============================================================================

function start() {
  const server = app.listen(PORT, () => {
    console.log(`✅ CleanSenso API corriendo en el puerto ${PORT}`);
  });
  const shutdown = (signal) => {
    console.log(`${signal} recibido: cerrando servidor...`);
    server.close(() => pool.end().finally(() => process.exit(0)));
    setTimeout(() => process.exit(1), 10000).unref();
  };
  process.on('SIGTERM', () => shutdown('SIGTERM'));
  process.on('SIGINT', () => shutdown('SIGINT'));
}

if (require.main === module) start();

// Exportado para pruebas
module.exports = { app, pool, parseBody, totalsFromSubtotal, addDays, check, schemas: { clientSchema, quoteSchema, appointmentSchema } };
