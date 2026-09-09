/**
 * Componente StatusBadge — Etiqueta de estado visual
 * Muestra el estado de un registro (cotización, cliente, cita, etc.)
 * con colores y etiquetas diferenciados por tipo de estado
 */

import React from 'react';

// Todos los tipos de estado posibles en el sistema
type StatusType =
  | 'borrador'       // Cotización en borrador
  | 'enviada'        // Cotización enviada al cliente
  | 'aceptada'       // Cotización aceptada por el cliente
  | 'rechazada'      // Cotización rechazada
  | 'vencida'        // Cotización vencida sin respuesta
  | 'activo'         // Cliente o servicio activo
  | 'inactivo'       // Cliente o servicio inactivo
  | 'prospecto'      // Cliente prospecto sin cotización activa
  | 'programada'     // Cita programada
  | 'confirmada'     // Cita confirmada por el cliente
  | 'en_progreso'    // Cita o servicio en ejecución
  | 'completada'     // Cita o servicio completado
  | 'cancelada'      // Cita cancelada
  | 'nueva'          // Registro nuevo
  | 'en_revision'    // Servicio en revisión
  | 'cotizada';      // Cliente con cotización activa

// Configuración visual para cada estado: etiqueta, colores de fondo, texto, borde y punto
const statusConfig: Record<
  StatusType,
  { label: string; bg: string; text: string; border: string; dot: string }
> = {
  borrador: {
    label: 'Borrador',
    bg: 'bg-slate-50',
    text: 'text-slate-600',
    border: 'border-slate-200',
    dot: 'bg-slate-400',
  },
  enviada: {
    label: 'Enviada',
    bg: 'bg-blue-50',
    text: 'text-blue-700',
    border: 'border-blue-200',
    dot: 'bg-blue-500',
  },
  aceptada: {
    label: 'Aceptada',
    bg: 'bg-green-50',
    text: 'text-green-700',
    border: 'border-green-200',
    dot: 'bg-green-500',
  },
  rechazada: {
    label: 'Rechazada',
    bg: 'bg-rose-50',
    text: 'text-rose-700',
    border: 'border-rose-200',
    dot: 'bg-rose-500',
  },
  vencida: {
    label: 'Vencida',
    bg: 'bg-amber-50',
    text: 'text-amber-700',
    border: 'border-amber-200',
    dot: 'bg-amber-500',
  },
  activo: {
    label: 'Activo',
    bg: 'bg-green-50',
    text: 'text-green-700',
    border: 'border-green-200',
    dot: 'bg-green-500',
  },
  inactivo: {
    label: 'Inactivo',
    bg: 'bg-slate-50',
    text: 'text-slate-600',
    border: 'border-slate-200',
    dot: 'bg-slate-400',
  },
  prospecto: {
    label: 'Prospecto',
    bg: 'bg-violet-50',
    text: 'text-violet-700',
    border: 'border-violet-200',
    dot: 'bg-violet-500',
  },
  programada: {
    label: 'Programada',
    bg: 'bg-blue-50',
    text: 'text-blue-700',
    border: 'border-blue-200',
    dot: 'bg-blue-500',
  },
  confirmada: {
    label: 'Confirmada',
    bg: 'bg-green-50',
    text: 'text-green-700',
    border: 'border-green-200',
    dot: 'bg-green-500',
  },
  en_progreso: {
    label: 'En Progreso',
    bg: 'bg-orange-50',
    text: 'text-orange-700',
    border: 'border-orange-200',
    dot: 'bg-orange-500',
  },
  completada: {
    label: 'Completada',
    bg: 'bg-emerald-50',
    text: 'text-emerald-700',
    border: 'border-emerald-200',
    dot: 'bg-emerald-500',
  },
  cancelada: {
    label: 'Cancelada',
    bg: 'bg-rose-50',
    text: 'text-rose-700',
    border: 'border-rose-200',
    dot: 'bg-rose-500',
  },
  nueva: {
    label: 'Nueva',
    bg: 'bg-sky-50',
    text: 'text-sky-700',
    border: 'border-sky-200',
    dot: 'bg-sky-500',
  },
  en_revision: {
    label: 'En Revisión',
    bg: 'bg-amber-50',
    text: 'text-amber-700',
    border: 'border-amber-200',
    dot: 'bg-amber-500',
  },
  cotizada: {
    label: 'Cotizada',
    bg: 'bg-indigo-50',
    text: 'text-indigo-700',
    border: 'border-indigo-200',
    dot: 'bg-indigo-500',
  },
};

// Props del componente
interface StatusBadgeProps {
  status: StatusType; // Estado a mostrar
  size?: 'sm' | 'md'; // Tamaño del badge (sm = compacto, md = normal)
}

export default function StatusBadge({ status, size = 'md' }: StatusBadgeProps) {
  // Obtiene la configuración del estado, usa 'borrador' como fallback si no existe
  const config = statusConfig[status] ?? statusConfig.borrador;

  return (
    // Badge con punto de color + etiqueta de texto
    <span
      className={`inline-flex items-center gap-1.5 font-500 border rounded-full
        ${config.bg} ${config.text} ${config.border}
        ${size === 'sm' ? 'text-[10px] px-2 py-0.5' : 'text-xs px-2.5 py-1'}`}
    >
      {/* Punto de color indicador del estado */}
      <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${config.dot}`} />
      {/* Etiqueta de texto del estado */}
      {config.label}
    </span>
  );
}