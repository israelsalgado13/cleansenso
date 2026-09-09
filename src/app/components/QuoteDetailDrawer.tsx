'use client';

/**
 * Panel lateral de detalle de cotización
 * Se desliza desde la derecha mostrando toda la información de una cotización:
 * datos del cliente, detalles del servicio, desglose de costos y acciones
 */

import React from 'react';
import { X, FileDown, Send, Edit2, MapPin, User, Wrench, Ruler, Users } from 'lucide-react';
import StatusBadge from '@/components/ui/StatusBadge';
import { toast } from 'sonner';
import type { Quote } from './QuoteTableClient';

// Props del drawer
interface QuoteDetailDrawerProps {
  quote: Quote;       // Cotización a mostrar
  onClose: () => void; // Función para cerrar el panel
}

// Ítems de línea del desglose de costos (datos de ejemplo)
const lineItems = [
  { id: 'li-1', description: 'Mano de obra — personal de limpieza', unit: 'hora', qty: 8, unitPrice: 25, total: 200 },
  { id: 'li-2', description: 'Insumos de limpieza industrial', unit: 'kit', qty: 2, unitPrice: 85, total: 170 },
  { id: 'li-3', description: 'Maquinaria especializada (aspiradora industrial)', unit: 'día', qty: 1, unitPrice: 120, total: 120 },
  { id: 'li-4', description: 'Transporte y logística', unit: 'servicio', qty: 1, unitPrice: 50, total: 50 },
];

export default function QuoteDetailDrawer({ quote, onClose }: QuoteDetailDrawerProps) {
  // Calcula totales del desglose de costos
  const subtotal = lineItems.reduce((s, i) => s + i.total, 0);
  const igv = Math.round(subtotal * 0.18); // IGV del 18%
  const total = subtotal + igv;

  return (
    // Overlay de pantalla completa con panel deslizante desde la derecha
    <div className="fixed inset-0 z-50 flex justify-end">
      {/* Fondo oscuro — al hacer clic cierra el panel */}
      <div className="absolute inset-0 bg-foreground/30 backdrop-blur-sm fade-in" onClick={onClose} />

      {/* Panel lateral de detalle */}
      <div className="relative w-full max-w-xl bg-card border-l border-border shadow-2xl flex flex-col slide-in-right h-full">

        {/* Encabezado: código, estado, fechas y botón cerrar */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-border shrink-0">
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-base font-700 text-foreground">{quote.code}</h2>
              <StatusBadge status={quote.status} />
            </div>
            <p className="text-sm text-muted-foreground mt-0.5">
              Emitida {quote.createdAt} · Vence {quote.expiresAt}
            </p>
          </div>
          {/* Botón para cerrar el panel */}
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-md flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
          >
            <X size={16} />
          </button>
        </div>

        {/* Contenido con scroll */}
        <div className="flex-1 overflow-y-auto px-6 py-5 space-y-5 scrollbar-thin">

          {/* Información del cliente */}
          <div className="bg-muted/40 rounded-lg p-4 space-y-2">
            <p className="text-xs font-600 uppercase tracking-wide text-muted-foreground mb-3">Información del Cliente</p>
            <div className="flex items-start gap-2">
              <User size={14} className="text-muted-foreground mt-0.5 shrink-0" />
              <div>
                <p className="text-sm font-600 text-foreground">{quote.clientName}</p>
                <p className="text-xs text-muted-foreground">{quote.clientCompany}</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <MapPin size={14} className="text-muted-foreground shrink-0" />
              <p className="text-sm text-foreground">{quote.district}, Lima</p>
            </div>
          </div>

          {/* Detalles del servicio: tipo, superficie y personal */}
          <div className="grid grid-cols-3 gap-3">
            <div className="bg-muted/40 rounded-lg p-3">
              <div className="flex items-center gap-1.5 mb-1">
                <Wrench size={13} className="text-muted-foreground" />
                <p className="text-[10px] font-600 uppercase tracking-wide text-muted-foreground">Servicio</p>
              </div>
              <p className="text-sm font-600 text-foreground">{quote.serviceType}</p>
            </div>
            <div className="bg-muted/40 rounded-lg p-3">
              <div className="flex items-center gap-1.5 mb-1">
                <Ruler size={13} className="text-muted-foreground" />
                <p className="text-[10px] font-600 uppercase tracking-wide text-muted-foreground">Superficie</p>
              </div>
              <p className="text-sm font-700 tabular-nums text-foreground">{quote.surfaceM2} m²</p>
            </div>
            <div className="bg-muted/40 rounded-lg p-3">
              <div className="flex items-center gap-1.5 mb-1">
                <Users size={13} className="text-muted-foreground" />
                <p className="text-[10px] font-600 uppercase tracking-wide text-muted-foreground">Personal</p>
              </div>
              <p className="text-sm font-700 tabular-nums text-foreground">{quote.staffCount} personas</p>
            </div>
          </div>

          {/* Tabla de desglose de costos */}
          <div>
            <p className="text-xs font-600 uppercase tracking-wide text-muted-foreground mb-3">Desglose de Costos</p>
            <div className="border border-border rounded-lg overflow-hidden">
              <table className="w-full">
                <thead className="bg-muted/50">
                  <tr>
                    <th className="px-3 py-2 text-left text-xs font-600 text-muted-foreground">Descripción</th>
                    <th className="px-3 py-2 text-center text-xs font-600 text-muted-foreground">Cant.</th>
                    <th className="px-3 py-2 text-right text-xs font-600 text-muted-foreground">P. Unit.</th>
                    <th className="px-3 py-2 text-right text-xs font-600 text-muted-foreground">Total</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {lineItems.map((item) => (
                    <tr key={item.id} className="hover:bg-muted/30">
                      <td className="px-3 py-2 text-sm text-foreground">{item.description}</td>
                      <td className="px-3 py-2 text-sm text-center text-muted-foreground tabular-nums">{item.qty} {item.unit}</td>
                      <td className="px-3 py-2 text-sm text-right tabular-nums text-muted-foreground">S/ {item.unitPrice}</td>
                      <td className="px-3 py-2 text-sm font-600 text-right tabular-nums text-foreground">S/ {item.total}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {/* Resumen de subtotal, IGV y total */}
              <div className="border-t border-border bg-muted/20 px-3 py-2 space-y-1">
                <div className="flex justify-between text-sm text-muted-foreground">
                  <span>Subtotal</span>
                  <span className="tabular-nums">S/ {subtotal.toLocaleString('es-PE')}</span>
                </div>
                <div className="flex justify-between text-sm text-muted-foreground">
                  <span>IGV (18%)</span>
                  <span className="tabular-nums">S/ {igv.toLocaleString('es-PE')}</span>
                </div>
                <div className="flex justify-between text-base font-700 text-foreground border-t border-border pt-1">
                  <span>Total</span>
                  <span className="tabular-nums text-primary">S/ {total.toLocaleString('es-PE')}</span>
                </div>
              </div>
            </div>
          </div>

          {/* Condiciones y términos de la cotización */}
          <div className="bg-amber-50 border border-amber-200 rounded-lg p-3">
            <p className="text-xs font-600 text-amber-700 mb-1">Condiciones de la cotización</p>
            <p className="text-xs text-amber-600">
              Válida por 14 días calendario desde la fecha de emisión. El servicio se ejecutará en horario acordado con el cliente. Precios incluyen IGV. Forma de pago: 50% al inicio, 50% al finalizar el servicio.
            </p>
          </div>
        </div>

        {/* Pie del panel: acciones disponibles según estado */}
        <div className="px-6 py-4 border-t border-border flex items-center gap-2 shrink-0 bg-muted/20">
          {/* Botón para descargar PDF de la cotización */}
          <button
            onClick={() => toast.success(`PDF de ${quote.code} generado y descargado`)}
            className="flex items-center gap-1.5 px-4 py-2 text-sm font-600 bg-secondary text-secondary-foreground border border-border rounded-md hover:bg-muted transition-colors"
          >
            <FileDown size={14} />
            Descargar PDF
          </button>

          {/* Botón enviar al cliente (solo si está en borrador) */}
          {quote.status === 'borrador' && (
            <button
              onClick={() => toast.success('Cotización enviada al cliente por correo')}
              className="flex items-center gap-1.5 px-4 py-2 text-sm font-600 bg-primary text-primary-foreground rounded-md hover:bg-primary/90 transition-all active:scale-95"
            >
              <Send size={14} />
              Enviar al Cliente
            </button>
          )}

          {/* Botón para editar la cotización */}
          <button className="flex items-center gap-1.5 px-4 py-2 text-sm font-500 text-muted-foreground hover:text-foreground hover:bg-muted rounded-md transition-colors ml-auto">
            <Edit2 size={14} />
            Editar
          </button>
        </div>
      </div>
    </div>
  );
}