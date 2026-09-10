'use client';

/**
 * Componente principal del módulo de Citas y Agenda
 * Conectado a Supabase con CRUD completo
 * Incluye: programar cita (agrega a tabla), confirmar cita (persiste estado),
 *          editar cita, ver conflictos, vista lista y calendario
 */

import React, { useState, useEffect, useCallback } from 'react';
import {
  CalendarDays, List, Plus, ChevronLeft, ChevronRight,
  Eye, Edit2, Trash2, CheckCircle, AlertTriangle, Clock,
} from 'lucide-react';
import StatusBadge from '@/components/ui/StatusBadge';
import ConfirmModal from '@/components/ui/ConfirmModal';
import { toast } from 'sonner';
import CreateAppointmentModal from './CreateAppointmentModal';
import AppointmentDetailDrawer from './AppointmentDetailDrawer';
import WeekCalendarView from './WeekCalendarView';
import { createClient } from '@/lib/supabase/client';

// ── Tipos de datos ─────────────────────────────────────────────────────────────

export type AppointmentStatus = 'programada' | 'confirmada' | 'en_progreso' | 'completada' | 'cancelada';

export interface Appointment {
  id: string;
  code: string;
  clientName: string;
  clientCompany: string;
  serviceType: string;
  address: string;
  district: string;
  date: string;
  startTime: string;
  endTime: string;
  shift: 'mañana' | 'tarde';
  staffAssigned: string[];
  status: AppointmentStatus;
  quoteCode: string;
  serviceOrderCode?: string;
  notes?: string;
  hasConflict?: boolean;
}

/**
 * Convierte un registro de Supabase al formato Appointment del frontend
 */
function mapAppointment(row: any): Appointment {
  return {
    id: row.id,
    code: row.code,
    clientName: row.clients?.contact_name || row.clients?.name || '',
    clientCompany: row.clients?.name || '',
    serviceType: row.service_type,
    address: row.address,
    district: row.district,
    date: row.service_date ? new Date(row.service_date + 'T00:00:00').toLocaleDateString('es-PE') : '',
    startTime: row.start_time?.slice(0, 5) || '',
    endTime: row.end_time?.slice(0, 5) || '',
    shift: row.shift as 'mañana' | 'tarde',
    staffAssigned: row.appointment_staff?.map((as: any) => as.staff_members?.name).filter(Boolean) || [],
    status: row.status as AppointmentStatus,
    quoteCode: row.quotes?.code || '',
    serviceOrderCode: row.service_order_code || undefined,
    notes: row.notes || undefined,
    hasConflict: row.has_conflict || false,
  };
}

const serviceTypeColors: Record<string, string> = {
  'Limpieza de Oficinas': 'bg-blue-100 text-blue-700 border-blue-200',
  'Lavado de Alfombras': 'bg-emerald-100 text-emerald-700 border-emerald-200',
  'Desinfección Post-Obra': 'bg-rose-100 text-rose-700 border-rose-200',
  'Limpieza de Condominios': 'bg-violet-100 text-violet-700 border-violet-200',
  'Lavado de Sillones': 'bg-amber-100 text-amber-700 border-amber-200',
  'Limpieza de Pisos': 'bg-teal-100 text-teal-700 border-teal-200',
  'Limpieza de Almacenes': 'bg-orange-100 text-orange-700 border-orange-200',
};

export default function AppointmentScheduleClient() {
  const supabase = createClient();

  // Estado de la tabla
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [loading, setLoading] = useState(true);
  const [viewMode, setViewMode] = useState<'list' | 'calendar'>('list');
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [detailAppt, setDetailAppt] = useState<Appointment | null>(null);
  const [editAppt, setEditAppt] = useState<Appointment | null>(null);
  const [page, setPage] = useState(1);
  const perPage = 8;

  // Filtro de alertas/conflictos
  const [showConflictsOnly, setShowConflictsOnly] = useState(false);

  /**
   * Carga las citas desde Supabase con joins a clientes, personal y cotizaciones
   */
  const loadAppointments = useCallback(async () => {
    try {
      const { data, error } = await supabase
        .from('appointments')
        .select(`
          *,
          clients(name, contact_name),
          quotes(code),
          appointment_staff(staff_members(name))
        `)
        .order('service_date', { ascending: true });

      if (error) {
        console.error('Error cargando citas:', error.message);
        return;
      }
      setAppointments((data || []).map(mapAppointment));
    } catch (err) {
      console.error('Error inesperado:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadAppointments();

    // Suscripción en tiempo real
    const channel = supabase
      .channel('appointments_table')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'appointments' }, loadAppointments)
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [loadAppointments]);

  // Citas con conflictos para el panel de alertas
  const conflictAppts = appointments.filter((a) => a.hasConflict);

  // Filtrado según modo de visualización
  const displayedAppointments = showConflictsOnly
    ? appointments.filter(a => a.hasConflict)
    : appointments;

  const paginated = displayedAppointments.slice((page - 1) * perPage, page * perPage);
  const totalPages = Math.ceil(displayedAppointments.length / perPage);

  // ── Acciones CRUD ────────────────────────────────────────────────────────────

  /**
   * Elimina una cita de la base de datos
   */
  const handleDelete = async (id: string) => {
    setDeletingId(id);
    try {
      const { error } = await supabase.from('appointments').delete().eq('id', id);
      if (error) {
        toast.error('Error al eliminar la cita: ' + error.message);
        return;
      }
      setAppointments((prev) => prev.filter((a) => a.id !== id));
      setConfirmDelete(null);
      toast.success('Cita cancelada y eliminada de la agenda');
    } catch {
      toast.error('Error inesperado al eliminar');
    } finally {
      setDeletingId(null);
    }
  };

  /**
   * Confirma una cita — cambia el estado a "confirmada" y persiste en BD
   */
  const handleConfirm = async (id: string) => {
    try {
      const { error } = await supabase
        .from('appointments')
        .update({ status: 'confirmada' })
        .eq('id', id);

      if (error) {
        toast.error('Error al confirmar la cita: ' + error.message);
        return;
      }

      // Actualiza el estado local inmediatamente
      setAppointments((prev) =>
        prev.map((a) => a.id === id ? { ...a, status: 'confirmada' as AppointmentStatus } : a)
      );
      toast.success('Cita confirmada — el estado se ha guardado correctamente');
    } catch {
      toast.error('Error inesperado al confirmar');
    }
  };

  /**
   * Callback cuando se crea una nueva cita — recarga la lista
   */
  const handleAppointmentCreated = () => {
    loadAppointments();
    toast.success('Cita programada y agregada a la agenda');
  };

  return (
    <>
      {/* Barra de herramientas */}
      <div className="flex items-center justify-between mb-4 gap-3 flex-wrap">
        <div className="flex items-center gap-2">
          {/* Toggle vista lista/calendario */}
          <div className="flex items-center bg-muted rounded-lg p-1 gap-1">
            <button
              onClick={() => setViewMode('list')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-500 transition-all ${
                viewMode === 'list' ? 'bg-card text-foreground shadow-sm' : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              <List size={13} /> Lista
            </button>
            <button
              onClick={() => setViewMode('calendar')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-500 transition-all ${
                viewMode === 'calendar' ? 'bg-card text-foreground shadow-sm' : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              <CalendarDays size={13} /> Calendario
            </button>
          </div>

          {/* Filtro de conflictos */}
          {conflictAppts.length > 0 && (
            <button
              onClick={() => setShowConflictsOnly(!showConflictsOnly)}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-600 border transition-all ${
                showConflictsOnly
                  ? 'bg-rose-600 text-white border-rose-600' :'bg-rose-50 text-rose-700 border-rose-200 hover:bg-rose-100'
              }`}
            >
              <AlertTriangle size={13} />
              {conflictAppts.length} conflicto(s)
            </button>
          )}
        </div>

        {/* Botón programar cita */}
        <button
          onClick={() => setShowCreateModal(true)}
          className="flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground text-sm font-600 rounded-lg hover:bg-primary/90 transition-all active:scale-95"
        >
          <Plus size={16} />
          Programar Cita
        </button>
      </div>

      {/* Vista de calendario */}
      {viewMode === 'calendar' && (
        <WeekCalendarView appointments={appointments} />
      )}

      {/* Vista de lista */}
      {viewMode === 'list' && (
        <div className="bg-card border border-border rounded-xl overflow-hidden">
          {loading && (
            <div className="flex items-center justify-center py-12">
              <span className="w-6 h-6 border-2 border-primary/30 border-t-primary rounded-full animate-spin" />
              <span className="ml-3 text-sm text-muted-foreground">Cargando citas...</span>
            </div>
          )}

          {!loading && (
            <div className="divide-y divide-border">
              {paginated.length === 0 && (
                <div className="flex flex-col items-center justify-center py-12 text-center">
                  <CalendarDays size={32} className="text-muted-foreground mb-3" />
                  <p className="text-sm font-600 text-foreground">No hay citas programadas</p>
                  <p className="text-xs text-muted-foreground mt-1">
                    {showConflictsOnly ? 'No hay conflictos de agenda' : 'Programa la primera cita del día'}
                  </p>
                </div>
              )}

              {paginated.map((appt) => (
                <div key={appt.id}
                  className={`p-4 hover:bg-muted/30 transition-colors ${appt.hasConflict ? 'bg-rose-50/30 border-l-2 border-l-rose-400' : ''}`}>
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        {/* Código de cita */}
                        <button
                          onClick={() => setDetailAppt(appt)}
                          className="text-sm font-700 text-primary hover:underline tabular-nums"
                        >
                          {appt.code}
                        </button>

                        {/* Badge de tipo de servicio */}
                        <span className={`text-[10px] font-600 px-2 py-0.5 rounded-full border ${
                          serviceTypeColors[appt.serviceType] || 'bg-muted text-muted-foreground border-border'
                        }`}>
                          {appt.serviceType}
                        </span>

                        {/* Indicador de conflicto */}
                        {appt.hasConflict && (
                          <span className="flex items-center gap-1 text-[10px] font-600 text-rose-700 bg-rose-100 border border-rose-200 px-2 py-0.5 rounded-full">
                            <AlertTriangle size={10} /> Conflicto
                          </span>
                        )}
                      </div>

                      {/* Información del cliente */}
                      <p className="text-sm font-600 text-foreground mt-1 truncate">{appt.clientCompany}</p>
                      <p className="text-xs text-muted-foreground">{appt.clientName}</p>

                      {/* Detalles de fecha, hora y ubicación */}
                      <div className="flex items-center gap-3 mt-2 flex-wrap">
                        <span className="flex items-center gap-1 text-xs text-muted-foreground">
                          <CalendarDays size={11} /> {appt.date}
                        </span>
                        <span className="flex items-center gap-1 text-xs text-muted-foreground">
                          <Clock size={11} /> {appt.startTime} – {appt.endTime}
                        </span>
                        <span className="text-xs text-muted-foreground">{appt.district}</span>
                      </div>

                      {/* Personal asignado */}
                      {appt.staffAssigned.length > 0 && (
                        <div className="flex items-center gap-1 mt-1.5 flex-wrap">
                          {appt.staffAssigned.slice(0, 3).map((s, i) => (
                            <span key={i} className="text-[10px] bg-muted text-muted-foreground px-1.5 py-0.5 rounded-full">
                              {s}
                            </span>
                          ))}
                          {appt.staffAssigned.length > 3 && (
                            <span className="text-[10px] text-muted-foreground">+{appt.staffAssigned.length - 3} más</span>
                          )}
                        </div>
                      )}
                    </div>

                    {/* Estado y acciones */}
                    <div className="flex flex-col items-end gap-2 shrink-0">
                      <StatusBadge status={appt.status} size="sm" />

                      <div className="flex items-center gap-1">
                        {/* Ver detalle */}
                        <button onClick={() => setDetailAppt(appt)} title="Ver detalle"
                          className="w-7 h-7 rounded-md flex items-center justify-center text-muted-foreground hover:text-primary hover:bg-primary/10 transition-colors">
                          <Eye size={14} />
                        </button>

                        {/* Editar cita */}
                        <button onClick={() => { setEditAppt(appt); setShowCreateModal(true); }} title="Editar cita"
                          className="w-7 h-7 rounded-md flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-muted transition-colors">
                          <Edit2 size={14} />
                        </button>

                        {/* Confirmar cita — cambia estado y persiste */}
                        {appt.status === 'programada' && (
                          <button onClick={() => handleConfirm(appt.id)} title="Confirmar cita — cambia estado a confirmada"
                            className="w-7 h-7 rounded-md flex items-center justify-center text-muted-foreground hover:text-green-600 hover:bg-green-50 transition-colors">
                            <CheckCircle size={14} />
                          </button>
                        )}

                        {/* Ver conflicto */}
                        {appt.hasConflict && (
                          <button
                            onClick={() => {
                              setDetailAppt(appt);
                              toast.warning(`Conflicto en ${appt.code}: solapamiento de personal o horario detectado`);
                            }}
                            title="Ver conflicto de agenda"
                            className="w-7 h-7 rounded-md flex items-center justify-center text-rose-600 hover:bg-rose-50 transition-colors"
                          >
                            <AlertTriangle size={14} />
                          </button>
                        )}

                        {/* Eliminar cita */}
                        <button onClick={() => setConfirmDelete(appt.id)} title="Cancelar y eliminar cita"
                          className="w-7 h-7 rounded-md flex items-center justify-center text-muted-foreground hover:text-rose-600 hover:bg-rose-50 transition-colors">
                          <Trash2 size={14} />
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Paginación */}
          {!loading && displayedAppointments.length > perPage && (
            <div className="flex items-center justify-between px-4 py-3 border-t border-border bg-muted/20">
              <p className="text-sm text-muted-foreground tabular-nums">
                {displayedAppointments.length} citas {showConflictsOnly ? 'con conflicto' : 'en total'}
              </p>
              <div className="flex items-center gap-1">
                <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1}
                  className="w-8 h-8 rounded-md flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-muted disabled:opacity-40 transition-colors">
                  <ChevronLeft size={16} />
                </button>
                {Array.from({ length: Math.min(totalPages, 5) }, (_, i) => i + 1).map((p) => (
                  <button key={p} onClick={() => setPage(p)}
                    className={`w-8 h-8 rounded-md text-sm font-500 transition-colors tabular-nums ${
                      page === p ? 'bg-primary text-primary-foreground' : 'text-muted-foreground hover:bg-muted hover:text-foreground'
                    }`}>{p}</button>
                ))}
                <button onClick={() => setPage(p => Math.min(totalPages, p + 1))} disabled={page === totalPages || totalPages === 0}
                  className="w-8 h-8 rounded-md flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-muted disabled:opacity-40 transition-colors">
                  <ChevronRight size={16} />
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Modales y paneles */}
      <ConfirmModal
        open={!!confirmDelete}
        onClose={() => setConfirmDelete(null)}
        onConfirm={() => confirmDelete && handleDelete(confirmDelete)}
        title="¿Cancelar esta cita?"
        description="Se eliminará la cita de la agenda. Esta acción no se puede deshacer."
        confirmLabel="Sí, cancelar cita"
        loading={!!deletingId}
      />

      {detailAppt && (
        <AppointmentDetailDrawer
          appointment={detailAppt}
          onClose={() => setDetailAppt(null)}
          serviceTypeColors={serviceTypeColors}
          onEdit={(appt) => {
            setDetailAppt(null);
            setEditAppt(appt);
            setShowCreateModal(true);
          }}
        />
      )}

      <CreateAppointmentModal
        open={showCreateModal}
        onClose={() => { setShowCreateModal(false); setEditAppt(null); }}
        editAppointment={editAppt}
        onCreated={handleAppointmentCreated}
      />
    </>
  );
}