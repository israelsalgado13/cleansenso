'use client';

/**
 * Barra de estadísticas del módulo de Cotizaciones
 * Muestra KPIs en tiempo real conectados a Supabase
 * Se actualiza automáticamente con suscripciones en tiempo real
 */

import React, { useEffect, useState } from 'react';
import { FileText, Clock, CheckCircle, TrendingUp, AlertCircle } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';

// ── Tipos de datos ─────────────────────────────────────────────────────────────

interface QuoteStats {
  totalMonth: number;
  pending: number;
  accepted: number;
  conversionRate: number;
  confirmedRevenue: number;
  expiringToday: number;
}

export default function QuoteStatsBar() {
  const supabase = createClient();
  const [stats, setStats] = useState<QuoteStats>({
    totalMonth: 0, pending: 0, accepted: 0,
    conversionRate: 0, confirmedRevenue: 0, expiringToday: 0,
  });
  const [loading, setLoading] = useState(true);

  /**
   * Carga las estadísticas de cotizaciones desde Supabase
   * Calcula métricas derivadas como tasa de conversión e ingresos
   */
  const loadStats = async () => {
    try {
      const { data: quotes } = await supabase
        .from('quotes')
        .select('status, total_soles, expires_at, created_at');

      if (!quotes) return;

      // Filtra cotizaciones del mes actual
      const now = new Date();
      const monthStart = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();
      const monthQuotes = quotes.filter(q => q.created_at >= monthStart);

      const accepted = quotes.filter(q => q.status === 'aceptada').length;
      const pending = quotes.filter(q => q.status === 'enviada').length;
      const total = quotes.length;
      const conversionRate = total > 0 ? Math.round((accepted / total) * 100 * 10) / 10 : 0;
      const confirmedRevenue = quotes
        .filter(q => q.status === 'aceptada')
        .reduce((sum, q) => sum + (Number(q.total_soles) || 0), 0);

      // Cotizaciones que vencen hoy
      const todayStr = now.toISOString().split('T')[0];
      const expiringToday = quotes.filter(q =>
        q.status === 'enviada' && q.expires_at === todayStr
      ).length;

      setStats({
        totalMonth: monthQuotes.length,
        pending,
        accepted,
        conversionRate,
        confirmedRevenue,
        expiringToday,
      });
    } catch (err) {
      console.error('Error cargando estadísticas de cotizaciones:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadStats();

    // Suscripción en tiempo real: actualiza stats al cambiar cotizaciones
    const channel = supabase
      .channel('quotes_stats')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'quotes' }, loadStats)
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, []);

  // Definición de tarjetas de estadísticas con valores dinámicos
  const statCards = [
    {
      id: 'stat-total',
      label: 'Total del Mes',
      value: loading ? '...' : String(stats.totalMonth),
      sub: 'cotizaciones emitidas',
      icon: <FileText size={20} />,
      color: 'text-primary',
      bg: 'bg-primary/10',
      trend: 'Este mes',
      trendUp: true,
    },
    {
      id: 'stat-pending',
      label: 'Pendientes de Respuesta',
      value: loading ? '...' : String(stats.pending),
      sub: 'enviadas sin respuesta',
      icon: <Clock size={20} />,
      color: 'text-amber-600',
      bg: 'bg-amber-50',
      trend: stats.expiringToday > 0 ? `${stats.expiringToday} vencen hoy` : 'Sin vencimientos hoy',
      trendUp: stats.expiringToday === 0,
      alert: stats.expiringToday > 0,
    },
    {
      id: 'stat-accepted',
      label: 'Aceptadas',
      value: loading ? '...' : String(stats.accepted),
      sub: 'confirmadas',
      icon: <CheckCircle size={20} />,
      color: 'text-green-600',
      bg: 'bg-green-50',
      trend: 'Cotizaciones confirmadas',
      trendUp: true,
    },
    {
      id: 'stat-conversion',
      label: 'Tasa de Conversión',
      value: loading ? '...' : `${stats.conversionRate}%`,
      sub: 'aceptadas / total',
      icon: <TrendingUp size={20} />,
      color: 'text-indigo-600',
      bg: 'bg-indigo-50',
      trend: stats.conversionRate >= 50 ? 'Por encima del objetivo' : 'Por debajo del objetivo',
      trendUp: stats.conversionRate >= 50,
    },
    {
      id: 'stat-revenue',
      label: 'Ingresos Confirmados',
      value: loading ? '...' : `S/ ${stats.confirmedRevenue.toLocaleString('es-PE')}`,
      sub: 'de cotizaciones aceptadas',
      icon: <TrendingUp size={20} />,
      color: 'text-emerald-600',
      bg: 'bg-emerald-50',
      trend: 'Meta: S/ 10,000',
      trendUp: stats.confirmedRevenue >= 5000,
    },
  ];

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 2xl:grid-cols-5 gap-4">
      {statCards?.map((s) => (
        <div
          key={s?.id}
          className={`bg-card border rounded-xl p-4 flex flex-col gap-3 ${
            s?.alert ? 'border-amber-200 bg-amber-50/40' : 'border-border'
          }`}
        >
          <div className="flex items-center justify-between">
            <p className="text-xs font-600 text-muted-foreground uppercase tracking-wide">
              {s?.label}
            </p>
            {s?.alert && <AlertCircle size={14} className="text-amber-500" />}
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
          <p className={`text-xs font-500 ${s?.trendUp ? 'text-green-600' : 'text-amber-600'}`}>
            {s?.trend}
          </p>
        </div>
      ))}
    </div>
  );
}