'use client';

/**
 * Vista de perfil del Supervisor
 * Muestra información del perfil, permisos definidos por rol,
 * estadísticas de actividad y opciones de edición de perfil
 */

import React, { useState, useEffect } from 'react';
import AppLayout from '@/components/AppLayout';
import { useAuth } from '@/contexts/AuthContext';
import { createClient } from '@/lib/supabase/client';
import {
  User, Mail, Phone, Shield, CheckCircle, XCircle,
  CalendarDays, FileText, Users, BarChart3, Settings,
  Edit2, Save, X,
} from 'lucide-react';
import { toast } from 'sonner';

// ── Permisos definidos por rol ─────────────────────────────────────────────────

const SUPERVISOR_PERMISSIONS = [
  // Módulos con acceso completo
  { module: 'Cotizaciones', icon: <FileText size={16} />, actions: ['Ver', 'Crear', 'Editar', 'Enviar'], denied: ['Eliminar'] },
  { module: 'Clientes', icon: <Users size={16} />, actions: ['Ver', 'Crear', 'Editar'], denied: ['Eliminar', 'Exportar masivo'] },
  { module: 'Citas y Agenda', icon: <CalendarDays size={16} />, actions: ['Ver', 'Crear', 'Editar', 'Confirmar'], denied: ['Eliminar'] },
  { module: 'Servicios', icon: <Settings size={16} />, actions: ['Ver'], denied: ['Crear', 'Editar', 'Eliminar'] },
  { module: 'Reportes', icon: <BarChart3 size={16} />, actions: ['Ver', 'Exportar'], denied: ['Configurar'] },
  { module: 'Configuración', icon: <Settings size={16} />, actions: ['Ver perfil'], denied: ['Gestionar usuarios', 'Cambiar roles', 'Configurar empresa'] },
];

// ── Estadísticas del supervisor ────────────────────────────────────────────────

interface SupervisorStats {
  quotesCreated: number;
  appointmentsManaged: number;
  clientsRegistered: number;
  lastActivity: string;
}

export default function SupervisorProfilePage() {
  const { profile, user } = useAuth();
  const supabase = createClient();

  const [stats, setStats] = useState<SupervisorStats>({
    quotesCreated: 0, appointmentsManaged: 0, clientsRegistered: 0, lastActivity: '—',
  });
  const [editing, setEditing] = useState(false);
  const [fullName, setFullName] = useState(profile?.full_name || '');
  const [phone, setPhone] = useState(profile?.phone || '');
  const [saving, setSaving] = useState(false);

  /**
   * Carga estadísticas de actividad del supervisor desde Supabase
   */
  useEffect(() => {
    if (!user) return;
    Promise.all([
      supabase.from('quotes').select('id', { count: 'exact', head: true }).eq('created_by', user.id),
      supabase.from('appointments').select('id', { count: 'exact', head: true }).eq('created_by', user.id),
      supabase.from('clients').select('id', { count: 'exact', head: true }).eq('registered_by', user.id),
    ]).then(([q, a, c]) => {
      setStats({
        quotesCreated: q.count || 0,
        appointmentsManaged: a.count || 0,
        clientsRegistered: c.count || 0,
        lastActivity: new Date().toLocaleDateString('es-PE'),
      });
    });
  }, [user]);

  /**
   * Guarda los cambios del perfil en Supabase
   */
  const handleSave = async () => {
    setSaving(true);
    try {
      const { error } = await supabase
        .from('user_profiles')
        .update({ full_name: fullName.trim(), phone: phone.trim() })
        .eq('id', user?.id);

      if (error) { toast.error('Error al actualizar perfil: ' + error.message); return; }
      toast.success('Perfil actualizado correctamente');
      setEditing(false);
    } catch { toast.error('Error inesperado'); }
    finally { setSaving(false); }
  };

  const initials = (profile?.full_name || 'S').split(' ').slice(0, 2).map(n => n.charAt(0)).join('').toUpperCase();

  return (
    <AppLayout
      title="Mi Perfil"
      subtitle="— Vista de perfil del Supervisor"
    >
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

        {/* Columna izquierda: datos del perfil */}
        <div className="space-y-4">
          {/* Tarjeta de perfil */}
          <div className="bg-card border border-border rounded-xl p-6 text-center">
            {/* Avatar */}
            <div className="w-20 h-20 rounded-full bg-primary/20 flex items-center justify-center mx-auto mb-4">
              <span className="text-2xl font-800 text-primary">{initials}</span>
            </div>

            {!editing ? (
              <>
                <h2 className="text-lg font-700 text-foreground">{profile?.full_name || 'Supervisor'}</h2>
                <p className="text-sm text-muted-foreground mt-0.5">{profile?.email}</p>
                <div className="mt-3 flex items-center justify-center gap-2">
                  <span className="px-3 py-1 rounded-full text-xs font-600 bg-violet-50 text-violet-700 border border-violet-200">
                    Supervisor
                  </span>
                  <span className={`px-3 py-1 rounded-full text-xs font-600 ${
                    profile?.is_active ? 'bg-green-50 text-green-700' : 'bg-muted text-muted-foreground'
                  }`}>
                    {profile?.is_active ? 'Activo' : 'Inactivo'}
                  </span>
                </div>
                <button onClick={() => setEditing(true)}
                  className="mt-4 flex items-center gap-1.5 px-4 py-2 text-sm font-500 text-secondary-foreground bg-secondary border border-border rounded-lg hover:bg-muted transition-colors mx-auto">
                  <Edit2 size={14} /> Editar Perfil
                </button>
              </>
            ) : (
              <div className="space-y-3 text-left">
                <div>
                  <label className="block text-xs font-600 text-muted-foreground mb-1">Nombre Completo</label>
                  <input type="text" value={fullName} onChange={e => setFullName(e.target.value)}
                    className="w-full px-3 py-2 text-sm bg-background border border-input rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/30" />
                </div>
                <div>
                  <label className="block text-xs font-600 text-muted-foreground mb-1">Teléfono</label>
                  <input type="tel" value={phone} onChange={e => setPhone(e.target.value)}
                    className="w-full px-3 py-2 text-sm bg-background border border-input rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/30"
                    placeholder="+51 987 654 321" />
                </div>
                <div className="flex gap-2">
                  <button onClick={() => setEditing(false)}
                    className="flex-1 flex items-center justify-center gap-1 px-3 py-2 text-xs font-500 text-muted-foreground border border-border rounded-lg hover:bg-muted transition-colors">
                    <X size={12} /> Cancelar
                  </button>
                  <button onClick={handleSave} disabled={saving}
                    className="flex-1 flex items-center justify-center gap-1 px-3 py-2 text-xs font-600 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 disabled:opacity-60 transition-all">
                    {saving ? <span className="w-3 h-3 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : <Save size={12} />}
                    {saving ? 'Guardando...' : 'Guardar'}
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* Información de contacto */}
          <div className="bg-card border border-border rounded-xl p-4 space-y-3">
            <p className="text-xs font-600 text-muted-foreground uppercase tracking-wide">Información</p>
            <div className="flex items-center gap-2.5 text-sm">
              <Mail size={14} className="text-muted-foreground shrink-0" />
              <span className="text-foreground truncate">{profile?.email || '—'}</span>
            </div>
            <div className="flex items-center gap-2.5 text-sm">
              <Phone size={14} className="text-muted-foreground shrink-0" />
              <span className="text-foreground">{profile?.phone || 'No registrado'}</span>
            </div>
            <div className="flex items-center gap-2.5 text-sm">
              <User size={14} className="text-muted-foreground shrink-0" />
              <span className="text-foreground">Miembro desde {profile?.created_at ? new Date(profile.created_at).toLocaleDateString('es-PE', { month: 'long', year: 'numeric' }) : '—'}</span>
            </div>
          </div>

          {/* Estadísticas de actividad */}
          <div className="bg-card border border-border rounded-xl p-4">
            <p className="text-xs font-600 text-muted-foreground uppercase tracking-wide mb-3">Mi Actividad</p>
            <div className="space-y-3">
              {[
                { label: 'Cotizaciones creadas', value: stats.quotesCreated, icon: <FileText size={14} />, color: 'text-violet-600' },
                { label: 'Citas gestionadas', value: stats.appointmentsManaged, icon: <CalendarDays size={14} />, color: 'text-orange-500' },
                { label: 'Clientes registrados', value: stats.clientsRegistered, icon: <Users size={14} />, color: 'text-emerald-600' },
              ].map((stat) => (
                <div key={stat.label} className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className={stat.color}>{stat.icon}</span>
                    <span className="text-xs text-muted-foreground">{stat.label}</span>
                  </div>
                  <span className="text-sm font-700 text-foreground tabular-nums">{stat.value}</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Columna derecha: permisos del rol */}
        <div className="lg:col-span-2">
          <div className="bg-card border border-border rounded-xl p-6">
            <div className="flex items-center gap-3 mb-5">
              <div className="w-10 h-10 rounded-lg bg-violet-50 flex items-center justify-center">
                <Shield size={18} className="text-violet-600" />
              </div>
              <div>
                <h3 className="text-base font-700 text-foreground">Permisos del Rol Supervisor</h3>
                <p className="text-xs text-muted-foreground">Acciones permitidas y restringidas por módulo</p>
              </div>
            </div>

            <div className="space-y-4">
              {SUPERVISOR_PERMISSIONS.map((perm) => (
                <div key={perm.module} className="border border-border rounded-xl p-4">
                  <div className="flex items-center gap-2 mb-3">
                    <span className="text-muted-foreground">{perm.icon}</span>
                    <p className="text-sm font-700 text-foreground">{perm.module}</p>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    {/* Acciones permitidas */}
                    <div>
                      <p className="text-[10px] font-600 text-green-700 uppercase tracking-wide mb-2">✓ Permitido</p>
                      <div className="space-y-1">
                        {perm.actions.map((action) => (
                          <div key={action} className="flex items-center gap-1.5">
                            <CheckCircle size={12} className="text-green-600 shrink-0" />
                            <span className="text-xs text-foreground">{action}</span>
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* Acciones denegadas */}
                    <div>
                      <p className="text-[10px] font-600 text-rose-700 uppercase tracking-wide mb-2">✗ Restringido</p>
                      <div className="space-y-1">
                        {perm.denied.map((action) => (
                          <div key={action} className="flex items-center gap-1.5">
                            <XCircle size={12} className="text-rose-500 shrink-0" />
                            <span className="text-xs text-muted-foreground">{action}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {/* Nota informativa */}
            <div className="mt-4 p-3 bg-violet-50 border border-violet-200 rounded-lg">
              <p className="text-xs text-violet-700">
                <span className="font-600">Nota:</span> Los permisos son asignados por el Administrador del sistema.
                Para solicitar acceso adicional, contacta a Carlos Alvarado (admin@cleansenso.pe).
              </p>
            </div>
          </div>
        </div>
      </div>
    </AppLayout>
  );
}
