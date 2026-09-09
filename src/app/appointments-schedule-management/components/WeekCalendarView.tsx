'use client';

/**
 * Vista de calendario semanal del módulo de Citas
 * Muestra las citas de la semana actual en una grilla de días × franjas horarias
 * Permite hacer clic en una cita para ver su detalle
 * Las citas con conflicto se resaltan con un borde rojo
 */

import React from 'react';
import { AlertTriangle } from 'lucide-react';
import type { Appointment } from './AppointmentScheduleClient';

// Props del componente
interface WeekCalendarViewProps {
  appointments: Appointment[];                   // Lista de citas a mostrar
  serviceTypeColors: Record<string, string>;     // Colores por tipo de servicio
  onSelectAppt: (appt: Appointment) => void;     // Callback al seleccionar una cita
}

// Días de la semana con fechas estáticas de ejemplo
const weekDays = [
  { id: 'day-mon', label: 'Lun', date: '07', fullDate: '07/09/2026', isToday: true },
  { id: 'day-tue', label: 'Mar', date: '08', fullDate: '08/09/2026', isToday: false },
  { id: 'day-wed', label: 'Mié', date: '09', fullDate: '09/09/2026', isToday: false },
  { id: 'day-thu', label: 'Jue', date: '10', fullDate: '10/09/2026', isToday: false },
  { id: 'day-fri', label: 'Vie', date: '11', fullDate: '11/09/2026', isToday: false },
  { id: 'day-sat', label: 'Sáb', date: '12', fullDate: '12/09/2026', isToday: false },
  { id: 'day-sun', label: 'Dom', date: '13', fullDate: '13/09/2026', isToday: false },
];

// Franjas horarias del calendario (de 06:00 a 18:00)
const timeSlots = ['06:00', '07:00', '08:00', '09:00', '10:00', '11:00', '12:00', '13:00', '14:00', '15:00', '16:00', '17:00', '18:00'];

/**
 * Filtra las citas que corresponden a un día y franja horaria específicos
 * Una cita aparece en todas las franjas que cubre (desde startTime hasta endTime)
 */
function getApptForDaySlot(appointments: Appointment[], fullDate: string, timeSlot: string) {
  return appointments.filter((a) => {
    if (a.date !== fullDate) return false;
    const slotHour = parseInt(timeSlot.split(':')[0]);
    const startHour = parseInt(a.startTime.split(':')[0]);
    const endHour = parseInt(a.endTime.split(':')[0]);
    return slotHour >= startHour && slotHour < endHour;
  });
}

export default function WeekCalendarView({ appointments, serviceTypeColors, onSelectAppt }: WeekCalendarViewProps) {
  return (
    <div className="bg-card border border-border rounded-xl overflow-hidden">

      {/* Encabezado de días de la semana */}
      <div className="grid border-b border-border" style={{ gridTemplateColumns: '56px repeat(7, 1fr)' }}>
        {/* Columna vacía para alinear con las etiquetas de hora */}
        <div className="px-2 py-3 border-r border-border" />
        {weekDays.map((day) => (
          <div
            key={day.id}
            className={`px-2 py-3 text-center border-r border-border last:border-r-0
              ${day.isToday ? 'bg-primary/5' : ''}`}
          >
            {/* Nombre del día */}
            <p className={`text-xs font-500 uppercase tracking-wide ${day.isToday ? 'text-primary' : 'text-muted-foreground'}`}>
              {day.label}
            </p>
            {/* Número del día */}
            <p className={`text-lg font-700 mt-0.5 tabular-nums ${day.isToday ? 'text-primary' : 'text-foreground'}`}>
              {day.date}
            </p>
            {/* Badge "Hoy" para el día actual */}
            {day.isToday && (
              <span className="text-[10px] font-600 bg-primary text-primary-foreground px-1.5 py-0.5 rounded-full">
                Hoy
              </span>
            )}
          </div>
        ))}
      </div>

      {/* Grilla de franjas horarias con scroll vertical */}
      <div className="overflow-y-auto scrollbar-thin" style={{ maxHeight: '480px' }}>
        {timeSlots.map((slot) => (
          <div
            key={`slot-${slot}`}
            className="grid border-b border-border last:border-b-0 min-h-[56px]"
            style={{ gridTemplateColumns: '56px repeat(7, 1fr)' }}
          >
            {/* Etiqueta de hora en la columna izquierda */}
            <div className="px-2 py-2 border-r border-border flex items-start justify-end">
              <span className="text-[10px] text-muted-foreground tabular-nums">{slot}</span>
            </div>

            {/* Celdas de cada día para esta franja horaria */}
            {weekDays.map((day) => {
              const appts = getApptForDaySlot(appointments, day.fullDate, slot);
              return (
                <div
                  key={`cell-${day.id}-${slot}`}
                  className={`p-1 border-r border-border last:border-r-0 relative
                    ${day.isToday ? 'bg-primary/5' : ''}`}
                >
                  {appts.map((appt) => {
                    // Solo renderiza el bloque en la franja de inicio (evita duplicados)
                    const startHour = parseInt(appt.startTime.split(':')[0]);
                    const slotHour = parseInt(slot.split(':')[0]);
                    if (slotHour !== startHour) return null;

                    const svcColorClass = serviceTypeColors[appt.serviceType] ?? 'bg-slate-100 text-slate-700 border-slate-200';
                    return (
                      // Botón de cita — al hacer clic abre el drawer de detalle
                      <button
                        key={`cal-${appt.id}`}
                        onClick={() => onSelectAppt(appt)}
                        className={`w-full text-left rounded-md px-1.5 py-1 border text-[10px] font-600 truncate hover:opacity-90 transition-opacity ${svcColorClass} ${appt.hasConflict ? 'ring-2 ring-rose-400' : ''}`}
                        title={`${appt.code} — ${appt.clientCompany}`}
                      >
                        <div className="flex items-center gap-0.5">
                          {/* Icono de conflicto si aplica */}
                          {appt.hasConflict && <AlertTriangle size={9} className="text-rose-600 shrink-0" />}
                          <span className="truncate">{appt.startTime}–{appt.endTime}</span>
                        </div>
                        {/* Nombre del cliente */}
                        <span className="truncate block">{appt.clientCompany}</span>
                      </button>
                    );
                  })}
                </div>
              );
            })}
          </div>
        ))}
      </div>
    </div>
  );
}