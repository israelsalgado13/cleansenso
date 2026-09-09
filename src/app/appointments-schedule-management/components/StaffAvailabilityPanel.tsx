'use client';

/**
 * Panel de disponibilidad del personal para el día actual
 * Muestra el estado de cada operario: disponible (verde) u ocupado (naranja)
 * Se muestra solo en pantallas grandes (xl+) como columna lateral
 */

import React from 'react';
import type { Appointment } from './AppointmentScheduleClient';

// Props del componente
interface StaffAvailabilityPanelProps {
  appointments: Appointment[]; // Lista de citas del día para determinar disponibilidad
}

// Lista completa del personal de CleanSenso con sus especialidades
const allStaff = [
  { id: 'staff-001', name: 'Miguel Quispe', initials: 'MQ', specialty: 'Limpieza general' },
  { id: 'staff-002', name: 'Ana Flores', initials: 'AF', specialty: 'Lavado especializado' },
  { id: 'staff-003', name: 'Juan Ccopa', initials: 'JC', specialty: 'Limpieza general' },
  { id: 'staff-004', name: 'Luis Mamani', initials: 'LM', specialty: 'Desinfección' },
  { id: 'staff-005', name: 'Rosa Tito', initials: 'RT', specialty: 'Limpieza general' },
  { id: 'staff-006', name: 'Carlos Soto', initials: 'CS', specialty: 'Alfombras y tapizados' },
  { id: 'staff-007', name: 'Elena Puma', initials: 'EP', specialty: 'Limpieza general' },
  { id: 'staff-008', name: 'Raúl Condori', initials: 'RC', specialty: 'Pisos y superficies' },
  { id: 'staff-009', name: 'Paola Huanca', initials: 'PH', specialty: 'Limpieza general' },
  { id: 'staff-010', name: 'Diego Arias', initials: 'DA', specialty: 'Desinfección' },
];

// IDs de citas del día actual (datos de ejemplo)
const todayAppts = ['appt-001', 'appt-002', 'appt-003', 'appt-004'];

export default function StaffAvailabilityPanel({ appointments }: StaffAvailabilityPanelProps) {
  // Filtra las citas de hoy
  const todayAppointments = appointments.filter((a) => todayAppts.includes(a.id));

  // Conjunto de nombres de operarios ocupados hoy
  const busyStaffToday = new Set(todayAppointments.flatMap((a) => a.staffAssigned));

  return (
    // Panel lateral fijo — solo visible en pantallas xl y mayores
    <div className="w-56 shrink-0 hidden xl:block">
      <div className="bg-card border border-border rounded-xl overflow-hidden sticky top-6">

        {/* Encabezado del panel */}
        <div className="px-4 py-3 border-b border-border">
          <p className="text-xs font-700 uppercase tracking-wide text-muted-foreground">
            Personal — Hoy
          </p>
          <p className="text-[10px] text-muted-foreground mt-0.5">07 de septiembre, 2026</p>
        </div>

        {/* Lista de operarios con estado de disponibilidad */}
        <div className="divide-y divide-border">
          {allStaff.map((staff) => {
            const isBusy = busyStaffToday.has(staff.name);
            // Obtiene la cita asignada al operario si está ocupado
            const assignedAppt = isBusy
              ? todayAppointments.find((a) => a.staffAssigned.includes(staff.name))
              : null;

            return (
              <div key={staff.id} className="px-3 py-2.5 flex items-center gap-2.5">
                {/* Avatar con iniciales — naranja si ocupado, verde si disponible */}
                <div className={`w-7 h-7 rounded-full flex items-center justify-center text-[10px] font-700 shrink-0 border-2
                  ${isBusy
                    ? 'bg-orange-100 text-orange-700 border-orange-200' :'bg-green-100 text-green-700 border-green-200'}`}>
                  {staff.initials}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-600 text-foreground truncate">{staff.name}</p>
                  {/* Muestra el tipo de servicio si está ocupado, o "Disponible" si no */}
                  {isBusy && assignedAppt ? (
                    <p className="text-[10px] text-orange-600 truncate">{assignedAppt.serviceType}</p>
                  ) : (
                    <p className="text-[10px] text-green-600">Disponible</p>
                  )}
                </div>
                {/* Punto indicador de estado */}
                <div className={`w-2 h-2 rounded-full shrink-0 ${isBusy ? 'bg-orange-500' : 'bg-green-500'}`} />
              </div>
            );
          })}
        </div>

        {/* Resumen de ocupados vs disponibles */}
        <div className="px-4 py-2.5 bg-muted/30 border-t border-border">
          <div className="flex items-center justify-between text-xs">
            <span className="text-muted-foreground">Ocupados</span>
            <span className="font-700 text-orange-600 tabular-nums">{busyStaffToday.size}</span>
          </div>
          <div className="flex items-center justify-between text-xs mt-1">
            <span className="text-muted-foreground">Disponibles</span>
            <span className="font-700 text-green-600 tabular-nums">{allStaff.length - busyStaffToday.size}</span>
          </div>
        </div>
      </div>
    </div>
  );
}