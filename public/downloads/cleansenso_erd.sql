-- =============================================================================
-- CleanSenso — Modelado de Datos (ERD)
-- Grupo Consenso Perú — Sistema de Gestión de Servicios de Limpieza
-- Versión: 1.0.0 | Fecha: 2026-09-15
--
-- Este archivo contiene:
--   1. Descripción textual del modelo de datos
--   2. Diagrama ERD en notación PlantUML (para visualizar en plantuml.com)
--   3. Diccionario de datos completo
--   4. Relaciones y cardinalidades
--   5. Reglas de negocio implementadas
-- =============================================================================

/*
================================================================================
PARTE 1 — DESCRIPCIÓN DEL MODELO DE DATOS
================================================================================

CleanSenso es un sistema de gestión para empresas de servicios de limpieza.
El modelo de datos está organizado en 8 entidades principales que cubren:

  • Gestión de usuarios y roles (user_profiles)
  • Registro de clientes (clients)
  • Catálogo de servicios (services)
  • Cotizaciones/presupuestos (quotes)
  • Agenda de citas (appointments)
  • Personal operativo (staff_members)
  • Asignación de personal (appointment_staff)
  • Notificaciones del sistema (notifications)

FLUJO PRINCIPAL DEL NEGOCIO:
  1. Se registra un CLIENTE (empresa o persona natural)
  2. Se genera una COTIZACIÓN para el cliente con un tipo de servicio
  3. Si el cliente acepta, se crea una CITA en la agenda
  4. Se asigna PERSONAL OPERATIVO a la cita
  5. El sistema detecta CONFLICTOS de horario automáticamente
  6. Se generan NOTIFICACIONES para alertar al equipo

================================================================================
PARTE 2 — DIAGRAMA ERD EN PLANTUML
================================================================================

Para visualizar el diagrama:
  1. Ir a https://www.plantuml.com/plantuml/uml/
  2. Pegar el código entre las marcas @startuml y @enduml
  3. El diagrama se renderizará automáticamente

@startuml CleanSenso_ERD

!define TABLE(name,desc) class name as "desc" << (T,#FFAAAA) >>
!define PK(x) <u>x</u>
!define FK(x) <i>x</i>
!define NOT_NULL(x) x *
!define NULLABLE(x) x

skinparam classBackgroundColor #FEFEFE
skinparam classBorderColor #336699
skinparam classHeaderBackgroundColor #336699
skinparam classHeaderFontColor #FFFFFF
skinparam classFontSize 11
skinparam ArrowColor #336699
skinparam ArrowThickness 1.5
skinparam linetype ortho

title CleanSenso — Diagrama Entidad-Relación\nGrupo Consenso Perú | v1.0.0

' ─────────────────────────────────────────────────────────────────────────────
' ENTIDAD: user_profiles
' ─────────────────────────────────────────────────────────────────────────────
TABLE(user_profiles, "user_profiles\n[Usuarios del Sistema]") {
  PK(id) : UUID
  --
  NOT_NULL(email) : TEXT UNIQUE
  NOT_NULL(full_name) : TEXT
  NOT_NULL(password_hash) : TEXT
  NOT_NULL(role) : user_role ENUM
  NULLABLE(avatar_url) : TEXT
  NULLABLE(phone) : TEXT
  NOT_NULL(is_active) : BOOLEAN = true
  NOT_NULL(created_at) : TIMESTAMPTZ
  NOT_NULL(updated_at) : TIMESTAMPTZ
  --
  ENUM user_role:
  .. 'admin'
  .. 'supervisor'
}

' ─────────────────────────────────────────────────────────────────────────────
' ENTIDAD: clients
' ─────────────────────────────────────────────────────────────────────────────
TABLE(clients, "clients\n[Clientes del Negocio]") {
  PK(id) : UUID
  --
  NOT_NULL(code) : TEXT UNIQUE
  NOT_NULL(name) : TEXT
  NOT_NULL(doc_type) : doc_type ENUM
  NOT_NULL(doc_number) : TEXT
  NOT_NULL(client_type) : client_type ENUM
  NOT_NULL(district) : TEXT
  NOT_NULL(phone) : TEXT
  NOT_NULL(email) : TEXT
  NOT_NULL(status) : client_status ENUM
  NOT_NULL(contact_name) : TEXT
  NOT_NULL(address) : TEXT
  NULLABLE(notes) : TEXT
  NOT_NULL(total_quotes) : INTEGER = 0
  NULLABLE(last_service_date) : TEXT
  FK(registered_by) : UUID → user_profiles
  NOT_NULL(created_at) : TIMESTAMPTZ
  NOT_NULL(updated_at) : TIMESTAMPTZ
  --
  ENUM doc_type: 'RUC' | 'DNI'
  ENUM client_type: 'empresa' | 'persona_natural'
  ENUM client_status: 'activo' | 'inactivo' | 'prospecto'
}

' ─────────────────────────────────────────────────────────────────────────────
' ENTIDAD: services
' ─────────────────────────────────────────────────────────────────────────────
TABLE(services, "services\n[Catálogo de Servicios]") {
  PK(id) : UUID
  --
  NOT_NULL(code) : TEXT UNIQUE
  NOT_NULL(name) : TEXT
  NOT_NULL(description) : TEXT
  NOT_NULL(category) : service_category ENUM
  NOT_NULL(base_price_m2) : NUMERIC(10,2)
  NOT_NULL(min_surface_m2) : NUMERIC(10,2)
  NOT_NULL(staff_per_100m2) : INTEGER
  NOT_NULL(duration_hours) : NUMERIC(5,2)
  NOT_NULL(status) : service_status ENUM
  NOT_NULL(includes) : TEXT[]
  FK(created_by) : UUID → user_profiles
  NOT_NULL(created_at) : TIMESTAMPTZ
  NOT_NULL(updated_at) : TIMESTAMPTZ
  --
  ENUM service_category:
  .. 'limpieza_general'
  .. 'limpieza_especializada'
  .. 'desinfeccion'
  .. 'lavado'
  .. 'mantenimiento'
  ENUM service_status:
  .. 'activo' | 'inactivo' | 'en_revision'
}

' ─────────────────────────────────────────────────────────────────────────────
' ENTIDAD: quotes
' ─────────────────────────────────────────────────────────────────────────────
TABLE(quotes, "quotes\n[Cotizaciones]") {
  PK(id) : UUID
  --
  NOT_NULL(code) : TEXT UNIQUE
  FK(client_id) : UUID → clients [NOT NULL]
  NOT_NULL(service_type) : TEXT
  NOT_NULL(surface_m2) : NUMERIC(10,2) ≥ 1
  NULLABLE(rooms_count) : INTEGER
  NOT_NULL(staff_count) : INTEGER ≥ 1
  NOT_NULL(district) : TEXT
  NOT_NULL(address) : TEXT
  NOT_NULL(scheduled_date) : DATE
  NOT_NULL(valid_days) : INTEGER = 14
  NOT_NULL(expires_at) : DATE
  NOT_NULL(subtotal) : NUMERIC(12,2)
  NOT_NULL(igv) : NUMERIC(12,2)
  NOT_NULL(total_soles) : NUMERIC(12,2)
  NOT_NULL(status) : quote_status ENUM
  NULLABLE(notes) : TEXT
  NULLABLE(payment_terms) : TEXT
  FK(created_by) : UUID → user_profiles
  NOT_NULL(created_at) : TIMESTAMPTZ
  NOT_NULL(updated_at) : TIMESTAMPTZ
  --
  ENUM quote_status:
  .. 'borrador' | 'enviada'
  .. 'aceptada' | 'rechazada' | 'vencida'
  CONSTRAINT: total = subtotal + igv
  CONSTRAINT: expires_at ≥ scheduled_date
}

' ─────────────────────────────────────────────────────────────────────────────
' ENTIDAD: staff_members
' ─────────────────────────────────────────────────────────────────────────────
TABLE(staff_members, "staff_members\n[Personal Operativo]") {
  PK(id) : UUID
  --
  NOT_NULL(name) : TEXT
  NOT_NULL(specialty) : TEXT
  NOT_NULL(phone) : TEXT
  NOT_NULL(is_active) : BOOLEAN = true
  NOT_NULL(created_at) : TIMESTAMPTZ
}

' ─────────────────────────────────────────────────────────────────────────────
' ENTIDAD: appointments
' ─────────────────────────────────────────────────────────────────────────────
TABLE(appointments, "appointments\n[Citas / Agenda]") {
  PK(id) : UUID
  --
  NOT_NULL(code) : TEXT UNIQUE
  FK(client_id) : UUID → clients [NOT NULL]
  FK(quote_id) : UUID → quotes [NULLABLE]
  NOT_NULL(service_type) : TEXT
  NOT_NULL(address) : TEXT
  NOT_NULL(district) : TEXT
  NOT_NULL(service_date) : DATE
  NOT_NULL(start_time) : TIME
  NOT_NULL(end_time) : TIME
  NOT_NULL(shift) : shift_type ENUM
  NOT_NULL(status) : appointment_status ENUM
  NULLABLE(service_order_code) : TEXT
  NOT_NULL(has_conflict) : BOOLEAN = false
  NULLABLE(notes) : TEXT
  FK(created_by) : UUID → user_profiles
  NOT_NULL(created_at) : TIMESTAMPTZ
  NOT_NULL(updated_at) : TIMESTAMPTZ
  --
  ENUM shift_type: 'mañana' | 'tarde'
  ENUM appointment_status:
  .. 'programada' | 'confirmada'
  .. 'en_progreso' | 'completada' | 'cancelada'
  CONSTRAINT: end_time > start_time
}

' ─────────────────────────────────────────────────────────────────────────────
' ENTIDAD: appointment_staff (tabla de unión N:M)
' ─────────────────────────────────────────────────────────────────────────────
TABLE(appointment_staff, "appointment_staff\n[Asignación Personal-Cita]") {
  FK(appointment_id) : UUID → appointments [PK]
  FK(staff_id) : UUID → staff_members [PK]
  --
  NOT_NULL(assigned_at) : TIMESTAMPTZ
  --
  PK compuesta: (appointment_id, staff_id)
}

' ─────────────────────────────────────────────────────────────────────────────
' ENTIDAD: notifications
' ─────────────────────────────────────────────────────────────────────────────
TABLE(notifications, "notifications\n[Notificaciones]") {
  PK(id) : UUID
  --
  FK(user_id) : UUID → user_profiles [NOT NULL]
  NOT_NULL(type) : notification_type ENUM
  NOT_NULL(title) : TEXT
  NOT_NULL(message) : TEXT
  NOT_NULL(is_read) : BOOLEAN = false
  NULLABLE(related_id) : UUID
  NOT_NULL(created_at) : TIMESTAMPTZ
  --
  ENUM notification_type:
  .. 'cita_recordatorio'
  .. 'cotizacion_aceptada'
  .. 'cotizacion_vencida'
  .. 'conflicto_agenda'
  .. 'nuevo_cliente'
  .. 'sistema'
}

' ─────────────────────────────────────────────────────────────────────────────
' RELACIONES
' ─────────────────────────────────────────────────────────────────────────────

' user_profiles → clients (1:N) — Un usuario registra muchos clientes
user_profiles "1" --o{ "0..*" clients : "registra\n(registered_by)"

' user_profiles → services (1:N) — Un usuario crea muchos servicios
user_profiles "1" --o{ "0..*" services : "crea\n(created_by)"

' user_profiles → quotes (1:N) — Un usuario genera muchas cotizaciones
user_profiles "1" --o{ "0..*" quotes : "genera\n(created_by)"

' user_profiles → appointments (1:N) — Un usuario agenda muchas citas
user_profiles "1" --o{ "0..*" appointments : "agenda\n(created_by)"

' user_profiles → notifications (1:N) — Un usuario recibe muchas notificaciones
user_profiles "1" --{ "0..*" notifications : "recibe\n(user_id)"

' clients → quotes (1:N) — Un cliente tiene muchas cotizaciones
clients "1" --{ "0..*" quotes : "tiene\n(client_id)"

' clients → appointments (1:N) — Un cliente tiene muchas citas
clients "1" --{ "0..*" appointments : "tiene\n(client_id)"

' quotes → appointments (1:0..1) — Una cotización puede originar una cita
quotes "0..1" --o{ "0..*" appointments : "origina\n(quote_id)"

' appointments ↔ staff_members (N:M) — Muchos operarios en muchas citas
appointments "1..*" -- "1..*" appointment_staff : ""
appointment_staff "1..*" -- "1..*" staff_members : ""

@enduml

================================================================================
PARTE 3 — DICCIONARIO DE DATOS
================================================================================

TABLA: user_profiles
  Propósito: Almacena los usuarios del sistema (administradores y supervisores)
  Cardinalidad estimada: < 50 registros
  ┌─────────────────┬──────────────┬──────────┬─────────────────────────────────────┐
  │ Columna         │ Tipo         │ Nulable  │ Descripción                         │
  ├─────────────────┼──────────────┼──────────┼─────────────────────────────────────┤
  │ id              │ UUID         │ NO       │ PK - Identificador único             │
  │ email           │ TEXT         │ NO       │ Correo (UNIQUE, credencial login)    │
  │ full_name       │ TEXT         │ NO       │ Nombre completo del usuario          │
  │ password_hash   │ TEXT         │ NO       │ Hash bcrypt de la contraseña         │
  │ role            │ user_role    │ NO       │ Rol: admin | supervisor              │
  │ avatar_url      │ TEXT         │ SÍ       │ URL de foto de perfil                │
  │ phone           │ TEXT         │ SÍ       │ Teléfono de contacto                 │
  │ is_active       │ BOOLEAN      │ NO       │ true = puede iniciar sesión          │
  │ created_at      │ TIMESTAMPTZ  │ NO       │ Fecha de creación (auto)             │
  │ updated_at      │ TIMESTAMPTZ  │ NO       │ Última modificación (trigger)        │
  └─────────────────┴──────────────┴──────────┴─────────────────────────────────────┘

TABLA: clients
  Propósito: Empresas y personas naturales que contratan servicios de limpieza
  Cardinalidad estimada: 100 - 10,000 registros
  ┌──────────────────┬──────────────┬──────────┬─────────────────────────────────────┐
  │ Columna          │ Tipo         │ Nulable  │ Descripción                         │
  ├──────────────────┼──────────────┼──────────┼─────────────────────────────────────┤
  │ id               │ UUID         │ NO       │ PK - Identificador único             │
  │ code             │ TEXT         │ NO       │ Código único (CLI-001, CLI-002...)   │
  │ name             │ TEXT         │ NO       │ Razón social o nombre completo       │
  │ doc_type         │ doc_type     │ NO       │ RUC (empresa) | DNI (persona)        │
  │ doc_number       │ TEXT         │ NO       │ Número de RUC o DNI                  │
  │ client_type      │ client_type  │ NO       │ empresa | persona_natural            │
  │ district         │ TEXT         │ NO       │ Distrito de Lima                     │
  │ phone            │ TEXT         │ NO       │ Teléfono principal                   │
  │ email            │ TEXT         │ NO       │ Correo electrónico                   │
  │ status           │ client_status│ NO       │ activo | inactivo | prospecto        │
  │ contact_name     │ TEXT         │ NO       │ Nombre del contacto directo          │
  │ address          │ TEXT         │ NO       │ Dirección completa                   │
  │ notes            │ TEXT         │ SÍ       │ Observaciones adicionales            │
  │ total_quotes     │ INTEGER      │ NO       │ Contador de cotizaciones (trigger)   │
  │ last_service_date│ TEXT         │ SÍ       │ Fecha del último servicio realizado  │
  │ registered_by    │ UUID (FK)    │ SÍ       │ Usuario que registró al cliente      │
  │ created_at       │ TIMESTAMPTZ  │ NO       │ Fecha de registro (auto)             │
  │ updated_at       │ TIMESTAMPTZ  │ NO       │ Última modificación (trigger)        │
  └──────────────────┴──────────────┴──────────┴─────────────────────────────────────┘

TABLA: services
  Propósito: Catálogo de servicios de limpieza con precios y parámetros
  Cardinalidad estimada: 10 - 100 registros
  ┌─────────────────┬──────────────────┬──────────┬──────────────────────────────────┐
  │ Columna         │ Tipo             │ Nulable  │ Descripción                      │
  ├─────────────────┼──────────────────┼──────────┼──────────────────────────────────┤
  │ id              │ UUID             │ NO       │ PK - Identificador único          │
  │ code            │ TEXT             │ NO       │ Código único (SVC-001...)         │
  │ name            │ TEXT             │ NO       │ Nombre del servicio               │
  │ description     │ TEXT             │ NO       │ Descripción detallada             │
  │ category        │ service_category │ NO       │ Categoría del servicio            │
  │ base_price_m2   │ NUMERIC(10,2)    │ NO       │ Precio por m² en soles (PEN)      │
  │ min_surface_m2  │ NUMERIC(10,2)    │ NO       │ Superficie mínima requerida       │
  │ staff_per_100m2 │ INTEGER          │ NO       │ Operarios necesarios por 100 m²   │
  │ duration_hours  │ NUMERIC(5,2)     │ NO       │ Duración estimada en horas        │
  │ status          │ service_status   │ NO       │ activo | inactivo | en_revision   │
  │ includes        │ TEXT[]           │ NO       │ Lista de actividades incluidas     │
  │ created_by      │ UUID (FK)        │ SÍ       │ Usuario que creó el servicio      │
  │ created_at      │ TIMESTAMPTZ      │ NO       │ Fecha de creación (auto)          │
  │ updated_at      │ TIMESTAMPTZ      │ NO       │ Última modificación (trigger)     │
  └─────────────────┴──────────────────┴──────────┴──────────────────────────────────┘

TABLA: quotes
  Propósito: Presupuestos/cotizaciones generados para los clientes
  Cardinalidad estimada: 1,000 - 50,000 registros
  ┌─────────────────┬──────────────┬──────────┬──────────────────────────────────────┐
  │ Columna         │ Tipo         │ Nulable  │ Descripción                          │
  ├─────────────────┼──────────────┼──────────┼──────────────────────────────────────┤
  │ id              │ UUID         │ NO       │ PK - Identificador único              │
  │ code            │ TEXT         │ NO       │ Código único (COT-2026-001...)        │
  │ client_id       │ UUID (FK)    │ NO       │ Cliente al que se dirige              │
  │ service_type    │ TEXT         │ NO       │ Tipo de servicio cotizado             │
  │ surface_m2      │ NUMERIC(10,2)│ NO       │ Superficie a limpiar en m²            │
  │ rooms_count     │ INTEGER      │ SÍ       │ Número de ambientes (opcional)        │
  │ staff_count     │ INTEGER      │ NO       │ Operarios asignados                   │
  │ district        │ TEXT         │ NO       │ Distrito del servicio                 │
  │ address         │ TEXT         │ NO       │ Dirección del servicio                │
  │ scheduled_date  │ DATE         │ NO       │ Fecha propuesta del servicio          │
  │ valid_days      │ INTEGER      │ NO       │ Días de validez (default: 14)         │
  │ expires_at      │ DATE         │ NO       │ Fecha de vencimiento                  │
  │ subtotal        │ NUMERIC(12,2)│ NO       │ Monto antes de IGV (soles)            │
  │ igv             │ NUMERIC(12,2)│ NO       │ IGV 18% (soles)                       │
  │ total_soles     │ NUMERIC(12,2)│ NO       │ Total con IGV (soles)                 │
  │ status          │ quote_status │ NO       │ borrador|enviada|aceptada|rechazada   │
  │ notes           │ TEXT         │ SÍ       │ Observaciones de la cotización        │
  │ payment_terms   │ TEXT         │ SÍ       │ Condiciones de pago                   │
  │ created_by      │ UUID (FK)    │ SÍ       │ Usuario que generó la cotización      │
  │ created_at      │ TIMESTAMPTZ  │ NO       │ Fecha de creación (auto)              │
  │ updated_at      │ TIMESTAMPTZ  │ NO       │ Última modificación (trigger)         │
  └─────────────────┴──────────────┴──────────┴──────────────────────────────────────┘

TABLA: staff_members
  Propósito: Personal operativo disponible para asignación a citas
  Cardinalidad estimada: 5 - 200 registros
  ┌─────────────────┬──────────────┬──────────┬──────────────────────────────────────┐
  │ Columna         │ Tipo         │ Nulable  │ Descripción                          │
  ├─────────────────┼──────────────┼──────────┼──────────────────────────────────────┤
  │ id              │ UUID         │ NO       │ PK - Identificador único              │
  │ name            │ TEXT         │ NO       │ Nombre completo del operario          │
  │ specialty       │ TEXT         │ NO       │ Especialidad (limpieza, lavado, etc.) │
  │ phone           │ TEXT         │ NO       │ Teléfono de contacto                  │
  │ is_active       │ BOOLEAN      │ NO       │ true = disponible para asignación     │
  │ created_at      │ TIMESTAMPTZ  │ NO       │ Fecha de registro (auto)              │
  └─────────────────┴──────────────┴──────────┴──────────────────────────────────────┘

TABLA: appointments
  Propósito: Citas y agenda de servicios programados
  Cardinalidad estimada: 500 - 20,000 registros
  ┌────────────────────┬──────────────────┬──────────┬─────────────────────────────────┐
  │ Columna            │ Tipo             │ Nulable  │ Descripción                     │
  ├────────────────────┼──────────────────┼──────────┼─────────────────────────────────┤
  │ id                 │ UUID             │ NO       │ PK - Identificador único         │
  │ code               │ TEXT             │ NO       │ Código único (CITA-2026-001...)  │
  │ client_id          │ UUID (FK)        │ NO       │ Cliente del servicio             │
  │ quote_id           │ UUID (FK)        │ SÍ       │ Cotización origen (puede ser NULL│
  │ service_type       │ TEXT             │ NO       │ Tipo de servicio a realizar      │
  │ address            │ TEXT             │ NO       │ Dirección del servicio           │
  │ district           │ TEXT             │ NO       │ Distrito del servicio            │
  │ service_date       │ DATE             │ NO       │ Fecha del servicio               │
  │ start_time         │ TIME             │ NO       │ Hora de inicio                   │
  │ end_time           │ TIME             │ NO       │ Hora de fin (> start_time)       │
  │ shift              │ shift_type       │ NO       │ mañana | tarde                   │
  │ status             │ appointment_status│ NO      │ Estado de la cita                │
  │ service_order_code │ TEXT             │ SÍ       │ Código de orden de servicio      │
  │ has_conflict       │ BOOLEAN          │ NO       │ true = conflicto de horario      │
  │ notes              │ TEXT             │ SÍ       │ Observaciones                    │
  │ created_by         │ UUID (FK)        │ SÍ       │ Usuario que agendó la cita       │
  │ created_at         │ TIMESTAMPTZ      │ NO       │ Fecha de creación (auto)         │
  │ updated_at         │ TIMESTAMPTZ      │ NO       │ Última modificación (trigger)    │
  └────────────────────┴──────────────────┴──────────┴─────────────────────────────────┘

TABLA: appointment_staff
  Propósito: Relación N:M entre citas y personal operativo asignado
  Cardinalidad estimada: 1,000 - 100,000 registros
  ┌────────────────┬──────────────┬──────────┬──────────────────────────────────────┐
  │ Columna        │ Tipo         │ Nulable  │ Descripción                          │
  ├────────────────┼──────────────┼──────────┼──────────────────────────────────────┤
  │ appointment_id │ UUID (FK,PK) │ NO       │ Referencia a la cita                 │
  │ staff_id       │ UUID (FK,PK) │ NO       │ Referencia al operario               │
  │ assigned_at    │ TIMESTAMPTZ  │ NO       │ Fecha/hora de asignación (auto)      │
  └────────────────┴──────────────┴──────────┴──────────────────────────────────────┘

TABLA: notifications
  Propósito: Alertas y mensajes del sistema para los usuarios
  Cardinalidad estimada: 1,000 - 100,000 registros
  ┌─────────────────┬──────────────────┬──────────┬─────────────────────────────────┐
  │ Columna         │ Tipo             │ Nulable  │ Descripción                     │
  ├─────────────────┼──────────────────┼──────────┼─────────────────────────────────┤
  │ id              │ UUID             │ NO       │ PK - Identificador único         │
  │ user_id         │ UUID (FK)        │ NO       │ Usuario destinatario             │
  │ type            │ notification_type│ NO       │ Categoría de la notificación     │
  │ title           │ TEXT             │ NO       │ Título corto de la notificación  │
  │ message         │ TEXT             │ NO       │ Mensaje completo                 │
  │ is_read         │ BOOLEAN          │ NO       │ false = no leída (default)       │
  │ related_id      │ UUID             │ SÍ       │ UUID del registro relacionado    │
  │ created_at      │ TIMESTAMPTZ      │ NO       │ Fecha de creación (auto)         │
  └─────────────────┴──────────────────┴──────────┴─────────────────────────────────┘

================================================================================
PARTE 4 — RELACIONES Y CARDINALIDADES
================================================================================

  RELACIÓN                                    TIPO    DESCRIPCIÓN
  ─────────────────────────────────────────────────────────────────────────────
  user_profiles → clients                     1:N     Un usuario registra muchos clientes
  user_profiles → services                    1:N     Un usuario crea muchos servicios
  user_profiles → quotes                      1:N     Un usuario genera muchas cotizaciones
  user_profiles → appointments                1:N     Un usuario agenda muchas citas
  user_profiles → notifications               1:N     Un usuario recibe muchas notificaciones

  clients → quotes                            1:N     Un cliente tiene muchas cotizaciones
  clients → appointments                      1:N     Un cliente tiene muchas citas

  quotes → appointments                       1:0..N  Una cotización puede originar 0 o más citas
                                                      (quote_id en appointments es NULLABLE)

  appointments ↔ staff_members               N:M     Una cita tiene varios operarios;
                                                      un operario puede estar en varias citas
                                                      (tabla de unión: appointment_staff)

================================================================================
PARTE 5 — REGLAS DE NEGOCIO IMPLEMENTADAS EN LA BASE DE DATOS
================================================================================

  1. INTEGRIDAD REFERENCIAL
     • clients.registered_by → user_profiles (SET NULL al eliminar usuario)
     • quotes.client_id → clients (RESTRICT: no se puede eliminar cliente con cotizaciones)
     • quotes.created_by → user_profiles (SET NULL al eliminar usuario)
     • appointments.client_id → clients (RESTRICT: no se puede eliminar cliente con citas)
     • appointments.quote_id → quotes (SET NULL al eliminar cotización)
     • appointment_staff → appointments y staff_members (CASCADE: se elimina la asignación)
     • notifications.user_id → user_profiles (CASCADE: se eliminan notificaciones del usuario)

  2. CONSTRAINTS DE NEGOCIO
     • quotes.total_soles = subtotal + igv (tolerancia ±0.01 por redondeo)
     • quotes.expires_at ≥ scheduled_date
     • quotes.surface_m2 ≥ 1
     • quotes.staff_count ≥ 1
     • appointments.end_time > start_time
     • services.base_price_m2 ≥ 0
     • services.min_surface_m2 ≥ 1
     • services.staff_per_100m2 ≥ 1
     • services.duration_hours > 0
     • user_profiles.email debe tener formato válido de correo

  3. AUTOMATIZACIONES (TRIGGERS)
     • updated_at se actualiza automáticamente en cada UPDATE
       (tablas: user_profiles, clients, services, quotes, appointments)
     • clients.total_quotes se incrementa automáticamente al crear una cotización

  4. DETECCIÓN DE CONFLICTOS
     • La función check_staff_conflict() verifica si un operario ya tiene
       una cita activa en el mismo horario antes de asignarlo
     • appointments.has_conflict = true indica solapamiento detectado

  5. CÁLCULO DE PRECIOS (lógica de aplicación)
     • Precio base = services.base_price_m2 × surface_m2
     • Personal requerido = CEIL(surface_m2 / 100) × staff_per_100m2
     • IGV = subtotal × 0.18
     • Total = subtotal + IGV

================================================================================
PARTE 6 — ÍNDICES Y OPTIMIZACIÓN
================================================================================

  ÍNDICE                                  TABLA             PROPÓSITO
  ─────────────────────────────────────────────────────────────────────────────
  idx_user_profiles_email                 user_profiles     Login por email
  idx_user_profiles_role                  user_profiles     Filtrar por rol
  idx_clients_code                        clients           Búsqueda por código
  idx_clients_status                      clients           Filtrar activos/inactivos
  idx_clients_doc_number                  clients           Búsqueda por RUC/DNI
  idx_quotes_client_id                    quotes            Cotizaciones por cliente
  idx_quotes_status                       quotes            Filtrar por estado
  idx_quotes_created_at                   quotes            Ordenar por fecha (DESC)
  idx_quotes_expires_at                   quotes            Detectar vencidas
  idx_appointments_service_date           appointments      Agenda por fecha
  idx_appointments_status                 appointments      Filtrar por estado
  idx_appointments_has_conflict           appointments      Solo citas con conflicto
  idx_appointment_staff_staff_id          appointment_staff Citas por operario
  idx_notifications_user_id              notifications     Notificaciones por usuario
  idx_notifications_is_read              notifications     Solo no leídas (parcial)

================================================================================
PARTE 7 — VISTAS DISPONIBLES
================================================================================

  VISTA                       DESCRIPCIÓN
  ─────────────────────────────────────────────────────────────────────────────
  v_quotes_summary            Cotizaciones con datos completos del cliente
  v_appointments_with_staff   Citas con personal asignado y datos del cliente
  v_dashboard_stats           Estadísticas generales para el dashboard

================================================================================
FIN DEL MODELADO DE DATOS — CleanSenso v1.0.0
================================================================================
*/
