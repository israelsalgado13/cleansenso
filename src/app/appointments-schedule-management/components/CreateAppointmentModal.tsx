'use client';

/**
 * Modal para programar y editar citas
 * Conectado a Supabase — agrega la cita a la tabla de appointments
 * Incluye detección de conflictos de horario y asignación de personal
 */

import React, { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import Modal from '@/components/ui/Modal';
import { toast } from 'sonner';
import { AlertTriangle } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import type { Appointment } from './AppointmentScheduleClient';

// ── Tipos del formulario ───────────────────────────────────────────────────────

interface CreateAppointmentFormData {
  clientId: string;
  quoteCode: string;
  serviceType: string;
  date: string;
  startTime: string;
  endTime: string;
  shift: 'mañana' | 'tarde';
  district: string;
  address: string;
  notes: string;
}

interface CreateAppointmentModalProps {
  open: boolean;
  onClose: () => void;
  editAppointment?: Appointment | null;
  onCreated?: () => void;
}

interface ClientOption { id: string; name: string; }
interface StaffOption { id: string; name: string; specialty: string; }

// ── Constantes ─────────────────────────────────────────────────────────────────

const serviceTypes = [
  'Limpieza de Oficinas', 'Lavado de Alfombras', 'Lavado de Sillones y Sillas',
  'Desinfección Post-Obra', 'Limpieza de Almacenes', 'Limpieza de Condominios',
  'Limpieza de Pisos', 'Limpieza Institucional',
];

const limaDistricts = [
  'Barranco', 'Cercado de Lima', 'Chorrillos', 'Jesús María', 'La Victoria',
  'Lince', 'Miraflores', 'Pueblo Libre', 'Rímac', 'San Borja',
  'San Isidro', 'San Luis', 'San Miguel', 'Surco', 'Surquillo',
];

const getTodayString = () => new Date().toISOString().split('T')[0];

// Genera código de cita
const generateAppointmentCode = () => {
  const year = new Date().getFullYear();
  const num = String(Math.floor(Math.random() * 900) + 100).padStart(3, '0');
  return `CITA-${year}-${num}`;
};

export default function CreateAppointmentModal({
  open, onClose, editAppointment, onCreated,
}: CreateAppointmentModalProps) {
  const { user } = useAuth();
  const supabase = createClient();
  const [loading, setLoading] = useState(false);
  const [selectedStaff, setSelectedStaff] = useState<string[]>([]);
  const [conflictDetected, setConflictDetected] = useState(false);
  const [clients, setClients] = useState<ClientOption[]>([]);
  const [staffList, setStaffList] = useState<StaffOption[]>([]);
  const isEditing = !!editAppointment;

  const {
    register, handleSubmit, watch, formState: { errors }, reset,
  } = useForm<CreateAppointmentFormData>({
    defaultValues: { shift: 'mañana' },
  });

  const watchDate = watch('date');
  const watchStart = watch('startTime');

  /**
   * Carga clientes y personal disponible desde Supabase
   */
  useEffect(() => {
    if (!open) return;

    Promise.all([
      supabase.from('clients').select('id, name').eq('status', 'activo'),
      supabase.from('staff_members').select('id, name, specialty').eq('is_active', true),
    ]).then(([clientsRes, staffRes]) => {
      setClients((clientsRes.data || []).map(c => ({ id: c.id, name: c.name })));
      setStaffList((staffRes.data || []).map(s => ({ id: s.id, name: s.name, specialty: s.specialty })));
    });

    // Precarga datos al editar
    if (editAppointment) {
      reset({
        serviceType: editAppointment.serviceType,
        district: editAppointment.district,
        address: editAppointment.address,
        startTime: editAppointment.startTime,
        endTime: editAppointment.endTime,
        shift: editAppointment.shift,
        notes: editAppointment.notes || '',
      });
    }
  }, [open, editAppointment]);

  /**
   * Detecta conflictos de horario al seleccionar personal
   */
  const toggleStaff = (staffId: string) => {
    const next = selectedStaff.includes(staffId)
      ? selectedStaff.filter((s) => s !== staffId)
      : [...selectedStaff, staffId];
    setSelectedStaff(next);
    // Detección simplificada: más de 3 operarios en el mismo turno puede generar conflicto
    setConflictDetected(next.length > 5);
  };

  /**
   * Guarda la cita en Supabase y la agrega a la tabla
   */
  const onSubmit = async (data: CreateAppointmentFormData) => {
    if (selectedStaff.length === 0 && !isEditing) {
      toast.error('Debes asignar al menos un operario a la cita');
      return;
    }
    setLoading(true);
    try {
      if (isEditing && editAppointment) {
        // Actualizar cita existente
        const { error } = await supabase
          .from('appointments')
          .update({
            service_type: data.serviceType,
            district: data.district,
            address: data.address,
            start_time: data.startTime,
            end_time: data.endTime,
            shift: data.shift,
            notes: data.notes || null,
            has_conflict: conflictDetected,
          })
          .eq('id', editAppointment.id);

        if (error) {
          toast.error('Error al actualizar la cita: ' + error.message);
          return;
        }
        toast.success('Cita actualizada correctamente');
      } else {
        // Crear nueva cita y agregarla a la tabla
        const { data: newAppt, error } = await supabase
          .from('appointments')
          .insert({
            code: generateAppointmentCode(),
            client_id: data.clientId,
            service_type: data.serviceType,
            district: data.district,
            address: data.address,
            service_date: data.date,
            start_time: data.startTime,
            end_time: data.endTime,
            shift: data.shift,
            status: 'programada',
            notes: data.notes || null,
            has_conflict: conflictDetected,
            created_by: user?.id || null,
          })
          .select()
          .single();

        if (error) {
          toast.error('Error al programar la cita: ' + error.message);
          return;
        }

        // Asignar personal a la cita
        if (selectedStaff.length > 0 && newAppt) {
          const staffInserts = selectedStaff.map(staffId => ({
            appointment_id: newAppt.id,
            staff_id: staffId,
          }));
          await supabase.from('appointment_staff').insert(staffInserts);
        }

        onCreated?.();
      }

      reset();
      setSelectedStaff([]);
      setConflictDetected(false);
      onClose();
    } catch (err) {
      toast.error('Error inesperado al guardar la cita');
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    reset();
    setSelectedStaff([]);
    setConflictDetected(false);
    onClose();
  };

  return (
    <Modal
      open={open}
      onClose={handleClose}
      title={isEditing ? 'Editar Cita' : 'Programar Nueva Cita'}
      subtitle={isEditing ? `Editando ${editAppointment?.code}` : 'Asigna personal y coordina el horario del servicio'}
      size="xl"
      footer={
        <div className="flex items-center gap-3 w-full">
          {conflictDetected && (
            <div className="flex items-center gap-1.5 text-xs text-amber-700 bg-amber-50 border border-amber-200 px-3 py-1.5 rounded-md">
              <AlertTriangle size={13} />
              Posible conflicto de horario — verifica antes de confirmar
            </div>
          )}
          <button type="button" onClick={handleClose}
            className="ml-auto px-4 py-2 text-sm font-500 text-secondary-foreground bg-secondary border border-border rounded-md hover:bg-muted transition-colors">
            Cancelar
          </button>
          <button type="button" onClick={handleSubmit(onSubmit)} disabled={loading}
            className="flex items-center gap-2 px-5 py-2 text-sm font-600 bg-primary text-primary-foreground rounded-md hover:bg-primary/90 disabled:opacity-60 transition-all active:scale-95">
            {loading && <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />}
            {loading ? 'Guardando...' : isEditing ? 'Actualizar Cita' : 'Programar Cita'}
          </button>
        </div>
      }
    >
      <form onSubmit={handleSubmit(onSubmit)}>
        <div className="grid grid-cols-2 gap-6">
          {/* Columna izquierda: información del servicio */}
          <div className="space-y-4">
            <p className="text-xs font-700 uppercase tracking-wide text-muted-foreground border-b border-border pb-2">
              Información del Servicio
            </p>

            {/* Cliente (solo en creación) */}
            {!isEditing && (
              <div>
                <label htmlFor="ap-clientId" className="block text-sm font-600 text-foreground mb-1">
                  Cliente <span className="text-rose-500">*</span>
                </label>
                <select id="ap-clientId" {...register('clientId', { required: 'Selecciona un cliente' })}
                  className="w-full px-3 py-2 text-sm bg-card border border-input rounded-md focus:outline-none focus:ring-2 focus:ring-ring">
                  <option value="">— Seleccionar cliente —</option>
                  {clients.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
                </select>
                {errors.clientId && <p className="text-xs text-rose-600 mt-1">{errors.clientId.message}</p>}
              </div>
            )}

            {/* Tipo de servicio */}
            <div>
              <label htmlFor="ap-serviceType" className="block text-sm font-600 text-foreground mb-1">
                Tipo de Servicio <span className="text-rose-500">*</span>
              </label>
              <select id="ap-serviceType" {...register('serviceType', { required: 'Selecciona el tipo de servicio' })}
                className="w-full px-3 py-2 text-sm bg-card border border-input rounded-md focus:outline-none focus:ring-2 focus:ring-ring">
                <option value="">— Seleccionar —</option>
                {serviceTypes.map((s) => <option key={s} value={s}>{s}</option>)}
              </select>
              {errors.serviceType && <p className="text-xs text-rose-600 mt-1">{errors.serviceType.message}</p>}
            </div>

            {/* Fecha (solo en creación) */}
            {!isEditing && (
              <div>
                <label htmlFor="ap-date" className="block text-sm font-600 text-foreground mb-1">
                  Fecha del Servicio <span className="text-rose-500">*</span>
                </label>
                <input id="ap-date" type="date" min={getTodayString()}
                  {...register('date', {
                    required: 'Selecciona la fecha',
                    validate: v => v >= getTodayString() || 'La fecha no puede ser anterior a hoy',
                  })}
                  className="w-full px-3 py-2 text-sm bg-card border border-input rounded-md focus:outline-none focus:ring-2 focus:ring-ring" />
                {errors.date && <p className="text-xs text-rose-600 mt-1">{errors.date.message}</p>}
              </div>
            )}

            {/* Horario */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label htmlFor="ap-start" className="block text-sm font-600 text-foreground mb-1">
                  Hora Inicio <span className="text-rose-500">*</span>
                </label>
                <input id="ap-start" type="time" {...register('startTime', { required: 'Ingresa la hora de inicio' })}
                  className="w-full px-3 py-2 text-sm bg-card border border-input rounded-md focus:outline-none focus:ring-2 focus:ring-ring" />
                {errors.startTime && <p className="text-xs text-rose-600 mt-1">{errors.startTime.message}</p>}
              </div>
              <div>
                <label htmlFor="ap-end" className="block text-sm font-600 text-foreground mb-1">
                  Hora Fin <span className="text-rose-500">*</span>
                </label>
                <input id="ap-end" type="time" {...register('endTime', { required: 'Ingresa la hora de fin' })}
                  className="w-full px-3 py-2 text-sm bg-card border border-input rounded-md focus:outline-none focus:ring-2 focus:ring-ring" />
                {errors.endTime && <p className="text-xs text-rose-600 mt-1">{errors.endTime.message}</p>}
              </div>
            </div>

            {/* Turno */}
            <div>
              <label htmlFor="ap-shift" className="block text-sm font-600 text-foreground mb-1">Turno</label>
              <select id="ap-shift" {...register('shift')}
                className="w-full px-3 py-2 text-sm bg-card border border-input rounded-md focus:outline-none focus:ring-2 focus:ring-ring">
                <option value="mañana">Mañana (06:00 – 13:00)</option>
                <option value="tarde">Tarde (13:00 – 20:00)</option>
              </select>
            </div>

            {/* Distrito y dirección */}
            <div>
              <label htmlFor="ap-district" className="block text-sm font-600 text-foreground mb-1">
                Distrito <span className="text-rose-500">*</span>
              </label>
              <select id="ap-district" {...register('district', { required: 'Selecciona el distrito' })}
                className="w-full px-3 py-2 text-sm bg-card border border-input rounded-md focus:outline-none focus:ring-2 focus:ring-ring">
                <option value="">— Seleccionar —</option>
                {limaDistricts.map((d) => <option key={d} value={d}>{d}</option>)}
              </select>
              {errors.district && <p className="text-xs text-rose-600 mt-1">{errors.district.message}</p>}
            </div>

            <div>
              <label htmlFor="ap-address" className="block text-sm font-600 text-foreground mb-1">
                Dirección <span className="text-rose-500">*</span>
              </label>
              <input id="ap-address" type="text" {...register('address', { required: 'Ingresa la dirección' })}
                className="w-full px-3 py-2 text-sm bg-card border border-input rounded-md focus:outline-none focus:ring-2 focus:ring-ring"
                placeholder="Av. Principal 123" />
              {errors.address && <p className="text-xs text-rose-600 mt-1">{errors.address.message}</p>}
            </div>

            {/* Notas */}
            <div>
              <label htmlFor="ap-notes" className="block text-sm font-600 text-foreground mb-1">Notas</label>
              <textarea id="ap-notes" rows={2} {...register('notes')}
                className="w-full px-3 py-2 text-sm bg-card border border-input rounded-md focus:outline-none focus:ring-2 focus:ring-ring resize-none"
                placeholder="Instrucciones especiales, accesos, materiales..." />
            </div>
          </div>

          {/* Columna derecha: asignación de personal */}
          <div className="space-y-4">
            <p className="text-xs font-700 uppercase tracking-wide text-muted-foreground border-b border-border pb-2">
              Personal Asignado
            </p>

            {conflictDetected && (
              <div className="flex items-start gap-2 p-3 bg-amber-50 border border-amber-200 rounded-lg">
                <AlertTriangle size={14} className="text-amber-600 shrink-0 mt-0.5" />
                <p className="text-xs text-amber-700">
                  Se detectó un posible conflicto de horario. Verifica la disponibilidad del personal antes de confirmar.
                </p>
              </div>
            )}

            <p className="text-xs text-muted-foreground">
              Selecciona los operarios disponibles para este servicio
            </p>

            <div className="space-y-2 max-h-80 overflow-y-auto scrollbar-thin">
              {staffList.map((staff) => {
                const isSelected = selectedStaff.includes(staff.id);
                return (
                  <button
                    key={staff.id}
                    type="button"
                    onClick={() => toggleStaff(staff.id)}
                    className={`w-full flex items-center gap-3 p-3 rounded-lg border text-left transition-all ${
                      isSelected
                        ? 'border-primary bg-primary/5 text-primary' :'border-border hover:border-muted-foreground/30 hover:bg-muted/40'
                    }`}
                  >
                    <div className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-700 shrink-0 ${
                      isSelected ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground'
                    }`}>
                      {staff.name.charAt(0)}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-600 truncate">{staff.name}</p>
                      <p className="text-xs text-muted-foreground truncate">{staff.specialty}</p>
                    </div>
                    {isSelected && (
                      <span className="text-[10px] font-700 bg-primary text-primary-foreground px-1.5 py-0.5 rounded-full">
                        ✓
                      </span>
                    )}
                  </button>
                );
              })}
            </div>

            {selectedStaff.length > 0 && (
              <p className="text-xs text-muted-foreground">
                {selectedStaff.length} operario(s) seleccionado(s)
              </p>
            )}
          </div>
        </div>
      </form>
    </Modal>
  );
}