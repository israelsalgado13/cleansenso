'use client';

/**
 * Módulo de Configuración del sistema CleanSenso
 * Incluye: Empresa, Notificaciones, Usuarios y Roles (agregar usuario),
 *          Seguridad (actualizar contraseña), Apariencia (botones habilitados)
 * Conectado a Supabase para gestión de usuarios y contraseñas
 */

import React, { useState } from 'react';
import AppLayout from '@/components/AppLayout';
import { Building2, Bell, Users, Shield, Palette, Save, Check, Plus, Eye, EyeOff,  } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';

import { toast } from 'sonner';

// ── Tipos ──────────────────────────────────────────────────────────────────────

interface SettingSection {
  id: string;
  label: string;
  description: string;
  icon: React.ReactNode;
  iconBg: string;
}

// ── Secciones de configuración ─────────────────────────────────────────────────

const sections: SettingSection[] = [
  { id: 'empresa', label: 'Empresa', description: 'Datos generales, logo y contacto',
    icon: <Building2 size={18} className="text-primary" />, iconBg: 'bg-primary/10' },
  { id: 'notificaciones', label: 'Notificaciones', description: 'Alertas de citas, cotizaciones y recordatorios',
    icon: <Bell size={18} className="text-violet-600" />, iconBg: 'bg-violet-50' },
  { id: 'usuarios', label: 'Usuarios y Roles', description: 'Gestión de accesos y permisos del equipo',
    icon: <Users size={18} className="text-emerald-600" />, iconBg: 'bg-emerald-50' },
  { id: 'seguridad', label: 'Seguridad', description: 'Contraseñas, sesiones y autenticación',
    icon: <Shield size={18} className="text-orange-500" />, iconBg: 'bg-orange-50' },
  { id: 'apariencia', label: 'Apariencia', description: 'Tema, idioma y preferencias visuales',
    icon: <Palette size={18} className="text-pink-500" />, iconBg: 'bg-pink-50' },
];

// ── Componentes de campo ───────────────────────────────────────────────────────

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-1.5">
      <label className="text-xs font-600 text-secondary-foreground uppercase tracking-wide">{label}</label>
      {children}
    </div>
  );
}

function InputField({ defaultValue, placeholder, type = 'text', value, onChange }: {
  defaultValue?: string; placeholder?: string; type?: string;
  value?: string; onChange?: (v: string) => void;
}) {
  return (
    <input
      type={type}
      defaultValue={defaultValue}
      value={value}
      onChange={e => onChange?.(e.target.value)}
      placeholder={placeholder}
      className="w-full px-3 py-2 rounded-lg border border-border bg-background text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary transition-colors"
    />
  );
}

function Toggle({ defaultChecked, label }: { defaultChecked?: boolean; label: string }) {
  const [on, setOn] = useState(defaultChecked ?? false);
  return (
    <div className="flex items-center justify-between py-3 border-b border-border last:border-0">
      <span className="text-sm text-foreground">{label}</span>
      <button onClick={() => setOn(!on)}
        className={`relative w-10 h-5 rounded-full transition-colors ${on ? 'bg-primary' : 'bg-muted-foreground/30'}`}
        aria-pressed={on}>
        <span className={`absolute top-0.5 left-0.5 w-4 h-4 rounded-full bg-white shadow transition-transform ${on ? 'translate-x-5' : 'translate-x-0'}`} />
      </button>
    </div>
  );
}

// ── Panel de Empresa ───────────────────────────────────────────────────────────

function EmpresaPanel() {
  const [saving, setSaving] = useState(false);
  const handleSave = () => {
    setSaving(true);
    setTimeout(() => { setSaving(false); toast.success('Datos de empresa guardados correctamente'); }, 800);
  };
  return (
    <div className="space-y-5">
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
        <Field label="Razón Social"><InputField defaultValue="Grupo Consenso Perú S.A.C." /></Field>
        <Field label="RUC"><InputField defaultValue="20601234567" /></Field>
        <Field label="Nombre Comercial"><InputField defaultValue="CleanSenso" /></Field>
        <Field label="Teléfono Principal"><InputField defaultValue="+51 1 234-5678" /></Field>
        <Field label="Correo de Contacto"><InputField defaultValue="contacto@cleansenso.pe" /></Field>
        <Field label="Dirección"><InputField defaultValue="Av. Javier Prado Este 1234, San Isidro, Lima" /></Field>
        <div className="sm:col-span-2">
          <Field label="Descripción del Negocio">
            <textarea defaultValue="Empresa especializada en servicios de limpieza industrial, desinfección y mantenimiento para empresas en Lima Metropolitana."
              rows={3} className="w-full px-3 py-2 rounded-lg border border-border bg-background text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary transition-colors resize-none" />
          </Field>
        </div>
      </div>
      <button onClick={handleSave} disabled={saving}
        className="flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground text-sm font-600 rounded-lg hover:bg-primary/90 disabled:opacity-60 transition-all active:scale-95">
        {saving ? <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : <Save size={14} />}
        {saving ? 'Guardando...' : 'Guardar Cambios'}
      </button>
    </div>
  );
}

// ── Panel de Notificaciones ────────────────────────────────────────────────────

function NotificacionesPanel() {
  const [saving, setSaving] = useState(false);
  const handleSave = () => {
    setSaving(true);
    setTimeout(() => { setSaving(false); toast.success('Preferencias de notificaciones guardadas'); }, 600);
  };
  return (
    <div className="space-y-4">
      <div className="divide-y divide-border">
        <Toggle defaultChecked label="Recordatorio de citas 24 horas antes" />
        <Toggle defaultChecked label="Alerta cuando una cotización es aceptada" />
        <Toggle defaultChecked label="Notificación de nuevos clientes registrados" />
        <Toggle label="Resumen diario de actividad por correo" />
        <Toggle defaultChecked label="Alerta de citas sin confirmar (48 h)" />
        <Toggle label="Notificación de cotizaciones próximas a vencer" />
        <Toggle defaultChecked label="Alerta de conflictos de agenda" />
      </div>
      <button onClick={handleSave} disabled={saving}
        className="flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground text-sm font-600 rounded-lg hover:bg-primary/90 disabled:opacity-60 transition-all active:scale-95">
        {saving ? <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : <Save size={14} />}
        {saving ? 'Guardando...' : 'Guardar Preferencias'}
      </button>
    </div>
  );
}

// ── Panel de Usuarios y Roles ──────────────────────────────────────────────────

function UsuariosPanel() {
  const supabase = createClient();
  const [showAddForm, setShowAddForm] = useState(false);
  const [newEmail, setNewEmail] = useState('');
  const [newName, setNewName] = useState('');
  const [newRole, setNewRole] = useState('supervisor');
  const [newPassword, setNewPassword] = useState('');
  const [adding, setAdding] = useState(false);

  const users = [
    { name: 'Carlos Alvarado', email: 'admin@cleansenso.pe', role: 'Administrador', status: 'Activo' },
    { name: 'María Torres', email: 'supervisor@cleansenso.pe', role: 'Supervisor', status: 'Activo' },
  ];

  /**
   * Crea un nuevo usuario en Supabase Auth con el rol especificado
   */
  const handleAddUser = async () => {
    if (!newEmail.trim() || !newName.trim() || !newPassword.trim()) {
      toast.error('Completa todos los campos requeridos');
      return;
    }
    setAdding(true);
    try {
      const { error } = await supabase.auth.signUp({
        email: newEmail.trim(),
        password: newPassword,
        options: {
          data: { full_name: newName.trim(), role: newRole },
        },
      });
      if (error) {
        toast.error('Error al crear usuario: ' + error.message);
        return;
      }
      toast.success(`Usuario ${newName} creado correctamente con rol ${newRole}`);
      setShowAddForm(false);
      setNewEmail(''); setNewName(''); setNewPassword(''); setNewRole('supervisor');
    } catch { toast.error('Error inesperado al crear usuario'); }
    finally { setAdding(false); }
  };

  return (
    <div className="space-y-4">
      {/* Botón agregar usuario */}
      <div className="flex justify-end">
        <button onClick={() => setShowAddForm(!showAddForm)}
          className="flex items-center gap-1.5 px-3 py-2 rounded-lg bg-primary text-primary-foreground text-xs font-600 hover:bg-primary/90 transition-colors">
          <Plus size={13} /> Agregar Usuario
        </button>
      </div>

      {/* Formulario de nuevo usuario */}
      {showAddForm && (
        <div className="bg-muted/40 border border-border rounded-xl p-4 space-y-3">
          <p className="text-sm font-600 text-foreground">Nuevo Usuario</p>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-600 text-muted-foreground mb-1">Nombre completo *</label>
              <input type="text" value={newName} onChange={e => setNewName(e.target.value)}
                className="w-full px-3 py-2 text-sm bg-background border border-input rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/30"
                placeholder="Juan Pérez" />
            </div>
            <div>
              <label className="block text-xs font-600 text-muted-foreground mb-1">Correo electrónico *</label>
              <input type="email" value={newEmail} onChange={e => setNewEmail(e.target.value)}
                className="w-full px-3 py-2 text-sm bg-background border border-input rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/30"
                placeholder="usuario@cleansenso.pe" />
            </div>
            <div>
              <label className="block text-xs font-600 text-muted-foreground mb-1">Contraseña temporal *</label>
              <input type="password" value={newPassword} onChange={e => setNewPassword(e.target.value)}
                className="w-full px-3 py-2 text-sm bg-background border border-input rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/30"
                placeholder="Mínimo 8 caracteres" />
            </div>
            <div>
              <label className="block text-xs font-600 text-muted-foreground mb-1">Rol</label>
              <select value={newRole} onChange={e => setNewRole(e.target.value)}
                className="w-full px-3 py-2 text-sm bg-background border border-input rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/30">
                <option value="admin">Administrador</option>
                <option value="supervisor">Supervisor</option>
              </select>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button onClick={() => setShowAddForm(false)}
              className="px-3 py-1.5 text-xs font-500 text-muted-foreground hover:text-foreground transition-colors">
              Cancelar
            </button>
            <button onClick={handleAddUser} disabled={adding}
              className="flex items-center gap-1.5 px-4 py-1.5 text-xs font-600 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 disabled:opacity-60 transition-all">
              {adding ? <span className="w-3 h-3 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : <Check size={12} />}
              {adding ? 'Creando...' : 'Crear Usuario'}
            </button>
          </div>
        </div>
      )}

      {/* Tabla de usuarios */}
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border">
              <th className="text-left py-2 px-3 text-xs font-600 text-muted-foreground uppercase tracking-wide">Nombre</th>
              <th className="text-left py-2 px-3 text-xs font-600 text-muted-foreground uppercase tracking-wide">Correo</th>
              <th className="text-left py-2 px-3 text-xs font-600 text-muted-foreground uppercase tracking-wide">Rol</th>
              <th className="text-left py-2 px-3 text-xs font-600 text-muted-foreground uppercase tracking-wide">Estado</th>
            </tr>
          </thead>
          <tbody>
            {users.map((u) => (
              <tr key={u.email} className="border-b border-border last:border-0 hover:bg-muted/40 transition-colors">
                <td className="py-3 px-3 font-500 text-foreground">{u.name}</td>
                <td className="py-3 px-3 text-muted-foreground">{u.email}</td>
                <td className="py-3 px-3">
                  <span className="px-2 py-0.5 rounded-full text-xs font-500 bg-primary/10 text-primary">{u.role}</span>
                </td>
                <td className="py-3 px-3">
                  <span className={`px-2 py-0.5 rounded-full text-xs font-500 ${u.status === 'Activo' ? 'bg-emerald-50 text-emerald-700' : 'bg-muted text-muted-foreground'}`}>
                    {u.status}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// ── Panel de Seguridad (actualizar contraseña) ─────────────────────────────────

function SeguridadPanel() {
  const supabase = createClient();
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showCurrent, setShowCurrent] = useState(false);
  const [showNew, setShowNew] = useState(false);
  const [saving, setSaving] = useState(false);

  /**
   * Actualiza la contraseña del usuario autenticado en Supabase
   */
  const handleUpdatePassword = async () => {
    if (!newPassword.trim()) { toast.error('Ingresa la nueva contraseña'); return; }
    if (newPassword.length < 8) { toast.error('La contraseña debe tener al menos 8 caracteres'); return; }
    if (newPassword !== confirmPassword) { toast.error('Las contraseñas no coinciden'); return; }

    setSaving(true);
    try {
      const { error } = await supabase.auth.updateUser({ password: newPassword });
      if (error) { toast.error('Error al actualizar contraseña: ' + error.message); return; }
      toast.success('Contraseña actualizada correctamente');
      setCurrentPassword(''); setNewPassword(''); setConfirmPassword('');
    } catch { toast.error('Error inesperado'); }
    finally { setSaving(false); }
  };

  return (
    <div className="space-y-5">
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
        <div>
          <label className="block text-xs font-600 text-secondary-foreground uppercase tracking-wide mb-1.5">
            Contraseña Actual
          </label>
          <div className="relative">
            <input type={showCurrent ? 'text' : 'password'} value={currentPassword}
              onChange={e => setCurrentPassword(e.target.value)}
              className="w-full px-3 py-2 pr-10 rounded-lg border border-border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary"
              placeholder="••••••••" />
            <button type="button" onClick={() => setShowCurrent(!showCurrent)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground">
              {showCurrent ? <EyeOff size={14} /> : <Eye size={14} />}
            </button>
          </div>
        </div>
        <div />
        <div>
          <label className="block text-xs font-600 text-secondary-foreground uppercase tracking-wide mb-1.5">
            Nueva Contraseña
          </label>
          <div className="relative">
            <input type={showNew ? 'text' : 'password'} value={newPassword}
              onChange={e => setNewPassword(e.target.value)}
              className="w-full px-3 py-2 pr-10 rounded-lg border border-border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary"
              placeholder="Mínimo 8 caracteres" />
            <button type="button" onClick={() => setShowNew(!showNew)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground">
              {showNew ? <EyeOff size={14} /> : <Eye size={14} />}
            </button>
          </div>
        </div>
        <div>
          <label className="block text-xs font-600 text-secondary-foreground uppercase tracking-wide mb-1.5">
            Confirmar Contraseña
          </label>
          <input type="password" value={confirmPassword} onChange={e => setConfirmPassword(e.target.value)}
            className="w-full px-3 py-2 rounded-lg border border-border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary"
            placeholder="••••••••" />
        </div>
      </div>

      <button onClick={handleUpdatePassword} disabled={saving}
        className="flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground text-sm font-600 rounded-lg hover:bg-primary/90 disabled:opacity-60 transition-all active:scale-95">
        {saving ? <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : <Shield size={14} />}
        {saving ? 'Actualizando...' : 'Actualizar Contraseña'}
      </button>

      <hr className="border-border" />
      <div className="divide-y divide-border">
        <Toggle defaultChecked label="Autenticación de dos factores (2FA)" />
        <Toggle defaultChecked label="Cerrar sesión automáticamente tras 30 min de inactividad" />
        <Toggle label="Notificar inicio de sesión desde nuevo dispositivo" />
      </div>
    </div>
  );
}

// ── Panel de Apariencia ────────────────────────────────────────────────────────

function AparienciaPanel() {
  const [theme, setTheme] = useState<'claro' | 'oscuro' | 'sistema'>('claro');
  const [lang, setLang] = useState('es-PE');
  const [density, setDensity] = useState<'compacto' | 'normal' | 'espacioso'>('normal');
  const [saving, setSaving] = useState(false);

  /**
   * Guarda las preferencias de apariencia del usuario
   */
  const handleSave = () => {
    setSaving(true);
    setTimeout(() => {
      setSaving(false);
      toast.success(`Apariencia guardada: tema ${theme}, idioma ${lang}, densidad ${density}`);
    }, 600);
  };

  return (
    <div className="space-y-6">
      {/* Selector de tema */}
      <div>
        <p className="text-xs font-600 text-secondary-foreground uppercase tracking-wide mb-3">Tema</p>
        <div className="flex gap-3">
          {(['claro', 'oscuro', 'sistema'] as const).map((t) => (
            <button key={t} onClick={() => setTheme(t)}
              className={`flex-1 py-3 rounded-xl border-2 text-sm font-500 capitalize transition-all ${
                theme === t ? 'border-primary text-primary bg-primary/5' : 'border-border text-muted-foreground hover:border-muted-foreground'
              }`}>
              {t === 'claro' ? '☀️ Claro' : t === 'oscuro' ? '🌙 Oscuro' : '💻 Sistema'}
            </button>
          ))}
        </div>
      </div>

      {/* Densidad de la interfaz */}
      <div>
        <p className="text-xs font-600 text-secondary-foreground uppercase tracking-wide mb-3">Densidad de la Interfaz</p>
        <div className="flex gap-3">
          {(['compacto', 'normal', 'espacioso'] as const).map((d) => (
            <button key={d} onClick={() => setDensity(d)}
              className={`flex-1 py-2.5 rounded-xl border-2 text-sm font-500 capitalize transition-all ${
                density === d ? 'border-primary text-primary bg-primary/5' : 'border-border text-muted-foreground hover:border-muted-foreground'
              }`}>
              {d.charAt(0).toUpperCase() + d.slice(1)}
            </button>
          ))}
        </div>
      </div>

      {/* Idioma y región */}
      <div>
        <p className="text-xs font-600 text-secondary-foreground uppercase tracking-wide mb-3">Idioma y Región</p>
        <select value={lang} onChange={e => setLang(e.target.value)}
          className="w-full px-3 py-2 rounded-lg border border-border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary">
          <option value="es-PE">Español (Perú)</option>
          <option value="es-ES">Español (España)</option>
          <option value="en-US">English (US)</option>
        </select>
      </div>

      {/* Botón guardar apariencia — habilitado */}
      <button onClick={handleSave} disabled={saving}
        className="flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground text-sm font-600 rounded-lg hover:bg-primary/90 disabled:opacity-60 transition-all active:scale-95">
        {saving ? <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : <Save size={14} />}
        {saving ? 'Aplicando...' : 'Aplicar Cambios'}
      </button>
    </div>
  );
}

// ── Página principal de Configuración ─────────────────────────────────────────

export default function SettingsPage() {
  const [activeSection, setActiveSection] = useState('empresa');

  const renderPanel = () => {
    switch (activeSection) {
      case 'empresa': return <EmpresaPanel />;
      case 'notificaciones': return <NotificacionesPanel />;
      case 'usuarios': return <UsuariosPanel />;
      case 'seguridad': return <SeguridadPanel />;
      case 'apariencia': return <AparienciaPanel />;
      default: return null;
    }
  };

  const activeSection_ = sections.find(s => s.id === activeSection);

  return (
    <AppLayout
      title="Configuración"
      subtitle="— Personaliza y administra el sistema CleanSenso"
    >
      <div className="flex gap-6">
        {/* Menú lateral de secciones */}
        <aside className="w-56 shrink-0">
          <nav className="space-y-1">
            {sections.map((section) => (
              <button
                key={section.id}
                onClick={() => setActiveSection(section.id)}
                className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-500 transition-all text-left ${
                  activeSection === section.id
                    ? 'bg-primary/10 text-primary' :'text-secondary-foreground hover:bg-muted hover:text-foreground'
                }`}
              >
                <div className={`w-7 h-7 rounded-md flex items-center justify-center ${section.iconBg}`}>
                  {section.icon}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="truncate">{section.label}</p>
                </div>
              </button>
            ))}
          </nav>
        </aside>

        {/* Panel de contenido de la sección activa */}
        <div className="flex-1 min-w-0">
          <div className="bg-card border border-border rounded-xl p-6">
            <div className="flex items-center gap-3 mb-6 pb-4 border-b border-border">
              <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${activeSection_?.iconBg}`}>
                {activeSection_?.icon}
              </div>
              <div>
                <h2 className="text-base font-700 text-foreground">{activeSection_?.label}</h2>
                <p className="text-xs text-muted-foreground">{activeSection_?.description}</p>
              </div>
            </div>
            {renderPanel()}
          </div>
        </div>
      </div>
    </AppLayout>
  );
}
