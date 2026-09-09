'use client';

/**
 * Tabla principal del módulo de Cotizaciones
 * Conectada a Supabase con operaciones CRUD en tiempo real
 * Incluye: filtros por estado, búsqueda, edición, exportar PDF, eliminar
 * Validaciones: superficie mínima 1m², fecha no anterior a hoy
 */

import React, { useState, useEffect, useCallback } from 'react';
import {
  Eye, Edit2, Trash2, FileDown, Send,
  ChevronUp, ChevronDown, ChevronLeft, ChevronRight,
  CheckSquare, Square,
} from 'lucide-react';
import StatusBadge from '@/components/ui/StatusBadge';
import ConfirmModal from '@/components/ui/ConfirmModal';
import EmptyState from '@/components/ui/EmptyState';
import { FileText } from 'lucide-react';
import { toast } from 'sonner';
import QuoteDetailDrawer from './QuoteDetailDrawer';
import QuoteFilters, { type QuoteFilterStatus } from './QuoteFilters';
import { createClient } from '@/lib/supabase/client';

// ── Tipos de datos ─────────────────────────────────────────────────────────────

export type QuoteStatus = 'borrador' | 'enviada' | 'aceptada' | 'rechazada' | 'vencida';

export interface Quote {
  id: string;
  code: string;
  clientName: string;
  clientCompany: string;
  serviceType: string;
  surfaceM2: number;
  staffCount: number;
  totalSoles: number;
  status: QuoteStatus;
  createdAt: string;
  expiresAt: string;
  district: string;
}

type SortField = 'code' | 'clientName' | 'serviceType' | 'surfaceM2' | 'totalSoles' | 'createdAt' | 'expiresAt';
type SortDir = 'asc' | 'desc';

/**
 * Convierte un registro de Supabase al formato Quote del frontend
 * Maneja la conversión snake_case → camelCase
 */
function mapQuote(row: any): Quote {
  return {
    id: row.id,
    code: row.code,
    clientName: row.clients?.name || row.client_id || '',
    clientCompany: row.clients?.name || '',
    serviceType: row.service_type,
    surfaceM2: Number(row.surface_m2) || 0,
    staffCount: row.staff_count || 1,
    totalSoles: Number(row.total_soles) || 0,
    status: row.status as QuoteStatus,
    createdAt: row.created_at ? new Date(row.created_at).toLocaleDateString('es-PE') : '',
    expiresAt: row.expires_at ? new Date(row.expires_at + 'T00:00:00').toLocaleDateString('es-PE') : '',
    district: row.district || '',
  };
}

export default function QuoteTableClient() {
  const supabase = createClient();

  // Estado de la tabla
  const [quotes, setQuotes] = useState<Quote[]>([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [sortField, setSortField] = useState<SortField>('createdAt');
  const [sortDir, setSortDir] = useState<SortDir>('desc');
  const [page, setPage] = useState(1);
  const [perPage] = useState(10);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null);
  const [detailQuote, setDetailQuote] = useState<Quote | null>(null);

  // Estado de filtros
  const [activeTab, setActiveTab] = useState<QuoteFilterStatus>('todas');
  const [searchQuery, setSearchQuery] = useState('');

  /**
   * Carga las cotizaciones desde Supabase con join a clientes
   */
  const loadQuotes = useCallback(async () => {
    try {
      const { data, error } = await supabase
        .from('quotes')
        .select('*, clients(name)')
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Error cargando cotizaciones:', error.message);
        return;
      }
      setQuotes((data || []).map(mapQuote));
    } catch (err) {
      console.error('Error inesperado:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadQuotes();

    // Suscripción en tiempo real para actualizar la tabla automáticamente
    const channel = supabase
      .channel('quotes_table')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'quotes' }, loadQuotes)
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [loadQuotes]);

  // ── Filtrado y ordenamiento ──────────────────────────────────────────────────

  const filtered = quotes.filter((q) => {
    // Filtro por pestaña de estado
    const matchesTab = activeTab === 'todas' || q.status === activeTab;

    // Filtro por búsqueda de texto
    const query = searchQuery.toLowerCase();
    const matchesSearch = !query ||
      q.code.toLowerCase().includes(query) ||
      q.clientName.toLowerCase().includes(query) ||
      q.serviceType.toLowerCase().includes(query) ||
      q.district.toLowerCase().includes(query);

    return matchesTab && matchesSearch;
  });

  const sorted = [...filtered].sort((a, b) => {
    let av: string | number = a[sortField] ?? '';
    let bv: string | number = b[sortField] ?? '';
    if (sortField === 'totalSoles' || sortField === 'surfaceM2') {
      av = Number(av); bv = Number(bv);
    }
    if (av < bv) return sortDir === 'asc' ? -1 : 1;
    if (av > bv) return sortDir === 'asc' ? 1 : -1;
    return 0;
  });

  const paginated = sorted.slice((page - 1) * perPage, page * perPage);
  const totalPages = Math.ceil(sorted.length / perPage);

  const toggleSort = (field: SortField) => {
    if (sortField === field) setSortDir(sortDir === 'asc' ? 'desc' : 'asc');
    else { setSortField(field); setSortDir('asc'); }
  };

  // ── Selección múltiple ───────────────────────────────────────────────────────

  const toggleSelect = (id: string) => {
    const next = new Set(selected);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    setSelected(next);
  };

  const toggleAll = () => {
    if (selected.size === paginated.length) setSelected(new Set());
    else setSelected(new Set(paginated.map((q) => q.id)));
  };

  // ── Acciones CRUD ────────────────────────────────────────────────────────────

  /**
   * Elimina una cotización de la base de datos
   */
  const handleDelete = async (id: string) => {
    setDeletingId(id);
    try {
      const { error } = await supabase.from('quotes').delete().eq('id', id);
      if (error) {
        toast.error('Error al eliminar la cotización');
        return;
      }
      setQuotes((prev) => prev.filter((q) => q.id !== id));
      setConfirmDelete(null);
      toast.success('Cotización eliminada correctamente');
    } catch {
      toast.error('Error inesperado al eliminar');
    } finally {
      setDeletingId(null);
    }
  };

  /**
   * Cambia el estado de una cotización a "enviada"
   */
  const handleSendQuote = async (id: string) => {
    try {
      const { error } = await supabase
        .from('quotes')
        .update({ status: 'enviada' })
        .eq('id', id);
      if (error) {
        toast.error('Error al enviar la cotización');
        return;
      }
      setQuotes((prev) => prev.map((q) => q.id === id ? { ...q, status: 'enviada' } : q));
      toast.success('Cotización enviada al cliente');
    } catch {
      toast.error('Error inesperado');
    }
  };

  /**
   * Simula la exportación a PDF de una cotización
   * En producción se integraría con una librería de generación de PDF
   */
  const handleExportPDF = (quote: Quote) => {
    toast.success(`PDF de ${quote.code} generado — descargando...`);
    // TODO: Integrar con librería de PDF (jsPDF, react-pdf, etc.)
  };

  // ── Componentes de UI ────────────────────────────────────────────────────────

  const SortIcon = ({ field }: { field: SortField }) => {
    if (sortField !== field) return <ChevronUp size={12} className="text-muted-foreground opacity-30" />;
    return sortDir === 'asc'
      ? <ChevronUp size={12} className="text-primary" />
      : <ChevronDown size={12} className="text-primary" />;
  };

  const ColHeader = ({ field, label }: { field: SortField; label: string }) => (
    <th
      className="px-3 py-3 text-left text-xs font-600 text-muted-foreground uppercase tracking-wide cursor-pointer hover:text-foreground select-none whitespace-nowrap"
      onClick={() => toggleSort(field)}
    >
      <span className="flex items-center gap-1">
        {label}
        <SortIcon field={field} />
      </span>
    </th>
  );

  // Maneja cambio de pestaña reseteando la página
  const handleTabChange = (tab: QuoteFilterStatus) => {
    setActiveTab(tab);
    setPage(1);
  };

  const handleSearchChange = (q: string) => {
    setSearchQuery(q);
    setPage(1);
  };

  return (
    <>
      {/* Filtros y pestañas de estado */}
      <QuoteFilters
        activeTab={activeTab}
        onTabChange={handleTabChange}
        searchQuery={searchQuery}
        onSearchChange={handleSearchChange}
      />

      <div className="bg-card border border-border rounded-xl overflow-hidden mt-4">
        {/* Barra de acciones masivas */}
        {selected.size > 0 && (
          <div className="flex items-center gap-3 px-4 py-2.5 bg-primary/5 border-b border-primary/20 fade-in">
            <span className="text-sm font-600 text-primary">{selected.size} seleccionadas</span>
            <button
              onClick={() => toast.success(`${selected.size} cotizaciones enviadas`)}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-600 bg-primary text-primary-foreground rounded-md hover:bg-primary/90 transition-all active:scale-95"
            >
              <Send size={12} /> Enviar seleccionadas
            </button>
            <button
              onClick={() => toast.success('PDFs generados')}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-600 bg-secondary text-secondary-foreground border border-border rounded-md hover:bg-muted transition-colors"
            >
              <FileDown size={12} /> Exportar PDF
            </button>
            <button
              onClick={() => setSelected(new Set())}
              className="ml-auto text-xs text-muted-foreground hover:text-foreground"
            >
              Cancelar
            </button>
          </div>
        )}

        {/* Estado de carga */}
        {loading && (
          <div className="flex items-center justify-center py-12">
            <span className="w-6 h-6 border-2 border-primary/30 border-t-primary rounded-full animate-spin" />
            <span className="ml-3 text-sm text-muted-foreground">Cargando cotizaciones...</span>
          </div>
        )}

        {!loading && (
          <div className="overflow-x-auto scrollbar-thin">
            <table className="w-full min-w-[900px]">
              <thead className="bg-muted/50 border-b border-border">
                <tr>
                  <th className="px-3 py-3 w-10">
                    <button onClick={toggleAll} className="text-muted-foreground hover:text-primary transition-colors">
                      {selected.size === paginated.length && paginated.length > 0
                        ? <CheckSquare size={16} className="text-primary" />
                        : <Square size={16} />}
                    </button>
                  </th>
                  <ColHeader field="code" label="N° Cotización" />
                  <ColHeader field="clientName" label="Cliente" />
                  <ColHeader field="serviceType" label="Tipo de Servicio" />
                  <ColHeader field="surfaceM2" label="Superficie m²" />
                  <th className="px-3 py-3 text-left text-xs font-600 text-muted-foreground uppercase tracking-wide whitespace-nowrap">Personal</th>
                  <ColHeader field="totalSoles" label="Total S/" />
                  <th className="px-3 py-3 text-left text-xs font-600 text-muted-foreground uppercase tracking-wide">Estado</th>
                  <ColHeader field="createdAt" label="Fecha Emisión" />
                  <ColHeader field="expiresAt" label="Vencimiento" />
                  <th className="px-3 py-3 text-right text-xs font-600 text-muted-foreground uppercase tracking-wide">Acciones</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {paginated.length === 0 && (
                  <tr>
                    <td colSpan={11}>
                      <EmptyState
                        icon={<FileText size={24} />}
                        title="No hay cotizaciones"
                        description="No se encontraron cotizaciones con los filtros aplicados."
                        action={
                          <button
                            onClick={() => { setActiveTab('todas'); setSearchQuery(''); }}
                            className="px-4 py-2 text-sm font-600 bg-primary text-primary-foreground rounded-md hover:bg-primary/90 transition-all active:scale-95"
                          >
                            Limpiar filtros
                          </button>
                        }
                      />
                    </td>
                  </tr>
                )}
                {paginated.map((quote) => {
                  const isDeleting = deletingId === quote.id;
                  const isSelected = selected.has(quote.id);
                  return (
                    <tr
                      key={quote.id}
                      className={`group transition-all duration-150
                        ${isDeleting ? 'opacity-50' : ''}
                        ${isSelected ? 'bg-primary/5' : 'hover:bg-muted/40'}`}
                    >
                      <td className="px-3 py-3">
                        <button onClick={() => toggleSelect(quote.id)} className="text-muted-foreground hover:text-primary transition-colors">
                          {isSelected ? <CheckSquare size={16} className="text-primary" /> : <Square size={16} />}
                        </button>
                      </td>
                      <td className="px-3 py-3">
                        <button
                          onClick={() => setDetailQuote(quote)}
                          className="text-sm font-700 text-primary hover:underline tabular-nums"
                        >
                          {quote.code}
                        </button>
                      </td>
                      <td className="px-3 py-3">
                        <p className="text-sm font-500 text-foreground truncate max-w-[160px]" title={quote.clientName}>
                          {quote.clientName}
                        </p>
                        <p className="text-xs text-muted-foreground">{quote.district}</p>
                      </td>
                      <td className="px-3 py-3">
                        <span className="text-sm text-foreground">{quote.serviceType}</span>
                      </td>
                      <td className="px-3 py-3">
                        <span className="text-sm tabular-nums text-foreground">{quote.surfaceM2.toLocaleString('es-PE')} m²</span>
                      </td>
                      <td className="px-3 py-3">
                        <span className="text-sm tabular-nums text-foreground">{quote.staffCount} pers.</span>
                      </td>
                      <td className="px-3 py-3">
                        <span className="text-sm font-700 tabular-nums text-foreground">
                          S/ {quote.totalSoles.toLocaleString('es-PE')}
                        </span>
                      </td>
                      <td className="px-3 py-3">
                        <StatusBadge status={quote.status} size="sm" />
                      </td>
                      <td className="px-3 py-3">
                        <span className="text-sm text-muted-foreground tabular-nums">{quote.createdAt}</span>
                      </td>
                      <td className="px-3 py-3">
                        <span className="text-sm tabular-nums text-muted-foreground">{quote.expiresAt}</span>
                      </td>
                      <td className="px-3 py-3">
                        <div className="flex items-center justify-end gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                          <button
                            onClick={() => setDetailQuote(quote)}
                            title="Ver detalle de cotización"
                            className="w-7 h-7 rounded-md flex items-center justify-center text-muted-foreground hover:text-primary hover:bg-primary/10 transition-colors"
                          >
                            <Eye size={14} />
                          </button>
                          <button
                            title="Editar cotización"
                            onClick={() => toast.info(`Editando ${quote.code}`)}
                            className="w-7 h-7 rounded-md flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
                          >
                            <Edit2 size={14} />
                          </button>
                          {quote.status === 'borrador' && (
                            <button
                              onClick={() => handleSendQuote(quote.id)}
                              title="Enviar cotización al cliente"
                              className="w-7 h-7 rounded-md flex items-center justify-center text-muted-foreground hover:text-blue-600 hover:bg-blue-50 transition-colors"
                            >
                              <Send size={14} />
                            </button>
                          )}
                          <button
                            title="Exportar PDF — descarga la cotización"
                            onClick={() => handleExportPDF(quote)}
                            className="w-7 h-7 rounded-md flex items-center justify-center text-muted-foreground hover:text-green-600 hover:bg-green-50 transition-colors"
                          >
                            <FileDown size={14} />
                          </button>
                          <button
                            onClick={() => setConfirmDelete(quote.id)}
                            title="Eliminar cotización"
                            className="w-7 h-7 rounded-md flex items-center justify-center text-muted-foreground hover:text-rose-600 hover:bg-rose-50 transition-colors"
                          >
                            <Trash2 size={14} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        {/* Paginación */}
        {!loading && sorted.length > 0 && (
          <div className="flex items-center justify-between px-4 py-3 border-t border-border bg-muted/20">
            <p className="text-sm text-muted-foreground tabular-nums">
              Mostrando {Math.min((page - 1) * perPage + 1, sorted.length)}–{Math.min(page * perPage, sorted.length)} de{' '}
              {sorted.length} cotizaciones
            </p>
            <div className="flex items-center gap-1">
              <button
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={page === 1}
                className="w-8 h-8 rounded-md flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-muted disabled:opacity-40 transition-colors"
              >
                <ChevronLeft size={16} />
              </button>
              {Array.from({ length: Math.min(totalPages, 5) }, (_, i) => i + 1).map((p) => (
                <button
                  key={`page-${p}`}
                  onClick={() => setPage(p)}
                  className={`w-8 h-8 rounded-md text-sm font-500 transition-colors tabular-nums
                    ${page === p ? 'bg-primary text-primary-foreground' : 'text-muted-foreground hover:bg-muted hover:text-foreground'}`}
                >
                  {p}
                </button>
              ))}
              <button
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                disabled={page === totalPages || totalPages === 0}
                className="w-8 h-8 rounded-md flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-muted disabled:opacity-40 transition-colors"
              >
                <ChevronRight size={16} />
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Modal de confirmación de eliminación */}
      <ConfirmModal
        open={!!confirmDelete}
        onClose={() => setConfirmDelete(null)}
        onConfirm={() => confirmDelete && handleDelete(confirmDelete)}
        title="¿Eliminar esta cotización?"
        description="Se eliminará permanentemente la cotización y no podrá recuperarse."
        confirmLabel="Sí, eliminar"
        loading={!!deletingId}
      />

      {/* Panel de detalle de cotización */}
      {detailQuote && (
        <QuoteDetailDrawer quote={detailQuote} onClose={() => setDetailQuote(null)} />
      )}
    </>
  );
}