/**
 * Página principal del módulo de Gestión de Clientes
 * Muestra la barra de estadísticas y la tabla de clientes
 * con búsqueda, filtros y operaciones CRUD
 */
import React from 'react';
import AppLayout from '@/components/AppLayout';
import ClientStatsRow from './components/ClientStatsRow';
import ClientTableClient from './components/ClientTableClient';

export default function ClientManagementPage() {
  return (
    <AppLayout
      title="Gestión de Clientes"
      subtitle="— Registro y seguimiento de clientes CleanSenso"
    >
      {/* Métricas en tiempo real: total, activos, prospectos, empresas */}
      <ClientStatsRow />

      {/* Tabla de clientes con búsqueda, filtros y acciones CRUD */}
      <div className="mt-6">
        <ClientTableClient />
      </div>
    </AppLayout>
  );
}