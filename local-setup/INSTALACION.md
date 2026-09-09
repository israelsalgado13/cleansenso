# ═══════════════════════════════════════════════════════════════════════════════
# CleanSenso — Guía de instalación y ejecución LOCAL
# Grupo Consenso Perú
# ═══════════════════════════════════════════════════════════════════════════════

## Requisitos previos

- Node.js 20+
- PostgreSQL 15+
- npm 10+
- (Opcional) Docker + Docker Compose

---

## Estructura del proyecto

```
cleansenso/
├── src/                    ← Frontend Next.js
├── backend/
│   ├── src/index.js        ← API Node.js + Express
│   └── package.json
├── local-setup/
│   ├── init.sql            ← Script SQL para crear la BD
│   ├── docker-compose.yml  ← Levantar todo con Docker
│   └── .env.local.example  ← Variables de entorno del frontend
└── Dockerfile.frontend
```

---

## Opción A — Instalación manual (sin Docker)

### 1. Crear la base de datos PostgreSQL

```bash
# Conectarse a PostgreSQL como superusuario
psql -U postgres

# Dentro de psql:
CREATE DATABASE cleansenso;
CREATE USER cleansenso_user WITH PASSWORD 'cleansenso_pass';
GRANT ALL PRIVILEGES ON DATABASE cleansenso TO cleansenso_user;
\q

# Ejecutar el script de inicialización
psql -U cleansenso_user -d cleansenso -f local-setup/init.sql
```

### 2. Configurar y levantar el Backend

```bash
cd backend

# Instalar dependencias
npm install

# Crear archivo de variables de entorno
# Crea un archivo llamado .env con este contenido:
#   DATABASE_URL=postgresql://cleansenso_user:cleansenso_pass@localhost:5432/cleansenso
#   JWT_SECRET=cleansenso_jwt_secret_local_2026
#   PORT=4000
#   FRONTEND_URL=http://localhost:3000
#   NODE_ENV=development

# Iniciar el servidor
npm run dev
# El backend estará disponible en: http://localhost:4000
```

### 3. Configurar y levantar el Frontend

```bash
# Desde la raíz del proyecto
cd ..

# Instalar dependencias
npm install

# Crear archivo .env.local con este contenido:
#   NEXT_PUBLIC_API_URL=http://localhost:4000
#   NEXT_PUBLIC_SITE_URL=http://localhost:3000

# Iniciar el servidor de desarrollo
npm run dev
# El frontend estará disponible en: http://localhost:3000
```

---

## Opción B — Con Docker Compose (recomendado)

```bash
# Desde la carpeta local-setup/
cd local-setup

docker-compose up --build

# Servicios disponibles:
#   Frontend:  http://localhost:3000
#   Backend:   http://localhost:4000
#   PostgreSQL: localhost:5432
```

---

## Credenciales de acceso

| Rol           | Email                        | Contraseña   |
|---------------|------------------------------|--------------|
| Administrador | admin@cleansenso.pe          | Admin2026!   |
| Supervisor    | supervisor@cleansenso.pe     | Super2026!   |

---

## Endpoints del Backend API

| Método | Ruta                          | Descripción                        |
|--------|-------------------------------|------------------------------------|
| POST   | /api/auth/login               | Iniciar sesión                     |
| GET    | /api/auth/me                  | Perfil del usuario autenticado     |
| PUT    | /api/auth/password            | Cambiar contraseña                 |
| GET    | /api/users                    | Listar usuarios (solo admin)       |
| POST   | /api/users                    | Crear usuario (solo admin)         |
| GET    | /api/clients                  | Listar clientes                    |
| POST   | /api/clients                  | Crear cliente                      |
| PUT    | /api/clients/:id              | Actualizar cliente                 |
| DELETE | /api/clients/:id              | Eliminar cliente (solo admin)      |
| GET    | /api/quotes                   | Listar cotizaciones                |
| POST   | /api/quotes                   | Crear cotización                   |
| PUT    | /api/quotes/:id               | Actualizar cotización              |
| GET    | /api/appointments             | Listar citas                       |
| POST   | /api/appointments             | Crear cita                         |
| PUT    | /api/appointments/:id         | Actualizar cita                    |
| GET    | /api/services                 | Listar servicios                   |
| POST   | /api/services                 | Crear servicio (solo admin)        |
| PUT    | /api/services/:id             | Actualizar servicio (solo admin)   |
| DELETE | /api/services/:id             | Eliminar servicio (solo admin)     |
| GET    | /api/notifications            | Notificaciones del usuario         |
| PUT    | /api/notifications/:id/read   | Marcar notificación como leída     |
| GET    | /api/stats/dashboard          | KPIs del dashboard                 |
| GET    | /health                       | Estado del servidor                |

---

## Autenticación

Todas las rutas (excepto `/api/auth/login` y `/health`) requieren el header:

```
Authorization: Bearer <token>
```

El token se obtiene al hacer login y tiene una validez de **8 horas**.

---

## Notas importantes

- El sistema solo tiene roles **Administrador** y **Supervisor** (se eliminó el rol Cliente).
- Las contraseñas se almacenan con hash bcrypt (nunca en texto plano).
- El script `init.sql` es idempotente — puede ejecutarse múltiples veces sin duplicar datos.
- Para producción, cambia `JWT_SECRET` por un valor seguro y aleatorio.
