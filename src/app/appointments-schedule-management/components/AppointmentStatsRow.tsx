'use client';

/**
 * Barra de estadísticas del módulo de Citas y Agenda
 * Muestra KPIs en tiempo real conectados a Supabase
 */

import React, { useEffect, useState } from 'react';
import { CalendarDays, Clock, CheckCircle2, AlertTriangle, Users } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';

interface AppointmentStats {
  todayCount: number;
  weekCount: number;
  conflicts: number;
  completedMonth: number;
  staffToday: number;
  unconfirmed: number;
}

export default function AppointmentStatsRow() {
  const supabase = createClient();
  const [stats, setStats] = useState<AppointmentStats>({
    todayCount: 0, weekCount: 0, conflicts: 0,
    completedMonth: 0, staffToday: 0, unconfirmed: 0,
  });
  const [loading, setLoading] = useState(true);

  /**
   * Carga estadísticas de citas desde Supabase en tiempo real
   */
  const loadStats = async () => {
    try {
      const { data: appointments } = await supabase
        .from('appointments')
        .select('status, service_date, has_conflict, created_at');

      if (!appointments) return;

      const now = new Date();
      const todayStr = now.toISOString().split('T')[0];

      // Inicio y fin de la semana actual
      const weekStart = new Date(now);
      weekStart.setDate(now.getDate() - now.getDay());
      const weekEnd = new Date(weekStart);
      weekEnd.setDate(weekStart.getDate() + 6);

      // Inicio del mes actual
      const monthStart = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().split('T')[0];

      const todayApts = appointments.filter(a => a.service_date === todayStr);
      const weekApts = appointments.filter(a =>
        a.service_date >= weekStart.toISOString().split('T')[0] &&
        a.service_date <= weekEnd.toISOString().split('T')[0]
      );

      setStats({
        todayCount: todayApts.length,
        weekCount: weekApts.length,
        conflicts: appointments.filter(a => a.has_conflict).length,
        completedMonth: appointments.filter(a => a.status === 'completada' && a.service_date >= monthStart).length,
        staffToday: todayApts.reduce((sum, a) => sum + 1, 0), // Simplificado
        unconfirmed: weekApts.filter(a => a.status === 'programada').length,
      });
    } catch (err) {
      console.error('Error cargando estadísticas de citas:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadStats();

    // Suscripción en tiempo real para actualizar al cambiar citas
    const channel = supabase
      .channel('appointments_stats')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'appointments' }, loadStats)
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, []);

  const today = new Date().toLocaleDateString('es-PE', { day: '2-digit', month: 'long', year: 'numeric' });

  const statCards = [
    {
      id: 'astat-today',
      label: 'Citas Hoy',
      value: loading ? '...' : String(stats.todayCount),
      sub: today,
      icon: <CalendarDays size={20} />,
      color: 'text-primary',
      bg: 'bg-primary/10',
      note: stats.todayCount > 0 ? `${stats.todayCount} programadas para hoy` : 'Sin citas hoy',
      noteColor: 'text-primary',
    },
    {
      id: 'astat-week',
      label: 'Esta Semana',
      value: loading ? '...' : String(stats.weekCount),
      sub: 'citas programadas',
      icon: <Clock size={20} />,
      color: 'text-indigo-600',
      bg: 'bg-indigo-50',
      note: stats.unconfirmed > 0 ? `${stats.unconfirmed} sin confirmar` : 'Todas confirmadas',
      noteColor: stats.unconfirmed > 0 ? 'text-amber-600' : 'text-green-600',
    },
    {
      id: 'astat-conflict',
      label: 'Conflictos Detectados',
      value: loading ? '...' : String(stats.conflicts),
      sub: 'solapamiento de horario',
      icon: <AlertTriangle size={20} />,
      color: 'text-rose-600',
      bg: 'bg-rose-50',
      note: stats.conflicts > 0 ? 'Requiere atención inmediata' : 'Sin conflictos',
      noteColor: stats.conflicts > 0 ? 'text-rose-600' : 'text-green-600',
      alert: stats.conflicts > 0,
    },
    {
      id: 'astat-completed',
      label: 'Completadas este mes',
      value: loading ? '...' : String(stats.completedMonth),
      sub: 'órdenes de servicio cerradas',
      icon: <CheckCircle2 size={20} />,
      color: 'text-green-600',
      bg: 'bg-green-50',
      note: 'Servicios finalizados',
      noteColor: 'text-green-600',
    },
    {
      id: 'astat-staff',
      label: 'Citas Activas',
      value: loading ? '...' : String(stats.weekCount - stats.completedMonth),
      sub: 'en curso o programadas',
      icon: <Users size={20} />,
      color: 'text-teal-600',
      bg: 'bg-teal-50',
      note: 'Esta semana',
      noteColor: 'text-teal-600',
    },
  ];

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 2xl:grid-cols-5 gap-4">
      {statCards?.map((s) => (
        <div
          key={s?.id}
          className={`bg-card border rounded-xl p-4 flex flex-col gap-3 ${
            s?.alert ? 'border-rose-200 bg-rose-50/30' : 'border-border'
          }`}
        >
          <div className="flex items-center justify-between">
            <p className="text-xs font-600 text-muted-foreground uppercase tracking-wide">
              {s?.label}
            </p>
            {s?.alert && <AlertTriangle size={14} className="text-rose-500" />}
          </div>
          <div className="flex items-end gap-3">
            <div className={`w-10 h-10 rounded-lg ${s?.bg} ${s?.color} flex items-center justify-center shrink-0`}>
              {s?.icon}
            </div>
            <div>
              <p className={`text-2xl font-800 tabular-nums ${s?.color}`}>{s?.value}</p>
              <p className="text-xs text-muted-foreground">{s?.sub}</p>
            </div>
          </div>
          <p className={`text-xs font-500 ${s?.noteColor}`}>{s?.note}</p>
        </div>
      ))}
    </div>
  );
}