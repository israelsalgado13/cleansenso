'use client';

/**
 * Módulo de Servicios — Catálogo completo de servicios de CleanSenso
 * Conectado a Supabase con CRUD completo
 * Incluye: lista de servicios, crear, editar, activar/desactivar, eliminar
 */

import React, { useState, useEffect, useCallback } from 'react';
import AppLayout from '@/components/AppLayout';
import { createClient } from '@/lib/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Plus, Edit2, Trash2, CheckCircle, XCircle, Search, Wrench, DollarSign, Clock, Users, ChevronDown, ChevronUp, X,  } from 'lucide-react';
import ConfirmModal from '@/components/ui/ConfirmModal';
import { toast } from 'sonner';

// ── Tipos de datos ─────────────────────────────────────────────────────────────

type ServiceStatus = 'activo' | 'inactivo' | 'en_revision';
type ServiceCategory = 'limpieza_general' | 'limpieza_especializada' | 'desinfeccion' | 'lavado' | 'mantenimiento';

interface Service {
  id: string;
  code: string;
  name: string;
  description: string;
  category: ServiceCategory;
  basePriceM2: number;
  minSurfaceM2: number;
  staffPer100m2: number;
  durationHours: number;
  status: ServiceStatus;
  includes: string[];
}

// Etiquetas de categoría en español
const categoryLabels: Record<ServiceCategory, string> = {
  limpieza_general: 'Limpieza General',
  limpieza_especializada: 'Limpieza Especializada',
  desinfeccion: 'Desinfección',
  lavado: 'Lavado',
  mantenimiento: 'Mantenimiento',
};

// Colores por categoría
const categoryColors: Record<ServiceCategory, string> = {
  limpieza_general: 'bg-blue-50 text-blue-700 border-blue-200',
  limpieza_especializada: 'bg-violet-50 text-violet-700 border-violet-200',
  desinfeccion: 'bg-rose-50 text-rose-700 border-rose-200',
  lavado: 'bg-emerald-50 text-emerald-700 border-emerald-200',
  mantenimiento: 'bg-amber-50 text-amber-700 border-amber-200',
};

/**
 * Convierte un registro de Supabase al formato Service del frontend
 */
function mapService(row: any): Service {
  return {
    id: row.id,
    code: row.code,
    name: row.name,
    description: row.description || '',
    category: row.category as ServiceCategory,
    basePriceM2: Number(row.base_price_m2) || 0,
    minSurfaceM2: Number(row.min_surface_m2) || 1,
    staffPer100m2: row.staff_per_100m2 || 1,
    durationHours: Number(row.duration_hours) || 2,
    status: row.status as ServiceStatus,
    includes: row.includes || [],
  };
}

// ── Formulario de servicio ─────────────────────────────────────────────────────

interface ServiceFormProps {
  service?: Service | null;
  onSave: (data: any) => void;
  onCancel: () => void;
  loading: boolean;
}

function ServiceForm({ service, onSave, onCancel, loading }: ServiceFormProps) {
  const [name, setName] = useState(service?.name || '');
  const [description, setDescription] = useState(service?.description || '');
  const [category, setCategory] = useState<ServiceCategory>(service?.category || 'limpieza_general');
  const [basePriceM2, setBasePriceM2] = useState(String(service?.basePriceM2 || ''));
  const [minSurfaceM2, setMinSurfaceM2] = useState(String(service?.minSurfaceM2 || '1'));
  const [durationHours, setDurationHours] = useState(String(service?.durationHours || '2'));
  const [includesText, setIncludesText] = useState(service?.includes?.join('\n') || '');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) { toast.error('El nombre del servicio es requerido'); return; }
    if (Number(basePriceM2) <= 0) { toast.error('El precio base debe ser mayor a 0'); return; }
    onSave({
      name: name.trim(),
      description: description.trim(),
      category,
      base_price_m2: Number(basePriceM2),
      min_surface_m2: Number(minSurfaceM2) || 1,
      duration_hours: Number(durationHours) || 2,
      includes: includesText.split('\n').map(s => s.trim()).filter(Boolean),
    });
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="grid grid-cols-2 gap-4">
        <div className="col-span-2">
          <label className="block text-sm font-600 text-foreground mb-1">Nombre del Servicio *</label>
          <input type="text" value={name} onChange={e => setName(e.target.value)}
            className="w-full px-3 py-2 text-sm bg-background border border-input rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/30"
            placeholder="Limpieza de Oficinas" />
        </div>
        <div>
          <label className="block text-sm font-600 text-foreground mb-1">Categoría</label>
          <select value={category} onChange={e => setCategory(e.target.value as ServiceCategory)}
            className="w-full px-3 py-2 text-sm bg-background border border-input rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/30">
            {Object.entries(categoryLabels).map(([v, l]) => <option key={v} value={v}>{l}</option>)}
          </select>
        </div>
        <div>
          <label className="block text-sm font-600 text-foreground mb-1">Precio Base (S/ por m²) *</label>
          <input type="number" min="0.01" step="0.01" value={basePriceM2} onChange={e => setBasePriceM2(e.target.value)}
            className="w-full px-3 py-2 text-sm bg-background border border-input rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/30 tabular-nums"
            placeholder="2.50" />
        </div>
        <div>
          <label className="block text-sm font-600 text-foreground mb-1">Superficie Mínima (m²)</label>
          <input type="number" min="1" value={minSurfaceM2} onChange={e => setMinSurfaceM2(e.target.value)}
            className="w-full px-3 py-2 text-sm bg-background border border-input rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/30 tabular-nums"
            placeholder="1" />
        </div>
        <div>
          <label className="block text-sm font-600 text-foreground mb-1">Duración Estimada (horas)</label>
          <input type="number" min="0.5" step="0.5" value={durationHours} onChange={e => setDurationHours(e.target.value)}
            className="w-full px-3 py-2 text-sm bg-background border border-input rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/30 tabular-nums"
            placeholder="2" />
        </div>
        <div className="col-span-2">
          <label className="block text-sm font-600 text-foreground mb-1">Descripción</label>
          <textarea rows={2} value={description} onChange={e => setDescription(e.target.value)}
            className="w-full px-3 py-2 text-sm bg-background border border-input rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/30 resize-none"
            placeholder="Descripción del servicio..." />
        </div>
        <div className="col-span-2">
          <label className="block text-sm font-600 text-foreground mb-1">Incluye (una por línea)</label>
          <textarea rows={3} value={includesText} onChange={e => setIncludesText(e.target.value)}
            className="w-full px-3 py-2 text-sm bg-background border border-input rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/30 resize-none"
            placeholder="Limpieza de pisos&#10;Desinfección de baños&#10;Vaciado de papeleras" />
        </div>
      </div>
      <div className="flex items-center gap-3 pt-2">
        <button type="button" onClick={onCancel}
          className="flex-1 px-4 py-2 text-sm font-500 text-secondary-foreground bg-secondary border border-border rounded-lg hover:bg-muted transition-colors">
          Cancelar
        </button>
        <button type="submit" disabled={loading}
          className="flex-1 flex items-center justify-center gap-2 px-4 py-2 text-sm font-600 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 disabled:opacity-60 transition-all active:scale-95">
          {loading ? <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : null}
          {loading ? 'Guardando...' : service ? 'Actualizar Servicio' : 'Crear Servicio'}
        </button>
      </div>
    </form>
  );
}

// ── Página principal de Servicios ──────────────────────────────────────────────

export default function ServicesPage() {
  const { user } = useAuth();
  const supabase = createClient();

  const [services, setServices] = useState<Service[]>([]);
  const [loading, setLoading] = useState(true);
  const [savingId, setSavingId] = useState<string | null>(null);
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [editService, setEditService] = useState<Service | null>(null);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<ServiceStatus | 'todos'>('todos');

  /**
   * Carga los servicios del catálogo desde Supabase
   */
  const loadServices = useCallback(async () => {
    try {
      const { data, error } = await supabase
        .from('services')
        .select('*')
        .order('created_at', { ascending: false });
      if (error) { console.error('Error cargando servicios:', error.message); return; }
      setServices((data || []).map(mapService));
    } catch (err) {
      console.error('Error inesperado:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadServices();
    const channel = supabase
      .channel('services_table')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'services' }, loadServices)
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [loadServices]);

  // Filtrado de servicios
  const filtered = services.filter(s => {
    const query = searchQuery.toLowerCase();
    const matchesSearch = !query || s.name.toLowerCase().includes(query) || s.description.toLowerCase().includes(query);
    const matchesStatus = statusFilter === 'todos' || s.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  /**
   * Guarda un servicio nuevo o actualiza uno existente
   */
  const handleSave = async (formData: any) => {
    setSavingId('new');
    try {
      if (editService) {
        const { error } = await supabase.from('services').update(formData).eq('id', editService.id);
        if (error) { toast.error('Error al actualizar: ' + error.message); return; }
        toast.success('Servicio actualizado correctamente');
      } else {
        const code = `SVC-${String(services.length + 1).padStart(3, '0')}`;
        const { error } = await supabase.from('services').insert({
          ...formData, code, status: 'activo', created_by: user?.id || null,
        });
        if (error) { toast.error('Error al crear: ' + error.message); return; }
        toast.success('Servicio creado correctamente');
      }
      setShowForm(false);
      setEditService(null);
      loadServices();
    } catch { toast.error('Error inesperado'); }
    finally { setSavingId(null); }
  };

  /**
   * Cambia el estado activo/inactivo de un servicio
   */
  const handleToggleStatus = async (service: Service) => {
    const newStatus = service.status === 'activo' ? 'inactivo' : 'activo';
    try {
      const { error } = await supabase.from('services').update({ status: newStatus }).eq('id', service.id);
      if (error) { toast.error('Error al cambiar estado'); return; }
      setServices(prev => prev.map(s => s.id === service.id ? { ...s, status: newStatus } : s));
      toast.success(`Servicio ${newStatus === 'activo' ? 'activado' : 'desactivado'}`);
    } catch { toast.error('Error inesperado'); }
  };

  /**
   * Elimina un servicio del catálogo
   */
  const handleDelete = async (id: string) => {
    setDeletingId(id);
    try {
      const { error } = await supabase.from('services').delete().eq('id', id);
      if (error) { toast.error('Error al eliminar: ' + error.message); return; }
      setServices(prev => prev.filter(s => s.id !== id));
      setConfirmDelete(null);
      toast.success('Servicio eliminado del catálogo');
    } catch { toast.error('Error inesperado'); }
    finally { setDeletingId(null); }
  };

  return (
    <AppLayout
      title="Catálogo de Servicios"
      subtitle="— Gestiona los servicios que ofrece CleanSenso"
      actions={
        <button onClick={() => { setEditService(null); setShowForm(true); }}
          className="flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground text-sm font-600 rounded-lg hover:bg-primary/90 transition-all active:scale-95">
          <Plus size={16} /> Nuevo Servicio
        </button>
      }
    >
      {/* Formulario de creación/edición */}
      {showForm && (
        <div className="bg-card border border-border rounded-xl p-5 mb-6">
          <h3 className="text-sm font-700 text-foreground mb-4">
            {editService ? `Editando: ${editService.name}` : 'Nuevo Servicio'}
          </h3>
          <ServiceForm
            service={editService}
            onSave={handleSave}
            onCancel={() => { setShowForm(false); setEditService(null); }}
            loading={savingId === 'new'}
          />
        </div>
      )}

      {/* Barra de búsqueda y filtros */}
      <div className="flex items-center gap-2 mb-4">
        <div className="relative flex-1">
          <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <input type="text" value={searchQuery} onChange={e => setSearchQuery(e.target.value)}
            placeholder="Buscar servicios..."
            className="w-full pl-9 pr-3 py-2 text-sm bg-card border border-input rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/30" />
          {searchQuery && <button onClick={() => setSearchQuery('')} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"><X size={14} /></button>}
        </div>
        {(['todos', 'activo', 'inactivo', 'en_revision'] as const).map(s => (
          <button key={s} onClick={() => setStatusFilter(s)}
            className={`px-3 py-2 rounded-lg text-xs font-500 border transition-all ${
              statusFilter === s ? 'bg-primary text-primary-foreground border-primary' : 'bg-card border-border text-muted-foreground hover:text-foreground hover:bg-muted'
            }`}>
            {s === 'todos' ? 'Todos' : s === 'en_revision' ? 'En Revisión' : s.charAt(0).toUpperCase() + s.slice(1)}
          </button>
        ))}
      </div>

      {/* Estado de carga */}
      {loading && (
        <div className="flex items-center justify-center py-12">
          <span className="w-6 h-6 border-2 border-primary/30 border-t-primary rounded-full animate-spin" />
          <span className="ml-3 text-sm text-muted-foreground">Cargando servicios...</span>
        </div>
      )}

      {/* Lista de servicios */}
      {!loading && (
        <div className="space-y-3">
          {filtered.length === 0 && (
            <div className="bg-card border border-border rounded-xl p-12 text-center">
              <Wrench size={32} className="text-muted-foreground mx-auto mb-3" />
              <p className="text-sm font-600 text-foreground">No hay servicios</p>
              <p className="text-xs text-muted-foreground mt-1">Crea el primer servicio del catálogo</p>
            </div>
          )}

          {filtered.map((service) => (
            <div key={service.id}
              className={`bg-card border rounded-xl overflow-hidden transition-all ${
                service.status === 'inactivo' ? 'opacity-60 border-border' : 'border-border hover:border-primary/20'
              }`}>
              {/* Cabecera del servicio */}
              <div className="flex items-center gap-4 p-4">
                <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                  <Wrench size={18} className="text-primary" />
                </div>

                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <p className="text-sm font-700 text-foreground">{service.name}</p>
                    <span className="text-xs text-muted-foreground font-500">{service.code}</span>
                    <span className={`text-[10px] font-600 px-2 py-0.5 rounded-full border ${categoryColors[service.category]}`}>
                      {categoryLabels[service.category]}
                    </span>
                    <span className={`text-[10px] font-600 px-2 py-0.5 rounded-full ${
                      service.status === 'activo' ? 'bg-green-50 text-green-700' :
                      service.status === 'inactivo' ? 'bg-muted text-muted-foreground' :
                      'bg-amber-50 text-amber-700'
                    }`}>
                      {service.status === 'en_revision' ? 'En Revisión' : service.status.charAt(0).toUpperCase() + service.status.slice(1)}
                    </span>
                  </div>
                  <p className="text-xs text-muted-foreground mt-0.5 truncate">{service.description}</p>
                </div>

                {/* Métricas rápidas */}
                <div className="hidden md:flex items-center gap-4 shrink-0">
                  <div className="text-center">
                    <p className="text-sm font-700 text-foreground tabular-nums">S/ {service.basePriceM2.toFixed(2)}</p>
                    <p className="text-[10px] text-muted-foreground">por m²</p>
                  </div>
                  <div className="text-center">
                    <p className="text-sm font-700 text-foreground tabular-nums">{service.minSurfaceM2} m²</p>
                    <p className="text-[10px] text-muted-foreground">mínimo</p>
                  </div>
                  <div className="text-center">
                    <p className="text-sm font-700 text-foreground tabular-nums">{service.durationHours}h</p>
                    <p className="text-[10px] text-muted-foreground">duración</p>
                  </div>
                </div>

                {/* Acciones */}
                <div className="flex items-center gap-1 shrink-0">
                  <button onClick={() => setExpandedId(expandedId === service.id ? null : service.id)}
                    title="Ver detalles"
                    className="w-7 h-7 rounded-md flex items-center justify-center text-muted-foreground hover:text-primary hover:bg-primary/10 transition-colors">
                    {expandedId === service.id ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                  </button>
                  <button onClick={() => { setEditService(service); setShowForm(true); }}
                    title="Editar servicio"
                    className="w-7 h-7 rounded-md flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-muted transition-colors">
                    <Edit2 size={14} />
                  </button>
                  <button onClick={() => handleToggleStatus(service)}
                    title={service.status === 'activo' ? 'Desactivar servicio' : 'Activar servicio'}
                    className={`w-7 h-7 rounded-md flex items-center justify-center transition-colors ${
                      service.status === 'activo' ?'text-muted-foreground hover:text-amber-600 hover:bg-amber-50' :'text-muted-foreground hover:text-green-600 hover:bg-green-50'
                    }`}>
                    {service.status === 'activo' ? <XCircle size={14} /> : <CheckCircle size={14} />}
                  </button>
                  <button onClick={() => setConfirmDelete(service.id)}
                    title="Eliminar servicio"
                    className="w-7 h-7 rounded-md flex items-center justify-center text-muted-foreground hover:text-rose-600 hover:bg-rose-50 transition-colors">
                    <Trash2 size={14} />
                  </button>
                </div>
              </div>

              {/* Detalle expandido */}
              {expandedId === service.id && (
                <div className="border-t border-border px-4 py-3 bg-muted/20">
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-3">
                    <div className="flex items-center gap-2">
                      <DollarSign size={14} className="text-primary" />
                      <div>
                        <p className="text-xs text-muted-foreground">Precio base</p>
                        <p className="text-sm font-600 tabular-nums">S/ {service.basePriceM2.toFixed(2)}/m²</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Wrench size={14} className="text-violet-600" />
                      <div>
                        <p className="text-xs text-muted-foreground">Superficie mín.</p>
                        <p className="text-sm font-600 tabular-nums">{service.minSurfaceM2} m²</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Users size={14} className="text-emerald-600" />
                      <div>
                        <p className="text-xs text-muted-foreground">Personal/100m²</p>
                        <p className="text-sm font-600 tabular-nums">{service.staffPer100m2} operario(s)</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Clock size={14} className="text-orange-500" />
                      <div>
                        <p className="text-xs text-muted-foreground">Duración est.</p>
                        <p className="text-sm font-600 tabular-nums">{service.durationHours} horas</p>
                      </div>
                    </div>
                  </div>
                  {service.includes.length > 0 && (
                    <div>
                      <p className="text-xs font-600 text-muted-foreground uppercase tracking-wide mb-2">Incluye:</p>
                      <div className="flex flex-wrap gap-1.5">
                        {service.includes.map((item, i) => (
                          <span key={i} className="text-xs bg-card border border-border px-2 py-0.5 rounded-full text-foreground">
                            ✓ {item}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Modal de confirmación de eliminación */}
      <ConfirmModal
        open={!!confirmDelete}
        onClose={() => setConfirmDelete(null)}
        onConfirm={() => confirmDelete && handleDelete(confirmDelete)}
        title="¿Eliminar este servicio?"
        description="Se eliminará el servicio del catálogo. Esta acción no se puede deshacer."
        confirmLabel="Sí, eliminar"
        loading={!!deletingId}
      />
    </AppLayout>
  );
}
