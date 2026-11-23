# CleanSenso

Sistema de gestión para empresas de servicios de limpieza (Grupo Consenso Perú): clientes, cotizaciones, agenda de citas, catálogo de servicios, notificaciones y dashboard.

## Arquitectura

| Capa | Tecnología |
|------|------------|
| Frontend | Next.js 15 · React 19 · TypeScript · Tailwind CSS |
| Modo nube | Supabase (Auth + PostgreSQL con RLS) — esquema en `supabase/migrations/` |
| Modo local | Backend Express + PostgreSQL en Docker — esquema en `local-setup/` y API en `backend/` |

Son dos formas de desplegar el mismo sistema; no se usan a la vez.

## Variables de entorno

Nunca subas claves reales a Git. Copia las plantillas:

| Plantilla | Copiar como | Uso |
|-----------|-------------|-----|
| `.env.example` | `.env.local` | Frontend (Supabase) |
| `backend/.env.example` | `backend/.env` | Backend sin Docker |
| `local-setup/.env.example` | `local-setup/.env` | `docker compose` |

El backend **no arranca** sin `JWT_SECRET` (≥ 32 caracteres, `openssl rand -hex 32`) y `DATABASE_URL`.

## Desarrollo

```bash
npm install
npm run dev          # http://localhost:4028
```

### Modo local (Docker)

```bash
cd local-setup
cp .env.example .env     # completa POSTGRES_PASSWORD y JWT_SECRET
docker compose up --build
```

Usuarios de demostración (solo desarrollo): `admin@cleansenso.pe` / `supervisor@cleansenso.pe`. Cámbialos o bórralos antes de exponer la base fuera de tu máquina.

### Modo nube (Supabase)

Aplica las migraciones de `supabase/migrations/` en orden (`supabase db push`). La migración `20261119000000_security_hardening.sql` corrige políticas de seguridad: revisa su cabecera.

## Scripts

`npm run dev` · `build` · `serve` (producción) · `lint` · `lint:fix` · `format` · `type-check`

## API del backend (modo local)

`/api/auth` · `/api/users` · `/api/clients` · `/api/quotes` · `/api/appointments` · `/api/services` · `/api/notifications` · `/api/stats/dashboard` · `/health`

Autenticación con JWT (8 h). Los montos de las cotizaciones (IGV 18 % y total) los calcula siempre el servidor.
