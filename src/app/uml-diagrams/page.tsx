'use client';

/**
 * Página de Diagramas UML — CleanSenso
 * Muestra los diagramas de análisis y diseño del sistema:
 * - Diagrama de Casos de Uso (Actores)
 * - Diagramas de Secuencia por módulo
 * - Diagrama de Clases
 * - Diagrama de Actividades
 * - Diagrama del Modelo de Datos (ERD)
 */

import React, { useState } from 'react';
import AppLayout from '@/components/AppLayout';

// ── Tipos ─────────────────────────────────────────────────────────────────────

type DiagramTab = 'use-case' | 'sequence' | 'class' | 'activity' | 'erd';

interface TabDef {
  id: DiagramTab;
  label: string;
  description: string;
}

// ── Definición de pestañas ────────────────────────────────────────────────────

const TABS: TabDef[] = [
  { id: 'use-case',  label: 'Casos de Uso',      description: 'Actores y funcionalidades del sistema' },
  { id: 'sequence',  label: 'Secuencia',          description: 'Flujo de mensajes entre componentes' },
  { id: 'class',     label: 'Clases',             description: 'Estructura de entidades y relaciones' },
  { id: 'activity',  label: 'Actividades',        description: 'Flujo de procesos del negocio' },
  { id: 'erd',       label: 'Modelo de Datos',    description: 'Entidad-Relación de la base de datos' },
];

// ── Colores del tema ──────────────────────────────────────────────────────────
const C = {
  primary:   '#0ea5e9',
  admin:     '#7c3aed',
  super:     '#0891b2',
  actor:     '#f59e0b',
  box:       '#1e293b',
  boxBorder: '#334155',
  text:      '#f1f5f9',
  muted:     '#94a3b8',
  line:      '#475569',
  green:     '#10b981',
  red:       '#ef4444',
  orange:    '#f97316',
  bg:        '#0f172a',
  card:      '#1e293b',
};

// ═══════════════════════════════════════════════════════════════════════════════
// DIAGRAMA 1 — CASOS DE USO
// ═══════════════════════════════════════════════════════════════════════════════

function UseCaseDiagram() {
  return (
    <div className="overflow-x-auto">
      <svg viewBox="0 0 900 620" className="w-full max-w-4xl mx-auto" style={{ minWidth: 700 }}>
        {/* Fondo */}
        <rect width="900" height="620" fill={C.bg} rx="12" />

        {/* Título */}
        <text x="450" y="32" textAnchor="middle" fill={C.text} fontSize="16" fontWeight="bold">
          Diagrama de Casos de Uso — CleanSenso
        </text>

        {/* ── Sistema boundary ── */}
        <rect x="200" y="50" width="500" height="540" fill="none" stroke={C.line} strokeWidth="1.5" strokeDasharray="6,3" rx="8" />
        <text x="450" y="68" textAnchor="middle" fill={C.muted} fontSize="11">«Sistema» CleanSenso</text>

        {/* ── Actor: Administrador ── */}
        {/* Cabeza */}
        <circle cx="80" cy="130" r="18" fill="none" stroke={C.admin} strokeWidth="2" />
        {/* Cuerpo */}
        <line x1="80" y1="148" x2="80" y2="200" stroke={C.admin} strokeWidth="2" />
        {/* Brazos */}
        <line x1="50" y1="168" x2="110" y2="168" stroke={C.admin} strokeWidth="2" />
        {/* Piernas */}
        <line x1="80" y1="200" x2="55" y2="230" stroke={C.admin} strokeWidth="2" />
        <line x1="80" y1="200" x2="105" y2="230" stroke={C.admin} strokeWidth="2" />
        <text x="80" y="248" textAnchor="middle" fill={C.admin} fontSize="12" fontWeight="600">Administrador</text>

        {/* ── Actor: Supervisor ── */}
        <circle cx="80" cy="380" r="18" fill="none" stroke={C.super} strokeWidth="2" />
        <line x1="80" y1="398" x2="80" y2="450" stroke={C.super} strokeWidth="2" />
        <line x1="50" y1="418" x2="110" y2="418" stroke={C.super} strokeWidth="2" />
        <line x1="80" y1="450" x2="55" y2="480" stroke={C.super} strokeWidth="2" />
        <line x1="80" y1="450" x2="105" y2="480" stroke={C.super} strokeWidth="2" />
        <text x="80" y="498" textAnchor="middle" fill={C.super} fontSize="12" fontWeight="600">Supervisor</text>

        {/* ── Actor: Sistema Supabase ── */}
        <rect x="810" y="270" width="70" height="36" fill="none" stroke={C.green} strokeWidth="2" rx="4" />
        <text x="845" y="284" textAnchor="middle" fill={C.green} fontSize="9">«actor»</text>
        <text x="845" y="298" textAnchor="middle" fill={C.green} fontSize="10" fontWeight="600">Supabase</text>
        <text x="845" y="320" textAnchor="middle" fill={C.muted} fontSize="9">Auth / DB</text>

        {/* ── Casos de uso ── */}
        {/* Grupo Autenticación */}
        <ellipse cx="370" cy="100" rx="100" ry="22" fill={C.box} stroke={C.primary} strokeWidth="1.5" />
        <text x="370" y="105" textAnchor="middle" fill={C.text} fontSize="11">Iniciar Sesión</text>

        <ellipse cx="370" cy="155" rx="100" ry="22" fill={C.box} stroke={C.primary} strokeWidth="1.5" />
        <text x="370" y="160" textAnchor="middle" fill={C.text} fontSize="11">Cerrar Sesión</text>

        {/* Grupo Cotizaciones */}
        <ellipse cx="580" cy="100" rx="110" ry="22" fill={C.box} stroke={C.orange} strokeWidth="1.5" />
        <text x="580" y="105" textAnchor="middle" fill={C.text} fontSize="11">Crear Cotización</text>

        <ellipse cx="580" cy="155" rx="110" ry="22" fill={C.box} stroke={C.orange} strokeWidth="1.5" />
        <text x="580" y="160" textAnchor="middle" fill={C.text} fontSize="11">Gestionar Cotizaciones</text>

        <ellipse cx="580" cy="210" rx="110" ry="22" fill={C.box} stroke={C.orange} strokeWidth="1.5" />
        <text x="580" y="215" textAnchor="middle" fill={C.text} fontSize="11">Exportar PDF Cotización</text>

        {/* Grupo Clientes */}
        <ellipse cx="370" cy="270" rx="110" ry="22" fill={C.box} stroke={C.actor} strokeWidth="1.5" />
        <text x="370" y="275" textAnchor="middle" fill={C.text} fontSize="11">Registrar Cliente</text>

        <ellipse cx="370" cy="325" rx="110" ry="22" fill={C.box} stroke={C.actor} strokeWidth="1.5" />
        <text x="370" y="330" textAnchor="middle" fill={C.text} fontSize="11">Gestionar Clientes</text>

        {/* Grupo Citas */}
        <ellipse cx="580" cy="270" rx="110" ry="22" fill={C.box} stroke={C.green} strokeWidth="1.5" />
        <text x="580" y="275" textAnchor="middle" fill={C.text} fontSize="11">Programar Cita</text>

        <ellipse cx="580" cy="325" rx="110" ry="22" fill={C.box} stroke={C.green} strokeWidth="1.5" />
        <text x="580" y="330" textAnchor="middle" fill={C.text} fontSize="11">Confirmar / Editar Cita</text>

        {/* Grupo Servicios */}
        <ellipse cx="370" cy="420" rx="110" ry="22" fill={C.box} stroke={C.primary} strokeWidth="1.5" />
        <text x="370" y="425" textAnchor="middle" fill={C.text} fontSize="11">Gestionar Servicios</text>

        {/* Grupo Reportes */}
        <ellipse cx="580" cy="420" rx="110" ry="22" fill={C.box} stroke={C.red} strokeWidth="1.5" />
        <text x="580" y="425" textAnchor="middle" fill={C.text} fontSize="11">Ver Reportes</text>

        {/* Grupo Config */}
        <ellipse cx="370" cy="530" rx="110" ry="22" fill={C.box} stroke={C.admin} strokeWidth="1.5" />
        <text x="370" y="535" textAnchor="middle" fill={C.text} fontSize="11">Configurar Sistema</text>

        <ellipse cx="580" cy="530" rx="110" ry="22" fill={C.box} stroke={C.admin} strokeWidth="1.5" />
        <text x="580" y="535" textAnchor="middle" fill={C.text} fontSize="11">Gestionar Usuarios</text>

        {/* ── Líneas Administrador → CU ── */}
        {[100, 155, 100, 155, 210, 270, 325, 270, 325, 420, 420, 530, 530].map((cy, i) => {
          const cx = i < 2 ? 370 : i < 5 ? 580 : i < 7 ? 370 : i < 9 ? 580 : i < 11 ? 370 : i < 12 ? 370 : 580;
          return <line key={`adm-${i}`} x1="98" y1="130" x2={cx - (cx < 400 ? 110 : 110)} y2={cy} stroke={C.admin} strokeWidth="1" strokeDasharray="4,2" opacity="0.6" />;
        })}

        {/* ── Líneas Supervisor → CU ── */}
        {[100, 155, 270, 325, 420, 530].map((cy, i) => {
          const cx = i < 2 ? 370 : i < 4 ? 580 : i < 5 ? 580 : 580;
          return <line key={`sup-${i}`} x1="98" y1="380" x2={cx - 110} y2={cy} stroke={C.super} strokeWidth="1" strokeDasharray="4,2" opacity="0.6" />;
        })}

        {/* ── Líneas Supabase → CU ── */}
        <line x1="810" y1="288" x2="690" y2="100" stroke={C.green} strokeWidth="1" strokeDasharray="4,2" opacity="0.5" />
        <line x1="810" y1="288" x2="690" y2="270" stroke={C.green} strokeWidth="1" strokeDasharray="4,2" opacity="0.5" />

        {/* ── Leyenda ── */}
        <rect x="210" y="570" width="12" height="12" fill="none" stroke={C.admin} strokeWidth="2" rx="2" />
        <text x="228" y="581" fill={C.muted} fontSize="10">Administrador</text>
        <rect x="310" y="570" width="12" height="12" fill="none" stroke={C.super} strokeWidth="2" rx="2" />
        <text x="328" y="581" fill={C.muted} fontSize="10">Supervisor</text>
        <rect x="410" y="570" width="12" height="12" fill="none" stroke={C.orange} strokeWidth="2" rx="2" />
        <text x="428" y="581" fill={C.muted} fontSize="10">Cotizaciones</text>
        <rect x="510" y="570" width="12" height="12" fill="none" stroke={C.green} strokeWidth="2" rx="2" />
        <text x="528" y="581" fill={C.muted} fontSize="10">Citas</text>
        <rect x="580" y="570" width="12" height="12" fill="none" stroke={C.actor} strokeWidth="2" rx="2" />
        <text x="598" y="581" fill={C.muted} fontSize="10">Clientes</text>
      </svg>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// DIAGRAMA 2 — SECUENCIA
// ═══════════════════════════════════════════════════════════════════════════════

type SeqModule = 'login' | 'quote' | 'appointment';

function SequenceDiagram() {
  const [mod, setMod] = useState<SeqModule>('login');

  return (
    <div>
      {/* Selector de módulo */}
      <div className="flex gap-2 mb-6 flex-wrap">
        {(['login', 'quote', 'appointment'] as SeqModule[]).map(m => (
          <button
            key={m}
            onClick={() => setMod(m)}
            className={`px-4 py-1.5 rounded-full text-sm font-medium transition-all ${
              mod === m
                ? 'bg-sky-500 text-white' :'bg-slate-700 text-slate-300 hover:bg-slate-600'
            }`}
          >
            {m === 'login' ? 'Autenticación' : m === 'quote' ? 'Cotización' : 'Cita'}
          </button>
        ))}
      </div>

      <div className="overflow-x-auto">
        {mod === 'login'       && <SeqLogin />}
        {mod === 'quote'       && <SeqQuote />}
        {mod === 'appointment' && <SeqAppointment />}
      </div>
    </div>
  );
}

/** Secuencia: Autenticación */
function SeqLogin() {
  const actors = ['Usuario', 'Login Page', 'AuthContext', 'Supabase Auth', 'DB user_profiles', 'Middleware'];
  const xs = [70, 200, 340, 490, 640, 790];
  const msgs = [
    { from: 0, to: 1, y: 130, label: 'Ingresa email / contraseña', type: 'call' },
    { from: 1, to: 2, y: 165, label: 'signIn(email, password)', type: 'call' },
    { from: 2, to: 3, y: 200, label: 'signInWithPassword()', type: 'call' },
    { from: 3, to: 2, y: 235, label: 'session + user', type: 'return' },
    { from: 2, to: 4, y: 270, label: 'SELECT * FROM user_profiles WHERE id=uid', type: 'call' },
    { from: 4, to: 2, y: 305, label: 'UserProfile { role, full_name }', type: 'return' },
    { from: 2, to: 1, y: 340, label: 'setProfile(profile)', type: 'return' },
    { from: 1, to: 5, y: 375, label: 'router.push(/dashboard)', type: 'call' },
    { from: 5, to: 3, y: 410, label: 'Verifica sesión activa', type: 'call' },
    { from: 5, to: 1, y: 445, label: 'Redirige a /dashboard', type: 'return' },
  ];
  return <SeqSVG actors={actors} xs={xs} msgs={msgs} height={500} title="Secuencia: Inicio de Sesión" />;
}

/** Secuencia: Crear Cotización */
function SeqQuote() {
  const actors = ['Admin/Supervisor', 'QuotePage', 'CreateQuoteModal', 'Supabase Client', 'DB quotes', 'DB clients'];
  const xs = [70, 200, 340, 490, 620, 760];
  const msgs = [
    { from: 0, to: 1, y: 130, label: 'Clic "Nueva Cotización"', type: 'call' },
    { from: 1, to: 2, y: 165, label: 'Abre modal', type: 'call' },
    { from: 2, to: 3, y: 200, label: 'SELECT clients (búsqueda)', type: 'call' },
    { from: 3, to: 5, y: 235, label: 'Query clientes activos', type: 'call' },
    { from: 5, to: 3, y: 270, label: 'Lista de clientes', type: 'return' },
    { from: 3, to: 2, y: 305, label: 'Clientes disponibles', type: 'return' },
    { from: 0, to: 2, y: 340, label: 'Completa formulario y envía', type: 'call' },
    { from: 2, to: 3, y: 375, label: 'INSERT INTO quotes (...)', type: 'call' },
    { from: 3, to: 4, y: 410, label: 'Persiste cotización', type: 'call' },
    { from: 4, to: 3, y: 445, label: 'quote { id, code }', type: 'return' },
    { from: 3, to: 2, y: 480, label: 'Cotización creada OK', type: 'return' },
    { from: 2, to: 1, y: 515, label: 'Cierra modal, refresca tabla', type: 'return' },
  ];
  return <SeqSVG actors={actors} xs={xs} msgs={msgs} height={570} title="Secuencia: Crear Cotización" />;
}

/** Secuencia: Programar Cita */
function SeqAppointment() {
  const actors = ['Admin/Supervisor', 'AgendaPage', 'CreateApptModal', 'Supabase Client', 'DB appointments', 'DB staff'];
  const xs = [70, 200, 340, 490, 620, 760];
  const msgs = [
    { from: 0, to: 1, y: 130, label: 'Clic "Programar Cita"', type: 'call' },
    { from: 1, to: 2, y: 165, label: 'Abre modal', type: 'call' },
    { from: 2, to: 3, y: 200, label: 'SELECT staff_members activos', type: 'call' },
    { from: 3, to: 5, y: 235, label: 'Query personal disponible', type: 'call' },
    { from: 5, to: 3, y: 270, label: 'Lista de operarios', type: 'return' },
    { from: 3, to: 2, y: 305, label: 'Personal disponible', type: 'return' },
    { from: 0, to: 2, y: 340, label: 'Selecciona fecha, turno, personal', type: 'call' },
    { from: 2, to: 3, y: 375, label: 'Verifica conflictos de horario', type: 'call' },
    { from: 3, to: 4, y: 410, label: 'SELECT citas misma fecha/turno', type: 'call' },
    { from: 4, to: 3, y: 445, label: 'Sin conflictos', type: 'return' },
    { from: 2, to: 3, y: 480, label: 'INSERT INTO appointments + appointment_staff', type: 'call' },
    { from: 3, to: 4, y: 515, label: 'Persiste cita y asignación', type: 'call' },
    { from: 4, to: 3, y: 550, label: 'appointment { id, code }', type: 'return' },
    { from: 3, to: 2, y: 585, label: 'Cita programada OK', type: 'return' },
    { from: 2, to: 1, y: 620, label: 'Cierra modal, actualiza calendario', type: 'return' },
  ];
  return <SeqSVG actors={actors} xs={xs} msgs={msgs} height={670} title="Secuencia: Programar Cita" />;
}

/** Componente genérico de diagrama de secuencia */
interface SeqMsg { from: number; to: number; y: number; label: string; type: 'call' | 'return'; }
function SeqSVG({ actors, xs, msgs, height, title }: { actors: string[]; xs: number[]; msgs: SeqMsg[]; height: number; title: string; }) {
  const W = Math.max(...xs) + 80;
  return (
    <svg viewBox={`0 0 ${W} ${height}`} className="w-full" style={{ minWidth: 700 }}>
      <rect width={W} height={height} fill={C.bg} rx="12" />
      <text x={W / 2} y="28" textAnchor="middle" fill={C.text} fontSize="14" fontWeight="bold">{title}</text>

      {/* Cajas de actores */}
      {actors.map((a, i) => (
        <g key={i}>
          <rect x={xs[i] - 55} y="40" width="110" height="32" fill={C.box} stroke={C.primary} strokeWidth="1.5" rx="4" />
          <text x={xs[i]} y="61" textAnchor="middle" fill={C.text} fontSize="10" fontWeight="600">{a}</text>
          {/* Línea de vida */}
          <line x1={xs[i]} y1="72" x2={xs[i]} y2={height - 20} stroke={C.line} strokeWidth="1" strokeDasharray="5,3" />
        </g>
      ))}

      {/* Mensajes */}
      {msgs.map((m, i) => {
        const x1 = xs[m.from];
        const x2 = xs[m.to];
        const isReturn = m.type === 'return';
        const color = isReturn ? C.muted : C.primary;
        const dash = isReturn ? '6,3' : 'none';
        const dir = x2 > x1 ? 1 : -1;
        return (
          <g key={i}>
            <line x1={x1} y1={m.y} x2={x2} y2={m.y} stroke={color} strokeWidth="1.5" strokeDasharray={dash} />
            {/* Flecha */}
            <polygon
              points={`${x2},${m.y} ${x2 - dir * 8},${m.y - 4} ${x2 - dir * 8},${m.y + 4}`}
              fill={color}
            />
            {/* Etiqueta */}
            <rect
              x={Math.min(x1, x2) + Math.abs(x2 - x1) / 2 - 70}
              y={m.y - 16}
              width="140"
              height="14"
              fill={C.bg}
              opacity="0.8"
            />
            <text
              x={(x1 + x2) / 2}
              y={m.y - 5}
              textAnchor="middle"
              fill={isReturn ? C.muted : C.text}
              fontSize="9"
            >
              {m.label}
            </text>
          </g>
        );
      })}
    </svg>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// DIAGRAMA 3 — CLASES
// ═══════════════════════════════════════════════════════════════════════════════

function ClassDiagram() {
  return (
    <div className="overflow-x-auto">
      <svg viewBox="0 0 960 700" className="w-full" style={{ minWidth: 800 }}>
        <rect width="960" height="700" fill={C.bg} rx="12" />
        <text x="480" y="28" textAnchor="middle" fill={C.text} fontSize="15" fontWeight="bold">
          Diagrama de Clases — CleanSenso
        </text>

        {/* ── UserProfile ── */}
        <ClassBox x={30} y={50} w={180} title="UserProfile" color={C.admin}
          attrs={['id: UUID', 'email: string', 'full_name: string', 'role: UserRole', 'phone: string', 'is_active: boolean']}
          methods={['isAdmin(): boolean', 'isSupervisor(): boolean']} />

        {/* ── Client ── */}
        <ClassBox x={260} y={50} w={190} title="Client" color={C.actor}
          attrs={['id: UUID', 'code: string', 'name: string', 'doc_type: DocType', 'doc_number: string', 'client_type: ClientType', 'district: string', 'status: ClientStatus']}
          methods={['getFullAddress(): string']} />

        {/* ── Service ── */}
        <ClassBox x={500} y={50} w={190} title="Service" color={C.primary}
          attrs={['id: UUID', 'code: string', 'name: string', 'category: ServiceCategory', 'base_price_m2: number', 'min_surface_m2: number', 'status: ServiceStatus']}
          methods={['calculatePrice(m2): number']} />

        {/* ── Quote ── */}
        <ClassBox x={30} y={340} w={200} title="Quote" color={C.orange}
          attrs={['id: UUID', 'code: string', 'client_id: UUID', 'service_type: string', 'surface_m2: number', 'staff_count: number', 'subtotal: number', 'igv: number', 'total_soles: number', 'status: QuoteStatus', 'expires_at: Date']}
          methods={['calculateTotal(): number', 'isExpired(): boolean']} />

        {/* ── Appointment ── */}
        <ClassBox x={280} y={340} w={200} title="Appointment" color={C.green}
          attrs={['id: UUID', 'code: string', 'client_id: UUID', 'quote_id: UUID?', 'service_type: string', 'service_date: Date', 'start_time: Time', 'end_time: Time', 'shift: ShiftType', 'status: AppointmentStatus', 'has_conflict: boolean']}
          methods={['hasConflict(): boolean', 'confirm(): void']} />

        {/* ── StaffMember ── */}
        <ClassBox x={530} y={340} w={180} title="StaffMember" color={C.super}
          attrs={['id: UUID', 'name: string', 'specialty: string', 'phone: string', 'is_active: boolean']}
          methods={['isAvailable(date): boolean']} />

        {/* ── Notification ── */}
        <ClassBox x={740} y={50} w={185} title="Notification" color={C.red}
          attrs={['id: UUID', 'user_id: UUID', 'type: NotificationType', 'title: string', 'message: string', 'is_read: boolean', 'related_id: UUID?']}
          methods={['markAsRead(): void']} />

        {/* ── AppointmentStaff (join) ── */}
        <ClassBox x={740} y={380} w={175} title="AppointmentStaff" color={C.line}
          attrs={['appointment_id: UUID', 'staff_id: UUID']}
          methods={[]} />

        {/* ── Relaciones ── */}
        {/* UserProfile → Client (registra) */}
        <RelLine x1={210} y1={120} x2={260} y2={120} label="registra" />
        {/* Client → Quote */}
        <RelLine x1={130} y1={220} x2={130} y2={340} label="tiene" vertical />
        {/* Client → Appointment */}
        <RelLine x1={355} y1={220} x2={355} y2={340} label="agenda" vertical />
        {/* Quote → Appointment */}
        <RelLine x1={230} y1={440} x2={280} y2={440} label="origina" />
        {/* Appointment → AppointmentStaff */}
        <RelLine x1={480} y1={440} x2={530} y2={440} label="" />
        <RelLine x1={740} y1={440} x2={740} y2={420} label="" vertical />
        {/* StaffMember → AppointmentStaff */}
        <RelLine x1={620} y1={440} x2={740} y2={440} label="asignado" />
        {/* UserProfile → Notification */}
        <RelLine x1={210} y1={90} x2={740} y2={90} label="recibe" />
      </svg>
    </div>
  );
}

/** Caja de clase UML */
function ClassBox({ x, y, w, title, color, attrs, methods }: {
  x: number; y: number; w: number; title: string; color: string;
  attrs: string[]; methods: string[];
}) {
  const rowH = 16;
  const headerH = 28;
  const attrH = attrs.length * rowH + 8;
  const methH = methods.length > 0 ? methods.length * rowH + 8 : 0;
  const totalH = headerH + attrH + methH;

  return (
    <g>
      {/* Borde exterior */}
      <rect x={x} y={y} width={w} height={totalH} fill={C.box} stroke={color} strokeWidth="1.5" rx="4" />
      {/* Header */}
      <rect x={x} y={y} width={w} height={headerH} fill={color} opacity="0.25" rx="4" />
      <rect x={x} y={y + headerH - 4} width={w} height={4} fill={color} opacity="0.25" />
      <text x={x + w / 2} y={y + 18} textAnchor="middle" fill={color} fontSize="11" fontWeight="700">
        {title}
      </text>
      {/* Separador attrs */}
      <line x1={x} y1={y + headerH} x2={x + w} y2={y + headerH} stroke={color} strokeWidth="0.8" opacity="0.5" />
      {/* Atributos */}
      {attrs.map((a, i) => (
        <text key={i} x={x + 8} y={y + headerH + 14 + i * rowH} fill={C.muted} fontSize="9">
          – {a}
        </text>
      ))}
      {/* Separador métodos */}
      {methods.length > 0 && (
        <>
          <line x1={x} y1={y + headerH + attrH} x2={x + w} y2={y + headerH + attrH} stroke={color} strokeWidth="0.8" opacity="0.5" />
          {methods.map((m, i) => (
            <text key={i} x={x + 8} y={y + headerH + attrH + 14 + i * rowH} fill={C.text} fontSize="9">
              + {m}
            </text>
          ))}
        </>
      )}
    </g>
  );
}

/** Línea de relación */
function RelLine({ x1, y1, x2, y2, label, vertical }: {
  x1: number; y1: number; x2: number; y2: number; label: string; vertical?: boolean;
}) {
  const mx = (x1 + x2) / 2;
  const my = (y1 + y2) / 2;
  return (
    <g>
      <line x1={x1} y1={y1} x2={x2} y2={y2} stroke={C.line} strokeWidth="1.2" strokeDasharray="4,2" />
      {label && (
        <text x={mx} y={my - 4} textAnchor="middle" fill={C.muted} fontSize="9">{label}</text>
      )}
    </g>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// DIAGRAMA 4 — ACTIVIDADES
// ═══════════════════════════════════════════════════════════════════════════════

type ActModule = 'quote' | 'appointment';

function ActivityDiagram() {
  const [mod, setMod] = useState<ActModule>('quote');
  return (
    <div>
      <div className="flex gap-2 mb-6">
        <button onClick={() => setMod('quote')} className={`px-4 py-1.5 rounded-full text-sm font-medium transition-all ${mod === 'quote' ? 'bg-sky-500 text-white' : 'bg-slate-700 text-slate-300 hover:bg-slate-600'}`}>
          Proceso de Cotización
        </button>
        <button onClick={() => setMod('appointment')} className={`px-4 py-1.5 rounded-full text-sm font-medium transition-all ${mod === 'appointment' ? 'bg-sky-500 text-white' : 'bg-slate-700 text-slate-300 hover:bg-slate-600'}`}>
          Proceso de Cita
        </button>
      </div>
      <div className="overflow-x-auto">
        {mod === 'quote' ? <ActivityQuote /> : <ActivityAppointment />}
      </div>
    </div>
  );
}

function ActivityQuote() {
  const steps = [
    { label: 'Inicio', type: 'start' },
    { label: 'Seleccionar cliente', type: 'action' },
    { label: 'Ingresar datos del servicio\n(tipo, superficie, dirección)', type: 'action' },
    { label: '¿Superficie ≥ 1 m²?', type: 'decision', yes: 'Sí', no: 'No → Error' },
    { label: 'Calcular personal requerido', type: 'action' },
    { label: 'Calcular subtotal + IGV', type: 'action' },
    { label: 'Asignar fecha y vigencia', type: 'action' },
    { label: '¿Guardar como borrador o enviar?', type: 'decision', yes: 'Enviar', no: 'Borrador' },
    { label: 'Estado = "enviada"', type: 'action' },
    { label: 'Notificar al cliente', type: 'action' },
    { label: '¿Cliente acepta?', type: 'decision', yes: 'Sí', no: 'No → Rechazada' },
    { label: 'Estado = "aceptada"\nGenerar Orden de Servicio', type: 'action' },
    { label: 'Fin', type: 'end' },
  ];
  return <ActivitySVG steps={steps} title="Actividades: Proceso de Cotización" />;
}

function ActivityAppointment() {
  const steps = [
    { label: 'Inicio', type: 'start' },
    { label: 'Seleccionar cliente y servicio', type: 'action' },
    { label: 'Elegir fecha y turno', type: 'action' },
    { label: 'Verificar disponibilidad\nde personal', type: 'action' },
    { label: '¿Hay conflicto de horario?', type: 'decision', yes: 'Sí → Marcar conflicto', no: 'No' },
    { label: 'Asignar personal operativo', type: 'action' },
    { label: 'Guardar cita (estado: programada)', type: 'action' },
    { label: 'Enviar notificación\nal supervisor', type: 'action' },
    { label: '¿Confirmar cita?', type: 'decision', yes: 'Sí', no: 'Cancelar' },
    { label: 'Estado = "confirmada"', type: 'action' },
    { label: 'Ejecutar servicio\n(estado: en_progreso → completada)', type: 'action' },
    { label: 'Fin', type: 'end' },
  ];
  return <ActivitySVG steps={steps} title="Actividades: Proceso de Cita" />;
}

function ActivitySVG({ steps, title }: { steps: any[]; title: string }) {
  const W = 500;
  const cx = W / 2;
  const startY = 50;
  const stepH = 52;
  const H = startY + steps.length * stepH + 40;

  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="w-full max-w-lg mx-auto" style={{ minWidth: 380 }}>
      <rect width={W} height={H} fill={C.bg} rx="12" />
      <text x={cx} y="28" textAnchor="middle" fill={C.text} fontSize="13" fontWeight="bold">{title}</text>

      {steps.map((s, i) => {
        const y = startY + i * stepH;
        const nextY = y + stepH;

        return (
          <g key={i}>
            {/* Conector hacia abajo */}
            {i < steps.length - 1 && (
              <line x1={cx} y1={y + 22} x2={cx} y2={nextY - 2} stroke={C.line} strokeWidth="1.5" />
            )}
            {/* Flecha */}
            {i < steps.length - 1 && (
              <polygon points={`${cx},${nextY + 2} ${cx - 5},${nextY - 6} ${cx + 5},${nextY - 6}`} fill={C.line} />
            )}

            {s.type === 'start' && (
              <circle cx={cx} cy={y} r="12" fill={C.primary} />
            )}
            {s.type === 'end' && (
              <g>
                <circle cx={cx} cy={y} r="12" fill="none" stroke={C.primary} strokeWidth="2" />
                <circle cx={cx} cy={y} r="8" fill={C.primary} />
              </g>
            )}
            {s.type === 'action' && (
              <g>
                <rect x={cx - 110} y={y - 16} width="220" height="32" fill={C.box} stroke={C.primary} strokeWidth="1.2" rx="6" />
                {s.label.split('\n').map((line: string, li: number) => (
                  <text key={li} x={cx} y={y - 2 + li * 13} textAnchor="middle" fill={C.text} fontSize="10">{line}</text>
                ))}
              </g>
            )}
            {s.type === 'decision' && (
              <g>
                <polygon
                  points={`${cx},${y - 18} ${cx + 100},${y} ${cx},${y + 18} ${cx - 100},${y}`}
                  fill={C.box} stroke={C.orange} strokeWidth="1.5"
                />
                <text x={cx} y={y + 4} textAnchor="middle" fill={C.text} fontSize="9">{s.label}</text>
                {s.yes && <text x={cx + 60} y={y - 6} fill={C.green} fontSize="9">{s.yes}</text>}
                {s.no  && <text x={cx - 95} y={y + 28} fill={C.red} fontSize="9">{s.no}</text>}
              </g>
            )}
          </g>
        );
      })}
    </svg>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// DIAGRAMA 5 — ERD (Modelo de Datos)
// ═══════════════════════════════════════════════════════════════════════════════

function ERDDiagram() {
  return (
    <div className="overflow-x-auto">
      <svg viewBox="0 0 1000 720" className="w-full" style={{ minWidth: 900 }}>
        <rect width="1000" height="720" fill={C.bg} rx="12" />
        <text x="500" y="28" textAnchor="middle" fill={C.text} fontSize="15" fontWeight="bold">
          Diagrama Entidad-Relación — CleanSenso (ERD)
        </text>

        {/* ── user_profiles ── */}
        <ERDTable x={20} y={50} title="user_profiles" color={C.admin} fields={[
          { name: 'id', type: 'UUID PK', pk: true },
          { name: 'email', type: 'TEXT UNIQUE' },
          { name: 'full_name', type: 'TEXT' },
          { name: 'role', type: 'user_role ENUM' },
          { name: 'phone', type: 'TEXT' },
          { name: 'is_active', type: 'BOOLEAN' },
          { name: 'created_at', type: 'TIMESTAMPTZ' },
        ]} />

        {/* ── clients ── */}
        <ERDTable x={260} y={50} title="clients" color={C.actor} fields={[
          { name: 'id', type: 'UUID PK', pk: true },
          { name: 'code', type: 'TEXT UNIQUE' },
          { name: 'name', type: 'TEXT' },
          { name: 'doc_type', type: 'doc_type ENUM' },
          { name: 'doc_number', type: 'TEXT' },
          { name: 'client_type', type: 'client_type ENUM' },
          { name: 'district', type: 'TEXT' },
          { name: 'status', type: 'client_status ENUM' },
          { name: 'registered_by', type: 'UUID FK→user_profiles', fk: true },
        ]} />

        {/* ── services ── */}
        <ERDTable x={520} y={50} title="services" color={C.primary} fields={[
          { name: 'id', type: 'UUID PK', pk: true },
          { name: 'code', type: 'TEXT UNIQUE' },
          { name: 'name', type: 'TEXT' },
          { name: 'category', type: 'service_category ENUM' },
          { name: 'base_price_m2', type: 'NUMERIC(10,2)' },
          { name: 'min_surface_m2', type: 'NUMERIC(10,2)' },
          { name: 'status', type: 'service_status ENUM' },
          { name: 'created_by', type: 'UUID FK→user_profiles', fk: true },
        ]} />

        {/* ── quotes ── */}
        <ERDTable x={20} y={360} title="quotes" color={C.orange} fields={[
          { name: 'id', type: 'UUID PK', pk: true },
          { name: 'code', type: 'TEXT UNIQUE' },
          { name: 'client_id', type: 'UUID FK→clients', fk: true },
          { name: 'service_type', type: 'TEXT' },
          { name: 'surface_m2', type: 'NUMERIC(10,2)' },
          { name: 'staff_count', type: 'INTEGER' },
          { name: 'subtotal', type: 'NUMERIC(12,2)' },
          { name: 'igv', type: 'NUMERIC(12,2)' },
          { name: 'total_soles', type: 'NUMERIC(12,2)' },
          { name: 'status', type: 'quote_status ENUM' },
          { name: 'expires_at', type: 'DATE' },
          { name: 'created_by', type: 'UUID FK→user_profiles', fk: true },
        ]} />

        {/* ── appointments ── */}
        <ERDTable x={280} y={360} title="appointments" color={C.green} fields={[
          { name: 'id', type: 'UUID PK', pk: true },
          { name: 'code', type: 'TEXT UNIQUE' },
          { name: 'client_id', type: 'UUID FK→clients', fk: true },
          { name: 'quote_id', type: 'UUID FK→quotes (nullable)', fk: true },
          { name: 'service_type', type: 'TEXT' },
          { name: 'service_date', type: 'DATE' },
          { name: 'start_time', type: 'TIME' },
          { name: 'end_time', type: 'TIME' },
          { name: 'shift', type: 'shift_type ENUM' },
          { name: 'status', type: 'appointment_status ENUM' },
          { name: 'has_conflict', type: 'BOOLEAN' },
          { name: 'created_by', type: 'UUID FK→user_profiles', fk: true },
        ]} />

        {/* ── staff_members ── */}
        <ERDTable x={560} y={360} title="staff_members" color={C.super} fields={[
          { name: 'id', type: 'UUID PK', pk: true },
          { name: 'name', type: 'TEXT' },
          { name: 'specialty', type: 'TEXT' },
          { name: 'phone', type: 'TEXT' },
          { name: 'is_active', type: 'BOOLEAN' },
          { name: 'created_at', type: 'TIMESTAMPTZ' },
        ]} />

        {/* ── appointment_staff ── */}
        <ERDTable x={760} y={360} title="appointment_staff" color={C.line} fields={[
          { name: 'appointment_id', type: 'UUID FK PK', pk: true, fk: true },
          { name: 'staff_id', type: 'UUID FK PK', pk: true, fk: true },
        ]} />

        {/* ── notifications ── */}
        <ERDTable x={760} y={50} title="notifications" color={C.red} fields={[
          { name: 'id', type: 'UUID PK', pk: true },
          { name: 'user_id', type: 'UUID FK→user_profiles', fk: true },
          { name: 'type', type: 'notification_type ENUM' },
          { name: 'title', type: 'TEXT' },
          { name: 'message', type: 'TEXT' },
          { name: 'is_read', type: 'BOOLEAN' },
          { name: 'related_id', type: 'UUID (nullable)' },
        ]} />

        {/* ── Relaciones (líneas FK) ── */}
        {/* user_profiles → clients */}
        <ERDRel x1={240} y1={120} x2={260} y2={120} label="1:N" />
        {/* user_profiles → quotes */}
        <ERDRel x1={120} y1={230} x2={120} y2={360} label="1:N" vertical />
        {/* user_profiles → appointments */}
        <ERDRel x1={200} y1={230} x2={380} y2={360} label="1:N" />
        {/* user_profiles → notifications */}
        <ERDRel x1={240} y1={90} x2={760} y2={90} label="1:N" />
        {/* clients → quotes */}
        <ERDRel x1={360} y1={230} x2={120} y2={360} label="1:N" />
        {/* clients → appointments */}
        <ERDRel x1={400} y1={230} x2={400} y2={360} label="1:N" vertical />
        {/* quotes → appointments */}
        <ERDRel x1={220} y1={540} x2={280} y2={480} label="1:N" />
        {/* appointments → appointment_staff */}
        <ERDRel x1={520} y1={460} x2={760} y2={460} label="1:N" />
        {/* staff_members → appointment_staff */}
        <ERDRel x1={760} y1={430} x2={840} y2={430} label="1:N" />

        {/* ── Leyenda ── */}
        <rect x="20" y="680" width="960" height="30" fill={C.box} rx="4" opacity="0.5" />
        <text x="30" y="699" fill={C.muted} fontSize="10">🔑 PK = Clave Primaria</text>
        <text x="160" y="699" fill={C.muted} fontSize="10">🔗 FK = Clave Foránea</text>
        <text x="290" y="699" fill={C.muted} fontSize="10">ENUM = Tipo enumerado</text>
        <text x="430" y="699" fill={C.muted} fontSize="10">1:N = Uno a muchos</text>
        <text x="560" y="699" fill={C.muted} fontSize="10">N:M = Muchos a muchos (via appointment_staff)</text>
      </svg>
    </div>
  );
}

/** Tabla ERD */
function ERDTable({ x, y, title, color, fields }: {
  x: number; y: number; title: string; color: string;
  fields: { name: string; type: string; pk?: boolean; fk?: boolean }[];
}) {
  const w = 210;
  const rowH = 18;
  const headerH = 26;
  const totalH = headerH + fields.length * rowH + 6;

  return (
    <g>
      <rect x={x} y={y} width={w} height={totalH} fill={C.box} stroke={color} strokeWidth="1.5" rx="4" />
      <rect x={x} y={y} width={w} height={headerH} fill={color} opacity="0.3" rx="4" />
      <text x={x + w / 2} y={y + 17} textAnchor="middle" fill={color} fontSize="11" fontWeight="700">{title}</text>
      <line x1={x} y1={y + headerH} x2={x + w} y2={y + headerH} stroke={color} strokeWidth="0.8" opacity="0.5" />
      {fields.map((f, i) => (
        <g key={i}>
          <text x={x + 8} y={y + headerH + 14 + i * rowH} fill={f.pk ? C.actor : f.fk ? C.green : C.muted} fontSize="9">
            {f.pk ? '🔑 ' : f.fk ? '🔗 ' : '   '}{f.name}
          </text>
          <text x={x + w - 6} y={y + headerH + 14 + i * rowH} textAnchor="end" fill={C.line} fontSize="8">
            {f.type}
          </text>
          {i < fields.length - 1 && (
            <line x1={x + 4} y1={y + headerH + 18 + i * rowH} x2={x + w - 4} y2={y + headerH + 18 + i * rowH}
              stroke={C.boxBorder} strokeWidth="0.5" />
          )}
        </g>
      ))}
    </g>
  );
}

/** Línea de relación ERD */
function ERDRel({ x1, y1, x2, y2, label, vertical }: {
  x1: number; y1: number; x2: number; y2: number; label: string; vertical?: boolean;
}) {
  const mx = (x1 + x2) / 2;
  const my = (y1 + y2) / 2;
  return (
    <g>
      <line x1={x1} y1={y1} x2={x2} y2={y2} stroke={C.line} strokeWidth="1.2" strokeDasharray="5,3" />
      <text x={mx + 4} y={my - 3} fill={C.primary} fontSize="9" fontWeight="600">{label}</text>
    </g>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// COMPONENTE PRINCIPAL
// ═══════════════════════════════════════════════════════════════════════════════

export default function UMLDiagramsPage() {
  const [activeTab, setActiveTab] = useState<DiagramTab>('use-case');

  return (
    <AppLayout>
      <div className="p-6 max-w-7xl mx-auto">
        {/* Encabezado */}
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-foreground">Diagramas UML</h1>
          <p className="text-muted-foreground text-sm mt-1">
            Documentación técnica del sistema CleanSenso — Grupo Consenso Perú
          </p>
        </div>

        {/* Pestañas */}
        <div className="flex flex-wrap gap-2 mb-6 border-b border-border pb-4">
          {TABS.map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                activeTab === tab.id
                  ? 'bg-primary text-primary-foreground shadow-sm'
                  : 'bg-muted text-muted-foreground hover:text-foreground hover:bg-muted/80'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Descripción de la pestaña activa */}
        {TABS.find(t => t.id === activeTab) && (
          <p className="text-xs text-muted-foreground mb-4 italic">
            {TABS.find(t => t.id === activeTab)?.description}
          </p>
        )}

        {/* Contenido del diagrama */}
        <div className="bg-card border border-border rounded-xl p-4 shadow-sm">
          {activeTab === 'use-case'  && <UseCaseDiagram />}
          {activeTab === 'sequence'  && <SequenceDiagram />}
          {activeTab === 'class'     && <ClassDiagram />}
          {activeTab === 'activity'  && <ActivityDiagram />}
          {activeTab === 'erd'       && <ERDDiagram />}
        </div>

        {/* Nota técnica */}
        <div className="mt-4 p-3 bg-muted/30 border border-border rounded-lg">
          <p className="text-xs text-muted-foreground">
            <span className="font-semibold text-foreground">Nota técnica:</span> Los diagramas están generados en SVG nativo y reflejan la arquitectura real del sistema basada en el esquema de base de datos Supabase, los módulos implementados y los flujos de negocio de CleanSenso.
          </p>
        </div>
      </div>
    </AppLayout>
  );
}
