'use client';

/**
 * Modal para crear nuevas cotizaciones
 * Incluye validaciones: superficie mínima 1m², fecha no anterior a hoy,
 * cálculo automático de precio, y guardado en Supabase
 */

import React, { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import Modal from '@/components/ui/Modal';
import { toast } from 'sonner';
import { createClient } from '@/lib/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

// ── Tipos del formulario ───────────────────────────────────────────────────────

interface CreateQuoteFormData {
  clientId: string;
  serviceType: string;
  surfaceM2: number;
  roomsCount: number;
  useSurface: 'surface' | 'rooms';
  staffCount: number;
  district: string;
  address: string;
  scheduledDate: string;
  notes: string;
  paymentTerms: string;
  validDays: number;
}

interface CreateQuoteModalProps {
  open: boolean;
  onClose: () => void;
}

interface ClientOption {
  id: string;
  name: string;
}

// ── Constantes ─────────────────────────────────────────────────────────────────

const serviceTypes = [
  'Limpieza de Oficinas', 'Lavado de Alfombras', 'Lavado de Sillones y Sillas',
  'Lavado de Cortinas', 'Desinfección Post-Obra', 'Limpieza de Almacenes',
  'Limpieza de Condominios', 'Limpieza de Pisos', 'Limpieza Institucional',
  'Limpieza de Inmobiliarias',
];

const limaDistricts = [
  'Barranco', 'Cercado de Lima', 'Chorrillos', 'Jesús María', 'La Victoria',
  'Lince', 'Miraflores', 'Pueblo Libre', 'Rímac', 'San Borja',
  'San Isidro', 'San Luis', 'San Miguel', 'Surco', 'Surquillo',
];

// Precio estimado: S/ 2.50 por m² base + S/ 120 por operario
const estimatePrice = (m2: number, staff: number) => {
  const base = m2 * 2.5;
  const staffCost = staff * 120;
  return Math.round(base + staffCost);
};

// Estimación de m² según cantidad de habitaciones (promedio 15m² por habitación)
const roomsToM2 = (rooms: number) => rooms * 15;

// Genera el código de cotización siguiente
const generateCode = () => {
  const year = new Date().getFullYear();
  const num = String(Math.floor(Math.random() * 900) + 100).padStart(3, '0');
  return `COT-${year}-${num}`;
};

// Retorna la fecha mínima permitida (hoy) en formato YYYY-MM-DD
const getTodayString = () => new Date().toISOString().split('T')[0];

export default function CreateQuoteModal({ open, onClose }: CreateQuoteModalProps) {
  const { user } = useAuth();
  const supabase = createClient();
  const [loading, setLoading] = useState(false);
  const [step, setStep] = useState(1);
  const [clients, setClients] = useState<ClientOption[]>([]);
  const [useSurface, setUseSurface] = useState<'surface' | 'rooms'>('surface');

  const {
    register,
    handleSubmit,
    watch,
    formState: { errors },
    reset,
    setValue,
  } = useForm<CreateQuoteFormData>({
    defaultValues: { validDays: 14, staffCount: 1, surfaceM2: 1, roomsCount: 1 },
  });

  const watchedM2 = watch('surfaceM2') || 1;
  const watchedRooms = watch('roomsCount') || 1;
  const watchedStaff = watch('staffCount') || 1;

  // Calcula m² efectivos según el modo seleccionado
  const effectiveM2 = useSurface === 'surface' ? Number(watchedM2) : roomsToM2(Number(watchedRooms));
  const estimated = estimatePrice(effectiveM2, Number(watchedStaff));
  const igv = Math.round(estimated * 0.18);
  const total = estimated + igv;

  /**
   * Carga la lista de clientes desde Supabase para el selector
   */
  useEffect(() => {
    if (!open) return;
    supabase.from('clients').select('id, name').eq('status', 'activo').then(({ data }) => {
      setClients((data || []).map(c => ({ id: c.id, name: c.name })));
    });
  }, [open]);

  /**
   * Envía el formulario y guarda la cotización en Supabase
   * Valida superficie mínima y fecha no anterior a hoy
   */
  const onSubmit = async (data: CreateQuoteFormData) => {
    setLoading(true);
    try {
      const finalM2 = useSurface === 'surface' ? Number(data.surfaceM2) : roomsToM2(Number(data.roomsCount));
      const scheduledDate = new Date(data.scheduledDate);
      const expiresAt = new Date(scheduledDate);
      expiresAt.setDate(expiresAt.getDate() + Number(data.validDays));

      const { error } = await supabase.from('quotes').insert({
        code: generateCode(),
        client_id: data.clientId,
        service_type: data.serviceType,
        surface_m2: finalM2,
        rooms_count: useSurface === 'rooms' ? Number(data.roomsCount) : null,
        staff_count: Number(data.staffCount),
        district: data.district,
        address: data.address,
        scheduled_date: data.scheduledDate,
        valid_days: Number(data.validDays),
        expires_at: expiresAt.toISOString().split('T')[0],
        subtotal: estimated,
        igv: igv,
        total_soles: total,
        status: 'borrador',
        notes: data.notes || null,
        payment_terms: data.paymentTerms || null,
        created_by: user?.id || null,
      });

      if (error) {
        toast.error('Error al generar la cotización: ' + error.message);
        return;
      }

      toast.success('Cotización generada correctamente');
      reset();
      setStep(1);
      setUseSurface('surface');
      onClose();
    } catch (err) {
      toast.error('Error inesperado al guardar la cotización');
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    reset();
    setStep(1);
    setUseSurface('surface');
    onClose();
  };

  return (
    <Modal
      open={open}
      onClose={handleClose}
      title="Generar Nueva Cotización"
      subtitle={`Paso ${step} de 2 — ${step === 1 ? 'Información del servicio' : 'Revisión y condiciones'}`}
      size="lg"
      footer={
        <div className="flex items-center gap-3 w-full">
          {step === 2 && (
            <button type="button" onClick={() => setStep(1)}
              className="px-4 py-2 text-sm font-500 text-secondary-foreground bg-secondary border border-border rounded-md hover:bg-muted transition-colors">
              Atrás
            </button>
          )}
          <button type="button" onClick={handleClose}
            className="px-4 py-2 text-sm font-500 text-muted-foreground hover:text-foreground transition-colors">
            Cancelar
          </button>
          <div className="ml-auto flex items-center gap-2">
            {step === 1 ? (
              <button type="button" onClick={() => setStep(2)}
                className="px-5 py-2 text-sm font-600 bg-primary text-primary-foreground rounded-md hover:bg-primary/90 transition-all active:scale-95">
                Siguiente →
              </button>
            ) : (
              <button type="button" onClick={handleSubmit(onSubmit)} disabled={loading}
                className="flex items-center gap-2 px-5 py-2 text-sm font-600 bg-primary text-primary-foreground rounded-md hover:bg-primary/90 disabled:opacity-60 transition-all active:scale-95">
                {loading && <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />}
                {loading ? 'Generando...' : 'Generar Cotización'}
              </button>
            )}
          </div>
        </div>
      }
    >
      {/* Indicador de progreso */}
      <div className="flex items-center gap-2 mb-6">
        {[1, 2].map((s) => (
          <React.Fragment key={`step-${s}`}>
            <div className="flex items-center gap-2">
              <div className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-700 transition-colors
                ${step >= s ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground'}`}>
                {s}
              </div>
              <span className={`text-xs font-500 ${step === s ? 'text-foreground' : 'text-muted-foreground'}`}>
                {s === 1 ? 'Servicio' : 'Revisión'}
              </span>
            </div>
            {s < 2 && <div className={`flex-1 h-0.5 rounded-full ${step > s ? 'bg-primary' : 'bg-border'}`} />}
          </React.Fragment>
        ))}
      </div>

      <form onSubmit={handleSubmit(onSubmit)}>
        {step === 1 && (
          <div className="space-y-5">
            {/* Selector de cliente */}
            <div>
              <label htmlFor="clientId" className="block text-sm font-600 text-foreground mb-1">
                Cliente <span className="text-rose-500">*</span>
              </label>
              <select id="clientId" {...register('clientId', { required: 'Selecciona un cliente' })}
                className="w-full px-3 py-2 text-sm bg-card border border-input rounded-md focus:outline-none focus:ring-2 focus:ring-ring text-foreground">
                <option value="">— Seleccionar cliente —</option>
                {clients.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
              {errors.clientId && <p className="text-xs text-rose-600 mt-1">{errors.clientId.message}</p>}
            </div>

            {/* Tipo de servicio */}
            <div>
              <label htmlFor="serviceType" className="block text-sm font-600 text-foreground mb-1">
                Tipo de Servicio <span className="text-rose-500">*</span>
              </label>
              <select id="serviceType" {...register('serviceType', { required: 'Selecciona el tipo de servicio' })}
                className="w-full px-3 py-2 text-sm bg-card border border-input rounded-md focus:outline-none focus:ring-2 focus:ring-ring text-foreground">
                <option value="">— Seleccionar servicio —</option>
                {serviceTypes.map((s) => <option key={s} value={s}>{s}</option>)}
              </select>
              {errors.serviceType && <p className="text-xs text-rose-600 mt-1">{errors.serviceType.message}</p>}
            </div>

            {/* Superficie o habitaciones */}
            <div>
              <div className="flex items-center gap-3 mb-3">
                <p className="text-sm font-600 text-foreground">Área del servicio <span className="text-rose-500">*</span></p>
                <div className="flex items-center bg-muted rounded-lg p-0.5 gap-0.5">
                  <button type="button" onClick={() => setUseSurface('surface')}
                    className={`px-2.5 py-1 rounded-md text-xs font-500 transition-all ${useSurface === 'surface' ? 'bg-card text-foreground shadow-sm' : 'text-muted-foreground'}`}>
                    Por m²
                  </button>
                  <button type="button" onClick={() => setUseSurface('rooms')}
                    className={`px-2.5 py-1 rounded-md text-xs font-500 transition-all ${useSurface === 'rooms' ? 'bg-card text-foreground shadow-sm' : 'text-muted-foreground'}`}>
                    Por habitaciones
                  </button>
                </div>
              </div>

              {useSurface === 'surface' ? (
                <div>
                  <p className="text-xs text-muted-foreground mb-1.5">Área total a limpiar — mínimo 1 m²</p>
                  <input id="surfaceM2" type="number" min={1} step={0.5}
                    {...register('surfaceM2', {
                      required: 'Ingresa la superficie',
                      min: { value: 1, message: 'La superficie mínima es 1 m²' },
                      validate: v => Number(v) > 0 || 'El valor debe ser mayor a cero',
                    })}
                    className="w-full px-3 py-2 text-sm bg-card border border-input rounded-md focus:outline-none focus:ring-2 focus:ring-ring tabular-nums"
                    placeholder="ej. 320" />
                  {errors.surfaceM2 && <p className="text-xs text-rose-600 mt-1">{errors.surfaceM2.message}</p>}
                  <p className="text-xs text-muted-foreground mt-1">Área efectiva: {effectiveM2} m²</p>
                </div>
              ) : (
                <div>
                  <p className="text-xs text-muted-foreground mb-1.5">Cantidad de habitaciones (se estima ~15 m² por habitación)</p>
                  <input id="roomsCount" type="number" min={1} max={50}
                    {...register('roomsCount', {
                      required: 'Ingresa la cantidad de habitaciones',
                      min: { value: 1, message: 'Mínimo 1 habitación' },
                    })}
                    className="w-full px-3 py-2 text-sm bg-card border border-input rounded-md focus:outline-none focus:ring-2 focus:ring-ring tabular-nums"
                    placeholder="ej. 3" />
                  {errors.roomsCount && <p className="text-xs text-rose-600 mt-1">{errors.roomsCount.message}</p>}
                  <p className="text-xs text-muted-foreground mt-1">Área estimada: {effectiveM2} m²</p>
                </div>
              )}
            </div>

            {/* Personal requerido */}
            <div>
              <label htmlFor="staffCount" className="block text-sm font-600 text-foreground mb-1">
                Personal Requerido <span className="text-rose-500">*</span>
              </label>
              <input id="staffCount" type="number" min={1} max={20}
                {...register('staffCount', { required: 'Ingresa el personal', min: { value: 1, message: 'Mínimo 1 operario' } })}
                className="w-full px-3 py-2 text-sm bg-card border border-input rounded-md focus:outline-none focus:ring-2 focus:ring-ring tabular-nums"
                placeholder="ej. 3" />
              {errors.staffCount && <p className="text-xs text-rose-600 mt-1">{errors.staffCount.message}</p>}
            </div>

            {/* Distrito y dirección */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label htmlFor="district" className="block text-sm font-600 text-foreground mb-1">
                  Distrito <span className="text-rose-500">*</span>
                </label>
                <select id="district" {...register('district', { required: 'Selecciona el distrito' })}
                  className="w-full px-3 py-2 text-sm bg-card border border-input rounded-md focus:outline-none focus:ring-2 focus:ring-ring text-foreground">
                  <option value="">— Seleccionar —</option>
                  {limaDistricts.map((d) => <option key={d} value={d}>{d}</option>)}
                </select>
                {errors.district && <p className="text-xs text-rose-600 mt-1">{errors.district.message}</p>}
              </div>
              <div>
                <label htmlFor="address" className="block text-sm font-600 text-foreground mb-1">
                  Dirección <span className="text-rose-500">*</span>
                </label>
                <input id="address" type="text"
                  {...register('address', { required: 'Ingresa la dirección' })}
                  className="w-full px-3 py-2 text-sm bg-card border border-input rounded-md focus:outline-none focus:ring-2 focus:ring-ring"
                  placeholder="Av. Principal 123" />
                {errors.address && <p className="text-xs text-rose-600 mt-1">{errors.address.message}</p>}
              </div>
            </div>

            {/* Fecha programada — no puede ser anterior a hoy */}
            <div>
              <label htmlFor="scheduledDate" className="block text-sm font-600 text-foreground mb-1">
                Fecha Programada del Servicio <span className="text-rose-500">*</span>
              </label>
              <p className="text-xs text-muted-foreground mb-1.5">No puede ser una fecha anterior a hoy</p>
              <input id="scheduledDate" type="date" min={getTodayString()}
                {...register('scheduledDate', {
                  required: 'Selecciona la fecha del servicio',
                  validate: v => v >= getTodayString() || 'La fecha no puede ser anterior a hoy',
                })}
                className="w-full px-3 py-2 text-sm bg-card border border-input rounded-md focus:outline-none focus:ring-2 focus:ring-ring" />
              {errors.scheduledDate && <p className="text-xs text-rose-600 mt-1">{errors.scheduledDate.message}</p>}
            </div>
          </div>
        )}

        {step === 2 && (
          <div className="space-y-5">
            {/* Resumen de precio estimado */}
            <div className="bg-primary/5 border border-primary/20 rounded-xl p-4">
              <p className="text-xs font-600 text-primary uppercase tracking-wide mb-3">Estimación de Precio</p>
              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Subtotal ({effectiveM2} m² × S/ 2.50 + personal)</span>
                  <span className="font-600 tabular-nums">S/ {estimated.toLocaleString('es-PE')}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">IGV (18%)</span>
                  <span className="font-600 tabular-nums">S/ {igv.toLocaleString('es-PE')}</span>
                </div>
                <div className="flex justify-between text-sm font-700 border-t border-primary/20 pt-2">
                  <span className="text-foreground">Total</span>
                  <span className="text-primary tabular-nums">S/ {total.toLocaleString('es-PE')}</span>
                </div>
              </div>
            </div>

            {/* Días de validez */}
            <div>
              <label htmlFor="validDays" className="block text-sm font-600 text-foreground mb-1">
                Días de Validez de la Cotización
              </label>
              <select id="validDays" {...register('validDays')}
                className="w-full px-3 py-2 text-sm bg-card border border-input rounded-md focus:outline-none focus:ring-2 focus:ring-ring">
                <option value={7}>7 días</option>
                <option value={14}>14 días</option>
                <option value={30}>30 días</option>
              </select>
            </div>

            {/* Condiciones de pago */}
            <div>
              <label htmlFor="paymentTerms" className="block text-sm font-600 text-foreground mb-1">
                Condiciones de Pago
              </label>
              <select id="paymentTerms" {...register('paymentTerms')}
                className="w-full px-3 py-2 text-sm bg-card border border-input rounded-md focus:outline-none focus:ring-2 focus:ring-ring">
                <option value="">— Seleccionar —</option>
                <option value="50% adelanto, 50% al finalizar">50% adelanto, 50% al finalizar</option>
                <option value="Pago completo al inicio">Pago completo al inicio</option>
                <option value="Pago completo al finalizar">Pago completo al finalizar</option>
                <option value="Facturación mensual">Facturación mensual</option>
              </select>
            </div>

            {/* Notas adicionales */}
            <div>
              <label htmlFor="notes" className="block text-sm font-600 text-foreground mb-1">
                Notas Adicionales
              </label>
              <textarea id="notes" rows={3} {...register('notes')}
                className="w-full px-3 py-2 text-sm bg-card border border-input rounded-md focus:outline-none focus:ring-2 focus:ring-ring resize-none"
                placeholder="Observaciones especiales, accesos, materiales requeridos..." />
            </div>
          </div>
        )}
      </form>
    </Modal>
  );
}