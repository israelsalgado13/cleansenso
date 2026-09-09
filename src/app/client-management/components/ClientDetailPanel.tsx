'use client';

/**
 * Panel lateral de detalle de cliente
 * Se desliza desde la derecha mostrando información completa del cliente:
 * datos de contacto, historial de cotizaciones y citas
 * Incluye pestañas: Resumen, Cotizaciones, Citas
 */

import React, { useState } from 'react';
import {
  X,
  Phone,
  Mail,
  MapPin,
  Building2,
  User,
  FileText,
  CalendarDays,
  Edit2,
} from 'lucide-react';
import StatusBadge from '@/components/ui/StatusBadge';
import type { Client } from './ClientTableClient';

// Props del panel
interface ClientDetailPanelProps {
  client: Client;       // Cliente a mostrar
  onClose: () => void;  // Función para cerrar el panel
}

// Definición de pestañas del panel
const tabs = [
  { id: 'tab-overview', label: 'Resumen' },
  { id: 'tab-quotes', label: 'Cotizaciones' },
  { id: 'tab-appointments', label: 'Citas' },
];

// Datos de ejemplo del historial de cotizaciones del cliente
const mockClientQuotes = [
  { id: 'cq-001', code: 'COT-2026-001', service: 'Limpieza de Oficinas', total: 850, status: 'aceptada' as const, date: '01/09/2026' },
  { id: 'cq-002', code: 'COT-2025-087', service: 'Lavado de Alfombras', total: 320, status: 'completada' as const, date: '14/06/2025' },
  { id: 'cq-003', code: 'COT-2025-042', service: 'Limpieza de Oficinas', total: 780, status: 'completada' as const, date: '02/03/2025' },
];

// Datos de ejemplo del historial de citas del cliente
const mockClientAppointments = [
  { id: 'ca-001', code: 'CITA-2026-018', service: 'Limpieza de Oficinas', date: '10/09/2026', time: '08:00 – 12:00', status: 'confirmada' as const },
  { id: 'ca-002', code: 'CITA-2026-009', service: 'Lavado de Alfombras', date: '28/08/2026', time: '09:00 – 11:00', status: 'completada' as const },
];

export default function ClientDetailPanel({ client, onClose }: ClientDetailPanelProps) {
  // Pestaña activa del panel
  const [activeTab, setActiveTab] = useState('tab-overview');

  return (
    // Overlay de pantalla completa con panel deslizante desde la derecha
    <div className="fixed inset-0 z-50 flex justify-end">
      {/* Fondo oscuro — al hacer clic cierra el panel */}
      <div className="absolute inset-0 bg-foreground/30 backdrop-blur-sm fade-in" onClick={onClose} />

      {/* Panel lateral de detalle */}
      <div className="relative w-full max-w-xl bg-card border-l border-border shadow-2xl flex flex-col slide-in-right h-full">

        {/* Encabezado: avatar, nombre, código, estado y botón cerrar */}
        <div className="px-6 py-4 border-b border-border shrink-0">
          <div className="flex items-start justify-between mb-3">
            <div className="flex items-center gap-3">
              {/* Avatar con icono según tipo de cliente (empresa o persona natural) */}
              <div className={`w-11 h-11 rounded-full flex items-center justify-center shrink-0
                ${client.type === 'empresa' ? 'bg-indigo-100 text-indigo-600' : 'bg-green-100 text-green-600'}`}>
                {client.type === 'empresa' ? <Building2 size={20} /> : <User size={20} />}
              </div>
              <div>
                <h2 className="text-base font-700 text-foreground leading-tight">{client.name}</h2>
                <p className="text-sm text-muted-foreground">{client.code} · {client.district}</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              {/* Badge de estado del cliente */}
              <StatusBadge status={client.status} />
              {/* Botón para cerrar el panel */}
              <button
                onClick={onClose}
                className="w-8 h-8 rounded-md flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
              >
                <X size={16} />
              </button>
            </div>
          </div>

          {/* Contacto rápido: teléfono y correo */}
          <div className="flex items-center gap-3">
            <a href={`tel:${client.phone}`} className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-primary transition-colors">
              <Phone size={13} />{client.phone}
            </a>
            <span className="text-border">·</span>
            <a href={`mailto:${client.email}`} className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-primary transition-colors truncate">
              <Mail size={13} />{client.email}
            </a>
          </div>
        </div>

        {/* Pestañas de navegación del panel */}
        <div className="flex border-b border-border shrink-0 px-6">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`px-1 py-3 mr-5 text-sm font-500 border-b-2 transition-all duration-150
                ${activeTab === tab.id
                  ? 'border-primary text-primary' :'border-transparent text-muted-foreground hover:text-foreground'}`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Contenido de la pestaña activa */}
        <div className="flex-1 overflow-y-auto px-6 py-5 space-y-4 scrollbar-thin">

          {/* Pestaña Resumen: estadísticas e información del cliente */}
          {activeTab === 'tab-overview' && (
            <>
              {/* Tarjetas de estadísticas clave */}
              <div className="grid grid-cols-3 gap-3">
                <div className="bg-muted/40 rounded-lg p-3 text-center">
                  <p className="text-xl font-800 tabular-nums text-foreground">{client.totalQuotes}</p>
                  <p className="text-xs text-muted-foreground mt-0.5">Cotizaciones</p>
                </div>
                <div className="bg-muted/40 rounded-lg p-3 text-center">
                  <p className="text-xl font-800 tabular-nums text-green-600">
                    {mockClientQuotes.filter(q => q.status === 'completada').length}
                  </p>
                  <p className="text-xs text-muted-foreground mt-0.5">Servicios realizados</p>
                </div>
                <div className="bg-muted/40 rounded-lg p-3 text-center">
                  <p className="text-sm font-700 text-foreground tabular-nums">{client.lastServiceDate}</p>
                  <p className="text-xs text-muted-foreground mt-0.5">Último servicio</p>
                </div>
              </div>

              {/* Información detallada del cliente */}
              <div className="space-y-3">
                <p className="text-xs font-600 uppercase tracking-wide text-muted-foreground">Información del Cliente</p>
                <div className="space-y-2.5">
                  {/* Tipo de documento y número */}
                  <div className="flex items-start gap-3">
                    <span className="text-xs font-600 text-muted-foreground w-28 shrink-0 pt-0.5">
                      {client.docType}
                    </span>
                    <span className="text-sm text-foreground tabular-nums">{client.docNumber}</span>
                  </div>
                  {/* Nombre del contacto */}
                  <div className="flex items-start gap-3">
                    <span className="text-xs font-600 text-muted-foreground w-28 shrink-0 pt-0.5">Contacto</span>
                    <span className="text-sm text-foreground">{client.contactName}</span>
                  </div>
                  {/* Tipo de cliente */}
                  <div className="flex items-start gap-3">
                    <span className="text-xs font-600 text-muted-foreground w-28 shrink-0 pt-0.5">Tipo</span>
                    <span className="text-sm text-foreground">
                      {client.type === 'empresa' ? 'Empresa / Persona Jurídica' : 'Persona Natural'}
                    </span>
                  </div>
                  {/* Dirección */}
                  <div className="flex items-start gap-3">
                    <MapPin size={13} className="text-muted-foreground mt-0.5 shrink-0" />
                    <span className="text-sm text-foreground">{client.address}</span>
                  </div>
                  {/* Fecha de registro */}
                  <div className="flex items-start gap-3">
                    <span className="text-xs font-600 text-muted-foreground w-28 shrink-0 pt-0.5">Registrado</span>
                    <span className="text-sm text-muted-foreground tabular-nums">{client.registeredAt}</span>
                  </div>
                </div>
              </div>
            </>
          )}

          {/* Pestaña Cotizaciones: historial de cotizaciones del cliente */}
          {activeTab === 'tab-quotes' && (
            <div className="space-y-3">
              <p className="text-xs font-600 uppercase tracking-wide text-muted-foreground">
                Historial de Cotizaciones ({mockClientQuotes.length})
              </p>
              {mockClientQuotes.map((q) => (
                <div key={q.id} className="flex items-center justify-between p-3 bg-muted/30 rounded-lg border border-border hover:bg-muted/50 transition-colors">
                  <div className="flex items-center gap-3">
                    <FileText size={16} className="text-muted-foreground shrink-0" />
                    <div>
                      <p className="text-sm font-600 text-primary">{q.code}</p>
                      <p className="text-xs text-muted-foreground">{q.service} · {q.date}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="text-sm font-700 tabular-nums text-foreground">S/ {q.total.toLocaleString('es-PE')}</span>
                    <StatusBadge status={q.status} size="sm" />
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Pestaña Citas: historial de citas del cliente */}
          {activeTab === 'tab-appointments' && (
            <div className="space-y-3">
              <p className="text-xs font-600 uppercase tracking-wide text-muted-foreground">
                Historial de Citas ({mockClientAppointments.length})
              </p>
              {mockClientAppointments.map((a) => (
                <div key={a.id} className="flex items-center justify-between p-3 bg-muted/30 rounded-lg border border-border hover:bg-muted/50 transition-colors">
                  <div className="flex items-center gap-3">
                    <CalendarDays size={16} className="text-muted-foreground shrink-0" />
                    <div>
                      <p className="text-sm font-600 text-foreground">{a.code}</p>
                      <p className="text-xs text-muted-foreground">{a.service} · {a.date} · {a.time}</p>
                    </div>
                  </div>
                  <StatusBadge status={a.status} size="sm" />
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Pie del panel: acciones principales */}
        <div className="px-6 py-4 border-t border-border bg-muted/20 flex items-center gap-2 shrink-0">
          {/* Botón para crear nueva cotización para este cliente */}
          <button className="flex items-center gap-1.5 px-4 py-2 text-sm font-600 bg-primary text-primary-foreground rounded-md hover:bg-primary/90 transition-all active:scale-95">
            <FileText size={14} />
            Nueva Cotización
          </button>
          {/* Botón para editar los datos del cliente */}
          <button className="flex items-center gap-1.5 px-4 py-2 text-sm font-500 text-secondary-foreground bg-secondary border border-border rounded-md hover:bg-muted transition-colors">
            <Edit2 size={14} />
            Editar Cliente
          </button>
        </div>
      </div>
    </div>
  );
}