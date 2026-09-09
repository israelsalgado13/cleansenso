'use client';

/**
 * Filtros de búsqueda y pestañas del módulo de Cotizaciones
 * Permite filtrar por estado (todas, borrador, enviadas, aceptadas, rechazadas, vencidas)
 * y buscar por texto en tiempo real
 */

import React from 'react';
import { Search, SlidersHorizontal } from 'lucide-react';

// ── Tipos ──────────────────────────────────────────────────────────────────────

export type QuoteFilterStatus = 'todas' | 'borrador' | 'enviada' | 'aceptada' | 'rechazada' | 'vencida';

interface QuoteFiltersProps {
  activeTab: QuoteFilterStatus;
  onTabChange: (tab: QuoteFilterStatus) => void;
  searchQuery: string;
  onSearchChange: (q: string) => void;
}

// Definición de pestañas con etiquetas y colores de badge
const TABS: { value: QuoteFilterStatus; label: string; color?: string }[] = [
  { value: 'todas', label: 'Todas' },
  { value: 'borrador', label: 'Borrador', color: 'bg-muted text-muted-foreground' },
  { value: 'enviada', label: 'Enviadas', color: 'bg-blue-50 text-blue-700' },
  { value: 'aceptada', label: 'Aceptadas', color: 'bg-green-50 text-green-700' },
  { value: 'rechazada', label: 'Rechazadas', color: 'bg-rose-50 text-rose-700' },
  { value: 'vencida', label: 'Vencidas', color: 'bg-amber-50 text-amber-700' },
];

export default function QuoteFilters({
  activeTab,
  onTabChange,
  searchQuery,
  onSearchChange,
}: QuoteFiltersProps) {
  return (
    <div className="space-y-3">
      {/* Pestañas de estado — todas habilitadas */}
      <div className="flex items-center gap-1 overflow-x-auto scrollbar-thin pb-1">
        {TABS.map((tab) => (
          <button
            key={tab.value}
            onClick={() => onTabChange(tab.value)}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-500 whitespace-nowrap transition-all ${
              activeTab === tab.value
                ? 'bg-primary text-primary-foreground shadow-sm'
                : 'text-muted-foreground hover:text-foreground hover:bg-muted'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Barra de búsqueda y filtros adicionales */}
      <div className="flex items-center gap-2">
        <div className="relative flex-1">
          <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => onSearchChange(e.target.value)}
            placeholder="Buscar por cliente, código o servicio..."
            className="w-full pl-9 pr-3 py-2 text-sm bg-card border border-input rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary transition-colors"
          />
        </div>
        <button className="flex items-center gap-1.5 px-3 py-2 text-sm font-500 text-secondary-foreground bg-card border border-border rounded-lg hover:bg-muted transition-colors">
          <SlidersHorizontal size={14} />
          <span className="hidden sm:inline">Filtros</span>
        </button>
      </div>
    </div>
  );
}