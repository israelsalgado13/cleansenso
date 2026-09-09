'use client';

/**
 * Dashboard principal de CleanSenso
 * Pantalla de inicio al ingresar al sistema — muestra KPIs en tiempo real,
 * actividad reciente y accesos rápidos a los módulos principales
 */

import React, { useEffect, useState } from 'react';
import AppLayout from '@/components/AppLayout';
import { createClient } from '@/lib/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import Link from 'next/link';
import { FileText, Users, CalendarDays, Wrench, TrendingUp, TrendingDown, Clock, AlertTriangle, ArrowRight, DollarSign,  } from 'lucide-react';

// ── Tipos de datos para el dashboard ──────────────────────────────────────────

interface DashboardStats {
  totalQuotes: number;
  acceptedQuotes: number;
  pendingQuotes: number;
  totalClients: number;
  activeClients: number;
  todayAppointments: number;
  pendingAppointments: number;
  conflictAppointments: number;
  monthRevenue: number;
  conversionRate: number;
}

interface RecentActivity {
  id: string;
  type: 'quote' | 'client' | 'appointment';
  title: string;
  subtitle: string;
  time: string;
  status?: string;
}

// ── Componente de tarjeta KPI ──────────────────────────────────────────────────

interface KpiCardProps {
  label: string;
  value: string | number;
  sub: string;
  icon: React.ReactNode;
  iconBg: string;
  iconColor: string;
  trend?: string;
  trendUp?: boolean;
  alert?: boolean;
  href?: string;
}

function KpiCard({ label, value, sub, icon, iconBg, iconColor, trend, trendUp, alert, href }: KpiCardProps) {
  const content = (
    <div className={`bg-card border rounded-xl p-5 flex flex-col gap-3 transition-all hover:shadow-sm ${alert ? 'border-amber-200 bg-amber-50/30' : 'border-border'} ${href ? 'cursor-pointer hover:border-primary/30' : ''}`}>
      <div className="flex items-start justify-between">
        <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${iconBg} ${iconColor}`}>
          {icon}
        </div>
        {alert && <AlertTriangle size={14} className="text-amber-500" />}
      </div>
      <div>
        <p className="text-2xl font-800 text-foreground tabular-nums">{value}</p>
        <p className="text-xs font-600 text-muted-foreground uppercase tracking-wide mt-0.5">{label}</p>
        <p className="text-xs text-muted-foreground mt-0.5">{sub}</p>
      </div>
      {trend && (
        <div className="flex items-center gap-1">
          {trendUp ? <TrendingUp size={12} className="text-green-600" /> : <TrendingDown size={12} className="text-amber-600" />}
          <span className={`text-xs font-500 ${trendUp ? 'text-green-600' : 'text-amber-600'}`}>{trend}</span>
        </div>
      )}
    </div>
  );
  if (href) return <Link href={href}>{content}</Link>;
  return content;
}

// ── Componente de acceso rápido ────────────────────────────────────────────────

function QuickAccessCard({ href, icon, label, description, color }: {
  href: string; icon: React.ReactNode; label: string; description: string; color: string;
}) {
  return (
    <Link href={href} className={`flex items-center gap-4 p-4 bg-card border border-border rounded-xl hover:border-primary/30 hover:shadow-sm transition-all group`}>
      <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${color}`}>
        {icon}
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-600 text-foreground">{label}</p>
        <p className="text-xs text-muted-foreground truncate">{description}</p>
      </div>
      <ArrowRight size={16} className="text-muted-foreground group-hover:text-primary transition-colors shrink-0" />
    </Link>
  );
}

// ── Página principal del Dashboard ────────────────────────────────────────────

export default function DashboardPage() {
  const { profile } = useAuth();
  const supabase = createClient();

  // Estado de estadísticas y actividad reciente
  const [stats, setStats] = useState<DashboardStats>({
    totalQuotes: 0, acceptedQuotes: 0, pendingQuotes: 0,
    totalClients: 0, activeClients: 0,
    todayAppointments: 0, pendingAppointments: 0, conflictAppointments: 0,
    monthRevenue: 0, conversionRate: 0,
  });
  const [recentActivity, setRecentActivity] = useState<RecentActivity[]>([]);
  const [loadingStats, setLoadingStats] = useState(true);

  /**
   * Carga todas las estadísticas del dashboard desde Supabase
   * Se ejecuta al montar el componente y se actualiza en tiempo real
   */
  const loadStats = async () => {
    try {
      // Consultas paralelas para mejor rendimiento
      const [quotesRes, clientsRes, appointmentsRes] = await Promise.all([
        supabase.from('quotes').select('status, total_soles, created_at'),
        supabase.from('clients').select('status'),
        supabase.from('appointments').select('status, service_date, has_conflict'),
      ]);

      const quotes = quotesRes.data || [];
      const clients = clientsRes.data || [];
      const appointments = appointmentsRes.data || [];

      // Calcula estadísticas de cotizaciones
      const accepted = quotes.filter(q => q.status === 'aceptada').length;
      const pending = quotes.filter(q => q.status === 'enviada').length;
      const monthRevenue = quotes
        .filter(q => q.status === 'aceptada')
        .reduce((sum, q) => sum + (q.total_soles || 0), 0);
      const conversionRate = quotes.length > 0 ? Math.round((accepted / quotes.length) * 100) : 0;

      // Calcula estadísticas de citas
      const today = new Date().toISOString().split('T')[0];
      const todayApts = appointments.filter(a => a.service_date === today).length;
      const pendingApts = appointments.filter(a => a.status === 'programada').length;
      const conflictApts = appointments.filter(a => a.has_conflict).length;

      setStats({
        totalQuotes: quotes.length,
        acceptedQuotes: accepted,
        pendingQuotes: pending,
        totalClients: clients.length,
        activeClients: clients.filter(c => c.status === 'activo').length,
        todayAppointments: todayApts,
        pendingAppointments: pendingApts,
        conflictAppointments: conflictApts,
        monthRevenue,
        conversionRate,
      });

      // Carga actividad reciente (últimas cotizaciones y citas)
      const [recentQuotes, recentApts] = await Promise.all([
        supabase.from('quotes').select('id, code, status, created_at, clients(name)').order('created_at', { ascending: false }).limit(3),
        supabase.from('appointments').select('id, code, status, service_date, clients(name)').order('created_at', { ascending: false }).limit(3),
      ]);

      const activity: RecentActivity[] = [
        ...(recentQuotes.data || []).map((q: any) => ({
          id: q.id, type: 'quote' as const,
          title: q.code,
          subtitle: q.clients?.name || 'Cliente',
          time: new Date(q.created_at).toLocaleDateString('es-PE'),
          status: q.status,
        })),
        ...(recentApts.data || []).map((a: any) => ({
          id: a.id, type: 'appointment' as const,
          title: a.code,
          subtitle: a.clients?.name || 'Cliente',
          time: a.service_date,
          status: a.status,
        })),
      ].slice(0, 5);

      setRecentActivity(activity);
    } catch (err) {
      console.error('Error cargando estadísticas del dashboard:', err);
    } finally {
      setLoadingStats(false);
    }
  };

  useEffect(() => {
    loadStats();

    // Suscripción en tiempo real para actualizar stats automáticamente
    const channel = supabase
      .channel('dashboard_realtime')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'quotes' }, loadStats)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'clients' }, loadStats)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'appointments' }, loadStats)
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, []);

  // Saludo personalizado según la hora del día — calculado en el cliente para evitar hydration mismatch
  const [greeting, setGreeting] = useState('');
  const [todayLabel, setTodayLabel] = useState('');

  useEffect(() => {
    const hour = new Date().getHours();
    if (hour < 12) setGreeting('Buenos días');
    else if (hour < 18) setGreeting('Buenas tardes');
    else setGreeting('Buenas noches');

    setTodayLabel(new Date().toLocaleDateString('es-PE', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' }));
  }, []);

  const userName = profile?.full_name?.split(' ')[0] || 'Usuario';
  const roleLabel = profile?.role === 'admin' ? 'Administrador' : profile?.role === 'supervisor' ? 'Supervisor' : 'Cliente';

  return (
    <AppLayout
      title="Dashboard"
      subtitle={greeting ? `— ${greeting}, ${userName}` : undefined}
    >
      {/* Bienvenida con rol del usuario */}
      <div className="bg-gradient-to-r from-primary/10 to-primary/5 border border-primary/20 rounded-xl p-5 mb-6 flex items-center justify-between">
        <div>
          <p className="text-sm font-600 text-primary">{greeting}, {userName}</p>
          <p className="text-xs text-muted-foreground mt-0.5">
            Accediste como <span className="font-600 text-foreground">{roleLabel}</span>{todayLabel ? ` — ${todayLabel}` : ''}
          </p>
        </div>
        <div className="w-12 h-12 rounded-full bg-primary/20 flex items-center justify-center">
          <span className="text-lg font-800 text-primary">{userName.charAt(0)}</span>
        </div>
      </div>

      {/* KPIs principales — actualizados en tiempo real */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <KpiCard
          label="Ingresos Confirmados"
          value={loadingStats ? '...' : `S/ ${stats.monthRevenue.toLocaleString('es-PE')}`}
          sub="de cotizaciones aceptadas"
          icon={<DollarSign size={18} />}
          iconBg="bg-primary/10"
          iconColor="text-primary"
          trend={`${stats.conversionRate}% tasa de conversión`}
          trendUp={stats.conversionRate >= 50}
          href="/"
        />
        <KpiCard
          label="Cotizaciones"
          value={loadingStats ? '...' : stats.totalQuotes}
          sub={`${stats.acceptedQuotes} aceptadas · ${stats.pendingQuotes} pendientes`}
          icon={<FileText size={18} />}
          iconBg="bg-violet-50"
          iconColor="text-violet-600"
          trend={`${stats.pendingQuotes} esperando respuesta`}
          trendUp={stats.pendingQuotes === 0}
          href="/"
        />
        <KpiCard
          label="Clientes Activos"
          value={loadingStats ? '...' : stats.activeClients}
          sub={`de ${stats.totalClients} registrados`}
          icon={<Users size={18} />}
          iconBg="bg-emerald-50"
          iconColor="text-emerald-600"
          trend="Ver todos los clientes"
          trendUp={true}
          href="/client-management"
        />
        <KpiCard
          label="Citas Pendientes"
          value={loadingStats ? '...' : stats.pendingAppointments}
          sub={`${stats.todayAppointments} programadas hoy`}
          icon={<CalendarDays size={18} />}
          iconBg="bg-orange-50"
          iconColor="text-orange-500"
          trend={stats.conflictAppointments > 0 ? `${stats.conflictAppointments} conflicto(s) detectado(s)` : 'Sin conflictos'}
          trendUp={stats.conflictAppointments === 0}
          alert={stats.conflictAppointments > 0}
          href="/appointments-schedule-management"
        />
      </div>

      {/* Contenido principal: actividad reciente + accesos rápidos */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

        {/* Actividad reciente */}
        <div className="lg:col-span-2 bg-card border border-border rounded-xl p-5">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-700 text-foreground">Actividad Reciente</h3>
            <span className="text-xs text-muted-foreground">Últimas operaciones</span>
          </div>
          {loadingStats ? (
            <div className="space-y-3">
              {[1,2,3].map(i => (
                <div key={i} className="h-12 bg-muted/50 rounded-lg animate-pulse" />
              ))}
            </div>
          ) : recentActivity.length === 0 ? (
            <div className="text-center py-8">
              <Clock size={24} className="text-muted-foreground mx-auto mb-2" />
              <p className="text-sm text-muted-foreground">No hay actividad reciente</p>
            </div>
          ) : (
            <div className="space-y-2">
              {recentActivity.map((item) => (
                <div key={item.id} className="flex items-center gap-3 p-3 rounded-lg hover:bg-muted/40 transition-colors">
                  <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${
                    item.type === 'quote' ? 'bg-violet-50 text-violet-600' :
                    item.type === 'appointment'? 'bg-orange-50 text-orange-500' : 'bg-emerald-50 text-emerald-600'
                  }`}>
                    {item.type === 'quote' ? <FileText size={14} /> :
                     item.type === 'appointment' ? <CalendarDays size={14} /> :
                     <Users size={14} />}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-600 text-foreground">{item.title}</p>
                    <p className="text-xs text-muted-foreground truncate">{item.subtitle}</p>
                  </div>
                  <div className="text-right shrink-0">
                    <p className="text-xs text-muted-foreground">{item.time}</p>
                    {item.status && (
                      <span className={`text-[10px] font-600 px-1.5 py-0.5 rounded-full ${
                        item.status === 'aceptada' || item.status === 'confirmada' ? 'bg-green-50 text-green-700' :
                        item.status === 'enviada' || item.status === 'programada' ? 'bg-blue-50 text-blue-700' :
                        item.status === 'rechazada'|| item.status === 'cancelada' ? 'bg-rose-50 text-rose-700' : 'bg-muted text-muted-foreground'
                      }`}>
                        {item.status}
                      </span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Accesos rápidos a módulos */}
        <div className="space-y-3">
          <h3 className="text-sm font-700 text-foreground mb-4">Accesos Rápidos</h3>
          <QuickAccessCard
            href="/"
            icon={<FileText size={18} />}
            label="Cotizaciones"
            description="Gestionar presupuestos"
            color="bg-violet-50 text-violet-600"
          />
          <QuickAccessCard
            href="/client-management"
            icon={<Users size={18} />}
            label="Clientes"
            description="Registro y seguimiento"
            color="bg-emerald-50 text-emerald-600"
          />
          <QuickAccessCard
            href="/appointments-schedule-management"
            icon={<CalendarDays size={18} />}
            label="Citas y Agenda"
            description="Programar servicios"
            color="bg-orange-50 text-orange-500"
          />
          <QuickAccessCard
            href="/services"
            icon={<Wrench size={18} />}
            label="Servicios"
            description="Catálogo de servicios"
            color="bg-teal-50 text-teal-600"
          />
          {/* Alerta de conflictos si existen */}
          {stats.conflictAppointments > 0 && (
            <Link href="/appointments-schedule-management" className="flex items-center gap-3 p-4 bg-amber-50 border border-amber-200 rounded-xl hover:bg-amber-100 transition-colors">
              <AlertTriangle size={18} className="text-amber-600 shrink-0" />
              <div>
                <p className="text-sm font-600 text-amber-800">{stats.conflictAppointments} conflicto(s) de agenda</p>
                <p className="text-xs text-amber-700">Requiere atención inmediata</p>
              </div>
            </Link>
          )}
        </div>
      </div>
    </AppLayout>
  );
}
