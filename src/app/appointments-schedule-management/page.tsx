/**
 * Página principal del módulo de Citas y Agenda
 * Muestra la barra de estadísticas y el componente de agenda
 * con vista lista y calendario, programación y gestión de citas
 */
import React from 'react';
import AppLayout from '@/components/AppLayout';
import AppointmentStatsRow from './components/AppointmentStatsRow';
import AppointmentScheduleClient from './components/AppointmentScheduleClient';

export default function AppointmentsSchedulePage() {
  return (
    <AppLayout
      title="Citas y Agenda"
      subtitle="— Programación y seguimiento de servicios"
    >
      {/* Métricas en tiempo real: citas hoy, semana, conflictos, completadas */}
      <AppointmentStatsRow />

      {/* Tabla/calendario de citas con CRUD completo */}
      <div className="mt-6">
        <AppointmentScheduleClient />
      </div>
    </AppLayout>
  );
}