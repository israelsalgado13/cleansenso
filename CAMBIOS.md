# CleanSenso — Cambios de seguridad y robustez

> ⚠️ **Antes de hacer merge:** configura `NEXT_PUBLIC_SUPABASE_URL` y `NEXT_PUBLIC_SUPABASE_ANON_KEY`
> (y las demás variables que uses) en tu hosting. Este PR deja de versionar `.env`, del que el build
> podía estar leyendo esas claves.

## Base de datos (Supabase) — `supabase/migrations/20261119000000_security_hardening.sql`
| # | Problema | Corrección |
|---|----------|-----------|
| 1 | **Crítico.** Cualquiera podía registrarse como admin enviando `role: "admin"` en `user_metadata` (`handle_new_user` e `is_admin()` confiaban en él) | Todo registro nuevo es `cliente`; `is_admin()` y `is_admin_or_supervisor()` leen `user_profiles` y exigen `is_active` |
| 2 | Un usuario podía cambiar su propio `role`/`is_active` | Trigger que lo bloquea salvo para admins |
| 3 | Cualquier autenticado podía crear notificaciones para otros | La política exige `user_id = auth.uid()` o ser admin/supervisor |
| 4 | Montos de cotización manipulables | Trigger calcula IGV (18 %) y total desde el subtotal |
| 5 | Sin restricciones de integridad | `CHECK` (montos ≥ 0, personal ≥ 1, `end_time > start_time`…) como `NOT VALID` |
| 6 | Funciones `SECURITY DEFINER` sin `search_path` | `SET search_path = public` |

Es aditiva e idempotente; no modifica la migración inicial.

## Base de datos local — `local-setup/02_hardening.sql`
- Borrar un cliente ya **no elimina en cascada** sus cotizaciones y citas (`RESTRICT`).
- Unicidad de correo sin distinguir mayúsculas, trigger de totales y `CHECK`s.
- `docker-compose.yml`: secretos desde `local-setup/.env` (ya no escritos en el archivo), puertos ligados a `127.0.0.1`.
- Se añade `backend/Dockerfile`, que `docker-compose.yml` referenciaba pero no existía.

## Backend — `backend/src/index.js`
- `JWT_SECRET` y `DATABASE_URL` obligatorios (antes había valores por defecto públicos → tokens falsificables). Ya no se imprime la cadena de conexión en el log.
- El token se valida contra la BD en cada request: usuarios desactivados y cambios de rol aplican al instante.
- Rate limit en login (10 intentos / 15 min), `helmet`, límite de body, contraseñas de 10–72 caracteres con letra y número, login sin filtrar si el correo existe.
- `PUT` parciales: solo cambian los campos enviados (antes los omitidos se guardaban como `NULL`).
- Validación de entradas y whitelist de campos en todas las rutas (enums, UUID, fechas, horas, DNI/RUC).
- IGV y total siempre calculados en el servidor; el subtotal sale del catálogo (un admin puede fijar otro, p. ej. descuentos).
- Express 4 no captura errores async: ahora hay `asyncHandler` y manejador central.
- Eliminar un cliente con cotizaciones/citas devuelve 409 con mensaje claro.
- Nuevo `PUT /api/users/:id` para desactivar usuarios o cambiar su rol (no puedes desactivarte a ti mismo).
- El dashboard ya no cuenta las citas canceladas como "próximas".
- Cierre ordenado (SIGTERM/SIGINT) y exporta helpers para pruebas.

## Repositorio
- `.env` fuera del control de versiones; `.gitignore` actualizado; plantillas `*.env.example`.
- `README.md` reescrito (era la plantilla genérica de Rocket.new).

## Decisiones de negocio que NO cambié
- Los `supervisor` pueden editar cualquier cliente/cotización/cita (no hay propiedad por registro).
- `service_type` sigue siendo texto libre: para servicios fuera del catálogo el subtotal lo informa quien cotiza. Mejora sugerida: convertirlo en FK al catálogo.
- Los tokens JWT no se revocan al cambiar contraseña (sí al desactivar al usuario).
- `npm start` del frontend sigue ejecutando `next dev` (Rocket.new podría depender de ello); para producción usa `npm run serve`.
- Dependencias de backend duplicadas en el `package.json` de la raíz: no las quité porque no pude confirmar que el frontend no las use.

## Acciones manuales recomendadas
1. **Aplicar la migración de Supabase cuanto antes** (el punto 1 es explotable con la anon key pública).
2. Eliminar o cambiar contraseña de los usuarios demo (`admin@cleansenso.pe`, etc.): sus contraseñas están en el repo.
3. Revisar en Supabase si el registro público debe estar habilitado.

## No revisado
`src/app`, `src/components`, `src/lib`, `Dockerfile.frontend` y `local-setup/INSTALACION.md`. Los cambios del backend se verificaron con `node --check` y pruebas unitarias de los validadores y del cálculo de totales (coinciden con los datos semilla), pero **no se ejecutaron contra una base de datos real**.
