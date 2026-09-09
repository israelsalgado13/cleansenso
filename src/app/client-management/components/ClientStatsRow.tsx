'use client';

/**
 * Barra de estadísticas del módulo de Clientes
 * Muestra KPIs en tiempo real conectados a Supabase
 */

import React, { useEffect, useState } from 'react';
import { Users, UserCheck, UserPlus, Building2, AlertTriangle } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';

interface ClientStats {
  total: number;
  active: number;
  prospects: number;
  companies: number;
  naturalPersons: number;
  newThisMonth: number;
}

export default function ClientStatsRow() {
  const supabase = createClient();
  const [stats, setStats] = useState<ClientStats>({
    total: 0, active: 0, prospects: 0, companies: 0, naturalPersons: 0, newThisMonth: 0,
  });
  const [loading, setLoading] = useState(true);

  /**
   * Carga estadísticas de clientes desde Supabase en tiempo real
   */
  const loadStats = async () => {
    try {
      const { data: clients } = await supabase
        .from('clients')
        .select('status, client_type, created_at');

      if (!clients) return;

      const now = new Date();
      const monthStart = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();

      setStats({
        total: clients.length,
        active: clients.filter(c => c.status === 'activo').length,
        prospects: clients.filter(c => c.status === 'prospecto').length,
        companies: clients.filter(c => c.client_type === 'empresa').length,
        naturalPersons: clients.filter(c => c.client_type === 'persona_natural').length,
        newThisMonth: clients.filter(c => c.created_at >= monthStart).length,
      });
    } catch (err) {
      console.error('Error cargando estadísticas de clientes:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadStats();

    // Suscripción en tiempo real para actualizar al cambiar clientes
    const channel = supabase
      .channel('clients_stats')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'clients' }, loadStats)
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, []);

  const statCards = [
    {
      id: 'cstat-total',
      label: 'Total Clientes',
      value: loading ? '...' : String(stats.total),
      sub: 'registrados en el sistema',
      icon: <Users size={20} />,
      color: 'text-primary',
      bg: 'bg-primary/10',
      note: `+${stats.newThisMonth} este mes`,
      noteUp: true,
    },
    {
      id: 'cstat-active',
      label: 'Clientes Activos',
      value: loading ? '...' : String(stats.active),
      sub: 'con servicio vigente',
      icon: <UserCheck size={20} />,
      color: 'text-green-600',
      bg: 'bg-green-50',
      note: stats.total > 0 ? `${Math.round((stats.active / stats.total) * 100)}% del total` : '0%',
      noteUp: true,
    },
    {
      id: 'cstat-prospects',
      label: 'Prospectos',
      value: loading ? '...' : String(stats.prospects),
      sub: 'sin cotización activa',
      icon: <UserPlus size={20} />,
      color: 'text-violet-600',
      bg: 'bg-violet-50',
      note: stats.prospects > 0 ? 'Requieren seguimiento' : 'Sin prospectos pendientes',
      noteUp: stats.prospects === 0,
      alert: stats.prospects > 3,
    },
    {
      id: 'cstat-empresas',
      label: 'Empresas',
      value: loading ? '...' : String(stats.companies),
      sub: 'personas jurídicas',
      icon: <Building2 size={20} />,
      color: 'text-indigo-600',
      bg: 'bg-indigo-50',
      note: `vs ${stats.naturalPersons} personas naturales`,
      noteUp: true,
    },
  ];

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 2xl:grid-cols-4 gap-4">
      {statCards?.map((s) => (
        <div
          key={s?.id}
          className={`bg-card border rounded-xl p-4 flex flex-col gap-3 ${
            s?.alert ? 'border-amber-200' : 'border-border'
          }`}
        >
          <div className="flex items-center justify-between">
            <p className="text-xs font-600 text-muted-foreground uppercase tracking-wide">
              {s?.label}
            </p>
            {s?.alert && <AlertTriangle size={14} className="text-amber-500" />}
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
          <p className={`text-xs font-500 ${s?.noteUp ? 'text-green-600' : 'text-amber-600'}`}>
            {s?.note}
          </p>
        </div>
      ))}
    </div>
  );
}