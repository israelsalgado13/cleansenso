'use client';

/**
 * Página principal del módulo de Cotizaciones
 * Muestra estadísticas en tiempo real, filtros y tabla de cotizaciones
 */

import React, { useState } from 'react';
import AppLayout from '@/components/AppLayout';
import QuoteStatsBar from './components/QuoteStatsBar';
import QuoteTableClient from './components/QuoteTableClient';
import CreateQuoteModal from './components/CreateQuoteModal';
import { Plus } from 'lucide-react';

export default function QuoteManagementPage() {
  const [showCreateModal, setShowCreateModal] = useState(false);

  return (
    <AppLayout
      title="Gestión de Cotizaciones"
      subtitle="— Administra presupuestos y seguimiento de clientes"
      actions={
        <button
          onClick={() => setShowCreateModal(true)}
          className="flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground text-sm font-600 rounded-lg hover:bg-primary/90 transition-all active:scale-95"
        >
          <Plus size={16} />
          Nueva Cotización
        </button>
      }
    >
      {/* Métricas en tiempo real */}
      <QuoteStatsBar />

      {/* Tabla con filtros integrados */}
      <div className="mt-6">
        <QuoteTableClient />
      </div>

      {/* Modal de creación */}
      <CreateQuoteModal
        open={showCreateModal}
        onClose={() => setShowCreateModal(false)}
      />
    </AppLayout>
  );
}