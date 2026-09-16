'use client';

/**
 * Panel lateral de detalle de cita
 * Se desliza desde la derecha mostrando información completa de una cita:
 * datos del cliente, servicio, horario, personal asignado y acciones disponibles
 * Muestra alertas de conflicto de horario cuando corresponde
 */

import React from 'react';
import { X, MapPin, Clock, FileText, Edit2, CheckCircle, AlertTriangle, Wrench,  } from 'lucide-react';
import StatusBadge from '@/components/ui/StatusBadge';
import { toast } from 'sonner';
import type { Appointment } from './AppointmentScheduleClient';

// Props del drawer
interface AppointmentDetailDrawerProps {
  appointment: Appointment;                      // Cita a mostrar
  onClose: () => void;                           // Función para cerrar el panel
  serviceTypeColors: Record<string, string>;     // Mapa de colores por tipo de servicio
  onEdit?: (appointment: Appointment) => void;   // Función para editar la cita
}

export default function AppointmentDetailDrawer({
  appointment,
  onClose,
  serviceTypeColors,
  onEdit,
}: AppointmentDetailDrawerProps) {
  // Guarda: si no hay cita seleccionada, no renderizar nada
  if (!appointment) return null;

  // Obtiene el color del tipo de servicio, con fallback a gris
  const svcColor = serviceTypeColors[appointment.serviceType] ?? 'bg-slate-100 text-slate-700 border-slate-200';

  return (
    // Overlay de pantalla completa con panel deslizante desde la derecha
    <div className="fixed inset-0 z-50 flex justify-end">
      {/* Fondo oscuro — al hacer clic cierra el panel */}
      <div className="absolute inset-0 bg-foreground/30 backdrop-blur-sm fade-in" onClick={onClose} />

      {/* Panel lateral de detalle */}
      <div className="relative w-full max-w-xl bg-card border-l border-border shadow-2xl flex flex-col slide-in-right h-full">

        {/* Encabezado: código, estado, orden de servicio y botón cerrar */}
        <div className="px-6 py-4 border-b border-border shrink-0">
          <div className="flex items-start justify-between">
            <div>
              <div className="flex items-center gap-2 mb-1">
                {/* Alerta de conflicto de horario si aplica */}
                {appointment.hasConflict && (
                  <div className="flex items-center gap-1 px-2 py-0.5 bg-rose-100 text-rose-700 rounded-full text-xs font-600">
                    <AlertTriangle size={11} />
                    Conflicto de horario
                  </div>
                )}
              </div>
              <div className="flex items-center gap-2">
                <h2 className="text-base font-700 text-foreground">{appointment.code}</h2>
                <StatusBadge status={appointment.status} />
              </div>
              {/* Código de orden de servicio si ya fue generada */}
              {appointment.serviceOrderCode && (
                <p className="text-xs text-muted-foreground mt-0.5">
                  Orden de Servicio: <span className="font-600 text-foreground">{appointment.serviceOrderCode}</span>
                </p>
              )}
            </div>
            {/* Botón para cerrar el panel */}
            <button
              onClick={onClose}
              className="w-8 h-8 rounded-md flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
            >
              <X size={16} />
            </button>
          </div>
        </div>

        {/* Contenido con scroll */}
        <div className="flex-1 overflow-y-auto px-6 py-5 space-y-5 scrollbar-thin">

          {/* Banner de advertencia de conflicto de horario */}
          {appointment.hasConflict && (
            <div className="flex items-start gap-3 p-3 bg-rose-50 border border-rose-200 rounded-lg">
              <AlertTriangle size={16} className="text-rose-600 shrink-0 mt-0.5" />
              <div>
                <p className="text-sm font-700 text-rose-700">Conflicto de asignación detectado</p>
                <p className="text-xs text-rose-600 mt-0.5">
                  Uno o más operarios asignados a esta cita ya tienen otro servicio en el mismo horario. Reasigna el personal antes de confirmar.
                </p>
              </div>
            </div>
          )}

          {/* Información del cliente y tipo de servicio */}
          <div className="bg-muted/40 rounded-lg p-4 space-y-2.5">
            <p className="text-xs font-600 uppercase tracking-wide text-muted-foreground mb-2">Cliente y Servicio</p>
            <div>
              <p className="text-sm font-700 text-foreground">{appointment.clientCompany}</p>
              <p className="text-xs text-muted-foreground">{appointment.clientName}</p>
            </div>
            {/* Badge de tipo de servicio con color dinámico */}
            <div className="flex items-center gap-2">
              <Wrench size={13} className="text-muted-foreground shrink-0" />
              <span className={`text-xs font-600 px-2 py-0.5 rounded-full border ${svcColor}`}>
                {appointment.serviceType}
              </span>
            </div>
            {/* Dirección del servicio */}
            <div className="flex items-center gap-2">
              <MapPin size={13} className="text-muted-foreground shrink-0" />
              <p className="text-sm text-foreground">{appointment.address}, {appointment.district}</p>
            </div>
          </div>

          {/* Fecha, horario y turno */}
          <div className="grid grid-cols-3 gap-3">
            <div className="bg-muted/40 rounded-lg p-3">
              <p className="text-[10px] font-600 uppercase tracking-wide text-muted-foreground mb-1">Fecha</p>
              <p className="text-sm font-700 tabular-nums text-foreground">{appointment.date}</p>
            </div>
            <div className="bg-muted/40 rounded-lg p-3">
              <div className="flex items-center gap-1 mb-1">
                <Clock size={11} className="text-muted-foreground" />
                <p className="text-[10px] font-600 uppercase tracking-wide text-muted-foreground">Horario</p>
              </div>
              <p className="text-sm font-700 tabular-nums text-foreground">{appointment.startTime} – {appointment.endTime}</p>
            </div>
            <div className="bg-muted/40 rounded-lg p-3">
              <p className="text-[10px] font-600 uppercase tracking-wide text-muted-foreground mb-1">Turno</p>
              {/* Badge de turno con color diferenciado */}
              <span className={`text-xs font-700 px-2 py-0.5 rounded-full
                ${appointment.shift === 'mañana' ? 'bg-amber-100 text-amber-700' : 'bg-indigo-100 text-indigo-700'}`}>
                {appointment.shift === 'mañana' ? '☀️ Mañana' : '🌙 Tarde'}
              </span>
            </div>
          </div>

          {/* Lista del personal asignado */}
          <div>
            <div className="flex items-center justify-between mb-3">
              <p className="text-xs font-600 uppercase tracking-wide text-muted-foreground">
                Personal Asignado ({appointment.staffAssigned.length})
              </p>
              <button
                onClick={() => {
                  onClose();
                  onEdit?.(appointment);
                }}
                className="text-xs font-600 text-primary hover:underline"
              >
                Reasignar
              </button>
            </div>
            <div className="space-y-2">
              {appointment.staffAssigned.map((staff, idx) => (
                <div
                  key={`drawer-staff-${appointment.id}-${idx}`}
                  className="flex items-center gap-2.5 p-2 rounded-lg bg-muted/30 border border-border"
                >
                  {/* Avatar con iniciales del operario */}
                  <div className="w-7 h-7 rounded-full bg-primary/20 text-primary flex items-center justify-center text-[10px] font-700 shrink-0">
                    {staff.split(' ').map((n) => n[0]).join('').slice(0, 2)}
                  </div>
                  <p className="text-sm font-500 text-foreground">{staff}</p>
                  {/* Indicador de conflicto para los primeros operarios */}
                  {appointment.hasConflict && idx < 2 && (
                    <span className="ml-auto text-[10px] font-600 text-rose-600 bg-rose-50 px-1.5 py-0.5 rounded-full border border-rose-200">
                      Conflicto
                    </span>
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* Referencia a la cotización de origen */}
          <div className="flex items-center gap-3 p-3 bg-muted/30 rounded-lg border border-border">
            <FileText size={16} className="text-muted-foreground shrink-0" />
            <div>
              <p className="text-xs text-muted-foreground">Cotización de origen</p>
              <p className="text-sm font-700 text-primary">{appointment.quoteCode}</p>
            </div>
          </div>

          {/* Observaciones adicionales (si existen) */}
          {appointment.notes && (
            <div className="bg-amber-50 border border-amber-200 rounded-lg p-3">
              <p className="text-xs font-600 text-amber-700 mb-1">Observaciones</p>
              <p className="text-xs text-amber-600">{appointment.notes}</p>
            </div>
          )}
        </div>

        {/* Pie del panel: acciones según estado de la cita */}
        <div className="px-6 py-4 border-t border-border bg-muted/20 flex items-center gap-2 shrink-0">
          {/* Botón confirmar (solo si está programada) */}
          {appointment.status === 'programada' && (
            <button
              onClick={() => {
                toast.success(`${appointment.code} confirmada`);
                onClose();
              }}
              className="flex items-center gap-1.5 px-4 py-2 text-sm font-600 bg-green-600 text-white rounded-md hover:bg-green-700 transition-all active:scale-95"
            >
              <CheckCircle size={14} />
              Confirmar Cita
            </button>
          )}
          {/* Botón generar orden de servicio (solo si está confirmada y sin orden) */}
          {!appointment.serviceOrderCode && appointment.status === 'confirmada' && (
            <button
              onClick={() => toast.success(`Orden de servicio OS-2026-020 generada`)}
              className="flex items-center gap-1.5 px-4 py-2 text-sm font-600 bg-primary text-primary-foreground rounded-md hover:bg-primary/90 transition-all active:scale-95"
            >
              <FileText size={14} />
              Generar Orden de Servicio
            </button>
          )}
          {/* Botón editar cita */}
          <button
            onClick={() => {
              onClose();
              onEdit?.(appointment);
            }}
            className="flex items-center gap-1.5 px-4 py-2 text-sm font-500 text-secondary-foreground bg-secondary border border-border rounded-md hover:bg-muted transition-colors ml-auto"
          >
            <Edit2 size={14} />
            Editar Cita
          </button>
        </div>
      </div>
    </div>
  );
}