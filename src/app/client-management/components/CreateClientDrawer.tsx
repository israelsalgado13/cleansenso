'use client';

/**
 * Drawer para registrar y editar clientes
 * Conectado a Supabase — guarda correctamente en la base de datos
 * Soporta modo creación y modo edición (editClient prop)
 */

import React, { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { X, Save } from 'lucide-react';
import { toast } from 'sonner';
import { createClient as createSupabaseClient } from '@/lib/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import type { Client } from './ClientTableClient';

// ── Tipos del formulario ───────────────────────────────────────────────────────

interface ClientFormData {
  name: string;
  docType: 'RUC' | 'DNI';
  docNumber: string;
  clientType: 'empresa' | 'persona_natural';
  district: string;
  phone: string;
  email: string;
  contactName: string;
  address: string;
  status: 'activo' | 'inactivo' | 'prospecto';
  notes: string;
}

interface CreateClientDrawerProps {
  open: boolean;
  onClose: () => void;
  editClient?: Client | null;
  onSaved?: () => void;
}

// ── Constantes ─────────────────────────────────────────────────────────────────

const limaDistricts = [
  'Barranco', 'Cercado de Lima', 'Chorrillos', 'Jesús María', 'La Victoria',
  'Lince', 'Miraflores', 'Pueblo Libre', 'Rímac', 'San Borja',
  'San Isidro', 'San Luis', 'San Miguel', 'Surco', 'Surquillo',
];

// Genera código de cliente secuencial
const generateClientCode = () => {
  const num = String(Math.floor(Math.random() * 900) + 100).padStart(3, '0');
  return `CLI-${num}`;
};

export default function CreateClientDrawer({ open, onClose, editClient, onSaved }: CreateClientDrawerProps) {
  const { user } = useAuth();
  const supabase = createSupabaseClient();
  const [loading, setLoading] = useState(false);
  const isEditing = !!editClient;

  const {
    register,
    handleSubmit,
    formState: { errors },
    reset,
    watch,
  } = useForm<ClientFormData>({
    defaultValues: {
      docType: 'RUC',
      clientType: 'empresa',
      status: 'prospecto',
    },
  });

  const watchDocType = watch('docType');

  /**
   * Precarga los datos del cliente al editar
   */
  useEffect(() => {
    if (editClient) {
      reset({
        name: editClient.name,
        docType: editClient.docType,
        docNumber: editClient.docNumber,
        clientType: editClient.type,
        district: editClient.district,
        phone: editClient.phone,
        email: editClient.email,
        contactName: editClient.contactName,
        address: editClient.address,
        status: editClient.status,
        notes: '',
      });
    } else {
      reset({ docType: 'RUC', clientType: 'empresa', status: 'prospecto' });
    }
  }, [editClient, open]);

  /**
   * Guarda o actualiza el cliente en Supabase
   */
  const onSubmit = async (data: ClientFormData) => {
    setLoading(true);
    try {
      if (isEditing && editClient) {
        // Actualizar cliente existente
        const { error } = await supabase
          .from('clients')
          .update({
            name: data.name,
            doc_type: data.docType,
            doc_number: data.docNumber,
            client_type: data.clientType,
            district: data.district,
            phone: data.phone,
            email: data.email,
            contact_name: data.contactName,
            address: data.address,
            status: data.status,
            notes: data.notes || null,
          })
          .eq('id', editClient.id);

        if (error) {
          toast.error('Error al actualizar el cliente: ' + error.message);
          return;
        }
        toast.success('Cliente actualizado correctamente');
      } else {
        // Crear nuevo cliente
        const { error } = await supabase.from('clients').insert({
          code: generateClientCode(),
          name: data.name,
          doc_type: data.docType,
          doc_number: data.docNumber,
          client_type: data.clientType,
          district: data.district,
          phone: data.phone,
          email: data.email,
          contact_name: data.contactName,
          address: data.address,
          status: data.status,
          notes: data.notes || null,
          total_quotes: 0,
          registered_by: user?.id || null,
        });

        if (error) {
          toast.error('Error al registrar el cliente: ' + error.message);
          return;
        }
        toast.success('Cliente registrado correctamente');
      }

      onSaved?.();
      reset();
      onClose();
    } catch (err) {
      toast.error('Error inesperado al guardar el cliente');
    } finally {
      setLoading(false);
    }
  };

  if (!open) return null;

  return (
    <>
      {/* Overlay de fondo */}
      <div className="fixed inset-0 bg-black/40 z-40" onClick={onClose} />

      {/* Panel lateral */}
      <div className="fixed right-0 top-0 h-full w-full max-w-md bg-card border-l border-border shadow-xl z-50 flex flex-col">
        {/* Encabezado */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-border">
          <div>
            <h2 className="text-base font-700 text-foreground">
              {isEditing ? 'Editar Cliente' : 'Registrar Nuevo Cliente'}
            </h2>
            <p className="text-xs text-muted-foreground mt-0.5">
              {isEditing ? `Editando ${editClient?.code}` : 'Completa los datos del cliente'}
            </p>
          </div>
          <button onClick={onClose} className="w-8 h-8 rounded-md flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-muted transition-colors">
            <X size={16} />
          </button>
        </div>

        {/* Formulario con scroll */}
        <div className="flex-1 overflow-y-auto p-5">
          <form id="client-form" onSubmit={handleSubmit(onSubmit)} className="space-y-4">

            {/* Tipo de cliente */}
            <div>
              <label className="block text-sm font-600 text-foreground mb-2">Tipo de Cliente</label>
              <div className="flex gap-2">
                {[
                  { value: 'empresa', label: 'Empresa' },
                  { value: 'persona_natural', label: 'Persona Natural' },
                ].map((opt) => (
                  <label key={opt.value} className="flex items-center gap-2 cursor-pointer">
                    <input type="radio" value={opt.value} {...register('clientType')}
                      className="text-primary focus:ring-primary" />
                    <span className="text-sm text-foreground">{opt.label}</span>
                  </label>
                ))}
              </div>
            </div>

            {/* Nombre */}
            <div>
              <label htmlFor="name" className="block text-sm font-600 text-foreground mb-1">
                Nombre / Razón Social <span className="text-rose-500">*</span>
              </label>
              <input id="name" type="text"
                {...register('name', { required: 'Ingresa el nombre del cliente' })}
                className="w-full px-3 py-2 text-sm bg-background border border-input rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary transition-colors"
                placeholder="Empresa S.A.C. o Nombre Apellido" />
              {errors.name && <p className="text-xs text-rose-600 mt-1">{errors.name.message}</p>}
            </div>

            {/* Documento */}
            <div className="grid grid-cols-3 gap-3">
              <div>
                <label htmlFor="docType" className="block text-sm font-600 text-foreground mb-1">Tipo Doc.</label>
                <select id="docType" {...register('docType')}
                  className="w-full px-3 py-2 text-sm bg-background border border-input rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/30">
                  <option value="RUC">RUC</option>
                  <option value="DNI">DNI</option>
                </select>
              </div>
              <div className="col-span-2">
                <label htmlFor="docNumber" className="block text-sm font-600 text-foreground mb-1">
                  N° Documento <span className="text-rose-500">*</span>
                </label>
                <input id="docNumber" type="text"
                  {...register('docNumber', {
                    required: 'Ingresa el número de documento',
                    minLength: { value: watchDocType === 'RUC' ? 11 : 8, message: watchDocType === 'RUC' ? 'RUC debe tener 11 dígitos' : 'DNI debe tener 8 dígitos' },
                    maxLength: { value: watchDocType === 'RUC' ? 11 : 8, message: watchDocType === 'RUC' ? 'RUC debe tener 11 dígitos' : 'DNI debe tener 8 dígitos' },
                    pattern: { value: /^\d+$/, message: 'Solo se permiten números' },
                  })}
                  className="w-full px-3 py-2 text-sm bg-background border border-input rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/30 tabular-nums"
                  placeholder={watchDocType === 'RUC' ? '20512345678' : '43567891'} />
                {errors.docNumber && <p className="text-xs text-rose-600 mt-1">{errors.docNumber.message}</p>}
              </div>
            </div>

            {/* Contacto */}
            <div>
              <label htmlFor="contactName" className="block text-sm font-600 text-foreground mb-1">
                Nombre de Contacto <span className="text-rose-500">*</span>
              </label>
              <input id="contactName" type="text"
                {...register('contactName', { required: 'Ingresa el nombre del contacto' })}
                className="w-full px-3 py-2 text-sm bg-background border border-input rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/30"
                placeholder="Juan Pérez García" />
              {errors.contactName && <p className="text-xs text-rose-600 mt-1">{errors.contactName.message}</p>}
            </div>

            {/* Teléfono y Email */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label htmlFor="phone" className="block text-sm font-600 text-foreground mb-1">
                  Teléfono <span className="text-rose-500">*</span>
                </label>
                <input id="phone" type="tel"
                  {...register('phone', { required: 'Ingresa el teléfono' })}
                  className="w-full px-3 py-2 text-sm bg-background border border-input rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/30"
                  placeholder="+51 987 654 321" />
                {errors.phone && <p className="text-xs text-rose-600 mt-1">{errors.phone.message}</p>}
              </div>
              <div>
                <label htmlFor="email" className="block text-sm font-600 text-foreground mb-1">
                  Correo <span className="text-rose-500">*</span>
                </label>
                <input id="email" type="email"
                  {...register('email', { required: 'Ingresa el correo', pattern: { value: /^[^\s@]+@[^\s@]+\.[^\s@]+$/, message: 'Correo inválido' } })}
                  className="w-full px-3 py-2 text-sm bg-background border border-input rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/30"
                  placeholder="contacto@empresa.pe" />
                {errors.email && <p className="text-xs text-rose-600 mt-1">{errors.email.message}</p>}
              </div>
            </div>

            {/* Distrito */}
            <div>
              <label htmlFor="district" className="block text-sm font-600 text-foreground mb-1">
                Distrito <span className="text-rose-500">*</span>
              </label>
              <select id="district" {...register('district', { required: 'Selecciona el distrito' })}
                className="w-full px-3 py-2 text-sm bg-background border border-input rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/30">
                <option value="">— Seleccionar —</option>
                {limaDistricts.map(d => <option key={d} value={d}>{d}</option>)}
              </select>
              {errors.district && <p className="text-xs text-rose-600 mt-1">{errors.district.message}</p>}
            </div>

            {/* Dirección */}
            <div>
              <label htmlFor="address" className="block text-sm font-600 text-foreground mb-1">
                Dirección <span className="text-rose-500">*</span>
              </label>
              <input id="address" type="text"
                {...register('address', { required: 'Ingresa la dirección' })}
                className="w-full px-3 py-2 text-sm bg-background border border-input rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/30"
                placeholder="Av. Principal 123, Piso 2" />
              {errors.address && <p className="text-xs text-rose-600 mt-1">{errors.address.message}</p>}
            </div>

            {/* Estado */}
            <div>
              <label htmlFor="status" className="block text-sm font-600 text-foreground mb-1">Estado</label>
              <select id="status" {...register('status')}
                className="w-full px-3 py-2 text-sm bg-background border border-input rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/30">
                <option value="prospecto">Prospecto</option>
                <option value="activo">Activo</option>
                <option value="inactivo">Inactivo</option>
              </select>
            </div>

            {/* Notas */}
            <div>
              <label htmlFor="notes" className="block text-sm font-600 text-foreground mb-1">Notas</label>
              <textarea id="notes" rows={3} {...register('notes')}
                className="w-full px-3 py-2 text-sm bg-background border border-input rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/30 resize-none"
                placeholder="Observaciones adicionales sobre el cliente..." />
            </div>
          </form>
        </div>

        {/* Pie del drawer con botones de acción */}
        <div className="border-t border-border p-4 flex items-center gap-3">
          <button onClick={onClose}
            className="flex-1 px-4 py-2 text-sm font-500 text-secondary-foreground bg-secondary border border-border rounded-lg hover:bg-muted transition-colors">
            Cancelar
          </button>
          <button form="client-form" type="submit" disabled={loading}
            className="flex-1 flex items-center justify-center gap-2 px-4 py-2 text-sm font-600 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 disabled:opacity-60 transition-all active:scale-95">
            {loading ? (
              <><span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />Guardando...</>
            ) : (
              <><Save size={14} />{isEditing ? 'Actualizar Cliente' : 'Registrar Cliente'}</>
            )}
          </button>
        </div>
      </div>
    </>
  );
}