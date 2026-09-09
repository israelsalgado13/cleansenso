'use client';

/**
 * Tabla principal del módulo de Clientes
 * Conectada a Supabase con CRUD completo en tiempo real
 * Incluye: búsqueda funcional, filtros por estado/tipo, exportar, editar, eliminar
 */

import React, { useState, useEffect, useCallback } from 'react';
import {
  Search, SlidersHorizontal, Plus, Eye, Edit2, Trash2,
  Phone, Mail, ChevronUp, ChevronDown, ChevronLeft, ChevronRight,
  CheckSquare, Square, Building2, User, Download, X,
} from 'lucide-react';
import StatusBadge from '@/components/ui/StatusBadge';
import ConfirmModal from '@/components/ui/ConfirmModal';
import EmptyState from '@/components/ui/EmptyState';
import { Users } from 'lucide-react';
import { toast } from 'sonner';
import CreateClientDrawer from './CreateClientDrawer';
import ClientDetailPanel from './ClientDetailPanel';
import { createClient } from '@/lib/supabase/client';

// ── Tipos de datos ─────────────────────────────────────────────────────────────

export type ClientStatus = 'activo' | 'inactivo' | 'prospecto';
export type ClientType = 'empresa' | 'persona_natural';

export interface Client {
  id: string;
  code: string;
  name: string;
  docType: 'RUC' | 'DNI';
  docNumber: string;
  type: ClientType;
  district: string;
  phone: string;
  email: string;
  status: ClientStatus;
  totalQuotes: number;
  lastServiceDate: string;
  contactName: string;
  address: string;
  registeredAt: string;
}

type SortField = 'name' | 'code' | 'district' | 'totalQuotes' | 'registeredAt';
type SortDir = 'asc' | 'desc';

/**
 * Convierte un registro de Supabase al formato Client del frontend
 */
function mapClient(row: any): Client {
  return {
    id: row.id,
    code: row.code,
    name: row.name,
    docType: row.doc_type as 'RUC' | 'DNI',
    docNumber: row.doc_number,
    type: row.client_type as ClientType,
    district: row.district,
    phone: row.phone,
    email: row.email,
    status: row.status as ClientStatus,
    totalQuotes: row.total_quotes || 0,
    lastServiceDate: row.last_service_date || '—',
    contactName: row.contact_name,
    address: row.address,
    registeredAt: row.created_at ? new Date(row.created_at).toLocaleDateString('es-PE') : '',
  };
}

export default function ClientTableClient() {
  const supabase = createClient();

  // Estado de la tabla
  const [clients, setClients] = useState<Client[]>([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [sortField, setSortField] = useState<SortField>('name');
  const [sortDir, setSortDir] = useState<SortDir>('asc');
  const [page, setPage] = useState(1);
  const [perPage] = useState(10);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null);
  const [detailClient, setDetailClient] = useState<Client | null>(null);
  const [showCreate, setShowCreate] = useState(false);
  const [editClient, setEditClient] = useState<Client | null>(null);

  // Estado de filtros
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<ClientStatus | 'todos'>('todos');
  const [typeFilter, setTypeFilter] = useState<ClientType | 'todos'>('todos');
  const [showFilters, setShowFilters] = useState(false);

  /**
   * Carga los clientes desde Supabase
   */
  const loadClients = useCallback(async () => {
    try {
      const { data, error } = await supabase
        .from('clients')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Error cargando clientes:', error.message);
        return;
      }
      setClients((data || []).map(mapClient));
    } catch (err) {
      console.error('Error inesperado:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadClients();

    // Suscripción en tiempo real
    const channel = supabase
      .channel('clients_table')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'clients' }, loadClients)
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [loadClients]);

  // ── Filtrado y ordenamiento ──────────────────────────────────────────────────

  const filtered = clients.filter((c) => {
    const query = searchQuery.toLowerCase();
    const matchesSearch = !query ||
      c.name.toLowerCase().includes(query) ||
      c.code.toLowerCase().includes(query) ||
      c.email.toLowerCase().includes(query) ||
      c.phone.toLowerCase().includes(query) ||
      c.docNumber.toLowerCase().includes(query) ||
      c.district.toLowerCase().includes(query) ||
      c.contactName.toLowerCase().includes(query);

    const matchesStatus = statusFilter === 'todos' || c.status === statusFilter;
    const matchesType = typeFilter === 'todos' || c.type === typeFilter;

    return matchesSearch && matchesStatus && matchesType;
  });

  const sorted = [...filtered].sort((a, b) => {
    let av: string | number = a[sortField] ?? '';
    let bv: string | number = b[sortField] ?? '';
    if (sortField === 'totalQuotes') { av = Number(av); bv = Number(bv); }
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
    else setSelected(new Set(paginated.map((c) => c.id)));
  };

  // ── Acciones CRUD ────────────────────────────────────────────────────────────

  /**
   * Elimina un cliente de la base de datos
   */
  const handleDelete = async (id: string) => {
    setDeletingId(id);
    try {
      const { error } = await supabase.from('clients').delete().eq('id', id);
      if (error) {
        toast.error('Error al eliminar el cliente: ' + error.message);
        return;
      }
      setClients((prev) => prev.filter((c) => c.id !== id));
      setConfirmDelete(null);
      toast.success('Cliente eliminado correctamente');
    } catch {
      toast.error('Error inesperado al eliminar');
    } finally {
      setDeletingId(null);
    }
  };

  /**
   * Exporta la lista de clientes filtrada a CSV
   */
  const handleExport = () => {
    const headers = ['Código', 'Nombre', 'Tipo Doc.', 'N° Doc.', 'Tipo', 'Distrito', 'Teléfono', 'Email', 'Estado', 'Cotizaciones'];
    const rows = filtered.map(c => [
      c.code, c.name, c.docType, c.docNumber,
      c.type === 'empresa' ? 'Empresa' : 'Persona Natural',
      c.district, c.phone, c.email, c.status, String(c.totalQuotes),
    ]);
    const csv = [headers, ...rows].map(r => r.map(v => `"${v}"`).join(',')).join('\n');
    const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `clientes_cleansenso_${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success('Lista de clientes exportada correctamente');
  };

  // ── Componentes de UI ────────────────────────────────────────────────────────

  const SortIcon = ({ field }: { field: SortField }) => {
    if (sortField !== field) return <ChevronUp size={12} className="text-muted-foreground opacity-30" />;
    return sortDir === 'asc'
      ? <ChevronUp size={12} className="text-primary" />
      : <ChevronDown size={12} className="text-primary" />;
  };

  const ColHeader = ({ field, label }: { field: SortField; label: string }) => (
    <th className="px-3 py-3 text-left text-xs font-600 text-muted-foreground uppercase tracking-wide cursor-pointer hover:text-foreground select-none whitespace-nowrap"
      onClick={() => toggleSort(field)}>
      <span className="flex items-center gap-1">{label}<SortIcon field={field} /></span>
    </th>
  );

  return (
    <>
      {/* Barra de herramientas: búsqueda, filtros y acciones */}
      <div className="space-y-3 mb-4">
        <div className="flex items-center gap-2">
          {/* Búsqueda funcional en tiempo real */}
          <div className="relative flex-1">
            <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => { setSearchQuery(e.target.value); setPage(1); }}
              placeholder="Buscar por nombre, código, email, teléfono, distrito..."
              className="w-full pl-9 pr-3 py-2 text-sm bg-card border border-input rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary transition-colors"
            />
            {searchQuery && (
              <button onClick={() => setSearchQuery('')} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground">
                <X size={14} />
              </button>
            )}
          </div>

          {/* Botón de más filtros */}
          <button
            onClick={() => setShowFilters(!showFilters)}
            className={`flex items-center gap-1.5 px-3 py-2 text-sm font-500 border rounded-lg transition-colors ${
              showFilters || statusFilter !== 'todos' || typeFilter !== 'todos'
                ? 'bg-primary/10 text-primary border-primary/30' :'text-secondary-foreground bg-card border-border hover:bg-muted'
            }`}
          >
            <SlidersHorizontal size={14} />
            <span className="hidden sm:inline">Más Filtros</span>
            {(statusFilter !== 'todos' || typeFilter !== 'todos') && (
              <span className="w-2 h-2 rounded-full bg-primary" />
            )}
          </button>

          {/* Exportar CSV */}
          <button
            onClick={handleExport}
            className="flex items-center gap-1.5 px-3 py-2 text-sm font-500 text-secondary-foreground bg-card border border-border rounded-lg hover:bg-muted transition-colors"
          >
            <Download size={14} />
            <span className="hidden sm:inline">Exportar</span>
          </button>

          {/* Nuevo cliente */}
          <button
            onClick={() => setShowCreate(true)}
            className="flex items-center gap-1.5 px-3 py-2 text-sm font-600 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-all active:scale-95"
          >
            <Plus size={14} />
            <span className="hidden sm:inline">Nuevo Cliente</span>
          </button>
        </div>

        {/* Panel de filtros adicionales */}
        {showFilters && (
          <div className="flex items-center gap-3 p-3 bg-muted/40 border border-border rounded-lg">
            <div className="flex items-center gap-2">
              <span className="text-xs font-600 text-muted-foreground uppercase tracking-wide">Estado:</span>
              {(['todos', 'activo', 'inactivo', 'prospecto'] as const).map((s) => (
                <button key={s} onClick={() => { setStatusFilter(s); setPage(1); }}
                  className={`px-2.5 py-1 rounded-md text-xs font-500 transition-all ${
                    statusFilter === s ? 'bg-primary text-primary-foreground' : 'bg-card border border-border text-muted-foreground hover:text-foreground'
                  }`}>
                  {s === 'todos' ? 'Todos' : s.charAt(0).toUpperCase() + s.slice(1)}
                </button>
              ))}
            </div>
            <div className="w-px h-5 bg-border" />
            <div className="flex items-center gap-2">
              <span className="text-xs font-600 text-muted-foreground uppercase tracking-wide">Tipo:</span>
              {(['todos', 'empresa', 'persona_natural'] as const).map((t) => (
                <button key={t} onClick={() => { setTypeFilter(t); setPage(1); }}
                  className={`px-2.5 py-1 rounded-md text-xs font-500 transition-all ${
                    typeFilter === t ? 'bg-primary text-primary-foreground' : 'bg-card border border-border text-muted-foreground hover:text-foreground'
                  }`}>
                  {t === 'todos' ? 'Todos' : t === 'empresa' ? 'Empresa' : 'Persona Natural'}
                </button>
              ))}
            </div>
            {(statusFilter !== 'todos' || typeFilter !== 'todos') && (
              <button onClick={() => { setStatusFilter('todos'); setTypeFilter('todos'); }}
                className="ml-auto text-xs text-muted-foreground hover:text-foreground flex items-center gap-1">
                <X size={12} /> Limpiar
              </button>
            )}
          </div>
        )}
      </div>

      <div className="bg-card border border-border rounded-xl overflow-hidden">
        {/* Barra de acciones masivas */}
        {selected.size > 0 && (
          <div className="flex items-center gap-3 px-4 py-2.5 bg-primary/5 border-b border-primary/20">
            <span className="text-sm font-600 text-primary">{selected.size} seleccionados</span>
            <button onClick={handleExport}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-600 bg-secondary text-secondary-foreground border border-border rounded-md hover:bg-muted transition-colors">
              <Download size={12} /> Exportar seleccionados
            </button>
            <button onClick={() => setSelected(new Set())}
              className="ml-auto text-xs text-muted-foreground hover:text-foreground">
              Cancelar
            </button>
          </div>
        )}

        {/* Estado de carga */}
        {loading && (
          <div className="flex items-center justify-center py-12">
            <span className="w-6 h-6 border-2 border-primary/30 border-t-primary rounded-full animate-spin" />
            <span className="ml-3 text-sm text-muted-foreground">Cargando clientes...</span>
          </div>
        )}

        {!loading && (
          <div className="overflow-x-auto scrollbar-thin">
            <table className="w-full min-w-[800px]">
              <thead className="bg-muted/50 border-b border-border">
                <tr>
                  <th className="px-3 py-3 w-10">
                    <button onClick={toggleAll} className="text-muted-foreground hover:text-primary transition-colors">
                      {selected.size === paginated.length && paginated.length > 0
                        ? <CheckSquare size={16} className="text-primary" />
                        : <Square size={16} />}
                    </button>
                  </th>
                  <ColHeader field="code" label="Código" />
                  <ColHeader field="name" label="Cliente" />
                  <th className="px-3 py-3 text-left text-xs font-600 text-muted-foreground uppercase tracking-wide whitespace-nowrap">Documento</th>
                  <ColHeader field="district" label="Distrito" />
                  <th className="px-3 py-3 text-left text-xs font-600 text-muted-foreground uppercase tracking-wide">Contacto</th>
                  <th className="px-3 py-3 text-left text-xs font-600 text-muted-foreground uppercase tracking-wide">Estado</th>
                  <ColHeader field="totalQuotes" label="Cotizaciones" />
                  <ColHeader field="registeredAt" label="Registro" />
                  <th className="px-3 py-3 text-right text-xs font-600 text-muted-foreground uppercase tracking-wide">Acciones</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {paginated.length === 0 && (
                  <tr>
                    <td colSpan={10}>
                      <EmptyState
                        icon={<Users size={24} />}
                        title="No hay clientes"
                        description="No se encontraron clientes con los filtros aplicados."
                        action={
                          <button onClick={() => { setSearchQuery(''); setStatusFilter('todos'); setTypeFilter('todos'); }}
                            className="px-4 py-2 text-sm font-600 bg-primary text-primary-foreground rounded-md hover:bg-primary/90 transition-all active:scale-95">
                            Limpiar filtros
                          </button>
                        }
                      />
                    </td>
                  </tr>
                )}
                {paginated.map((client) => {
                  const isSelected = selected.has(client.id);
                  return (
                    <tr key={client.id}
                      className={`group transition-all duration-150 ${isSelected ? 'bg-primary/5' : 'hover:bg-muted/40'}`}>
                      <td className="px-3 py-3">
                        <button onClick={() => toggleSelect(client.id)} className="text-muted-foreground hover:text-primary transition-colors">
                          {isSelected ? <CheckSquare size={16} className="text-primary" /> : <Square size={16} />}
                        </button>
                      </td>
                      <td className="px-3 py-3">
                        <span className="text-xs font-700 text-muted-foreground tabular-nums">{client.code}</span>
                      </td>
                      <td className="px-3 py-3">
                        <div className="flex items-center gap-2">
                          <div className="w-7 h-7 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                            {client.type === 'empresa'
                              ? <Building2 size={13} className="text-primary" />
                              : <User size={13} className="text-primary" />}
                          </div>
                          <div>
                            <p className="text-sm font-600 text-foreground truncate max-w-[160px]" title={client.name}>
                              {client.name}
                            </p>
                            <p className="text-xs text-muted-foreground">
                              {client.type === 'empresa' ? 'Empresa' : 'Persona Natural'}
                            </p>
                          </div>
                        </div>
                      </td>
                      <td className="px-3 py-3">
                        <span className="text-xs font-600 text-muted-foreground">{client.docType}</span>
                        <p className="text-sm tabular-nums text-foreground">{client.docNumber}</p>
                      </td>
                      <td className="px-3 py-3">
                        <span className="text-sm text-foreground">{client.district}</span>
                      </td>
                      <td className="px-3 py-3">
                        <div className="space-y-0.5">
                          <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                            <Phone size={11} />{client.phone}
                          </div>
                          <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                            <Mail size={11} /><span className="truncate max-w-[140px]">{client.email}</span>
                          </div>
                        </div>
                      </td>
                      <td className="px-3 py-3">
                        <StatusBadge status={client.status} size="sm" />
                      </td>
                      <td className="px-3 py-3">
                        <span className="text-sm tabular-nums text-foreground">{client.totalQuotes}</span>
                      </td>
                      <td className="px-3 py-3">
                        <span className="text-sm text-muted-foreground tabular-nums">{client.registeredAt}</span>
                      </td>
                      <td className="px-3 py-3">
                        <div className="flex items-center justify-end gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                          <button onClick={() => setDetailClient(client)} title="Ver detalle"
                            className="w-7 h-7 rounded-md flex items-center justify-center text-muted-foreground hover:text-primary hover:bg-primary/10 transition-colors">
                            <Eye size={14} />
                          </button>
                          <button onClick={() => { setEditClient(client); setShowCreate(true); }} title="Editar cliente"
                            className="w-7 h-7 rounded-md flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-muted transition-colors">
                            <Edit2 size={14} />
                          </button>
                          <button onClick={() => setConfirmDelete(client.id)} title="Eliminar cliente"
                            className="w-7 h-7 rounded-md flex items-center justify-center text-muted-foreground hover:text-rose-600 hover:bg-rose-50 transition-colors">
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
              Mostrando {Math.min((page - 1) * perPage + 1, sorted.length)}–{Math.min(page * perPage, sorted.length)} de {sorted.length} clientes
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

      {/* Modales y paneles */}
      <ConfirmModal
        open={!!confirmDelete}
        onClose={() => setConfirmDelete(null)}
        onConfirm={() => confirmDelete && handleDelete(confirmDelete)}
        title="¿Eliminar este cliente?"
        description="Se eliminará permanentemente el cliente y todos sus datos asociados."
        confirmLabel="Sí, eliminar"
        loading={!!deletingId}
      />

      {detailClient && (
        <ClientDetailPanel client={detailClient} onClose={() => setDetailClient(null)} />
      )}

      <CreateClientDrawer
        open={showCreate}
        onClose={() => { setShowCreate(false); setEditClient(null); }}
        editClient={editClient}
        onSaved={loadClients}
      />
    </>
  );
}