'use client';

/**
 * Componente Modal reutilizable
 * Muestra un diálogo centrado con overlay oscuro, título, contenido y footer opcional
 * Bloquea el scroll del body mientras está abierto
 */

import React, { useEffect } from 'react';
import { X } from 'lucide-react';

// Props del modal
interface ModalProps {
  open: boolean;              // Controla si el modal está visible
  onClose: () => void;        // Función para cerrar el modal
  title: string;              // Título del modal
  subtitle?: string;          // Subtítulo descriptivo opcional
  children: React.ReactNode;  // Contenido del modal
  size?: 'sm' | 'md' | 'lg' | 'xl'; // Tamaño del modal
  footer?: React.ReactNode;   // Botones de acción en el pie del modal
}

// Mapa de tamaños a clases de Tailwind
const sizeMap = {
  sm: 'max-w-md',
  md: 'max-w-xl',
  lg: 'max-w-2xl',
  xl: 'max-w-4xl',
};

export default function Modal({
  open,
  onClose,
  title,
  subtitle,
  children,
  size = 'md',
  footer,
}: ModalProps) {

  // Bloquea el scroll del body cuando el modal está abierto
  useEffect(() => {
    if (open) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    // Limpia el overflow al desmontar el componente
    return () => {
      document.body.style.overflow = '';
    };
  }, [open]);

  // No renderiza nada si el modal está cerrado
  if (!open) return null;

  return (
    // Contenedor de pantalla completa con z-index alto para superponerse al contenido
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="modal-title"
    >
      {/* Overlay oscuro — al hacer clic cierra el modal */}
      <div
        className="absolute inset-0 bg-foreground/40 backdrop-blur-sm fade-in"
        onClick={onClose}
      />

      {/* Contenedor del modal con tamaño dinámico */}
      <div
        className={`relative w-full ${sizeMap[size]} bg-card rounded-xl shadow-2xl border border-border modal-enter flex flex-col max-h-[90vh]`}
      >
        {/* Encabezado: título, subtítulo y botón de cierre */}
        <div className="flex items-start justify-between px-6 py-4 border-b border-border shrink-0">
          <div>
            <h2 id="modal-title" className="text-base font-700 text-foreground">
              {title}
            </h2>
            {/* Subtítulo opcional */}
            {subtitle && <p className="text-sm text-muted-foreground mt-0.5">{subtitle}</p>}
          </div>
          {/* Botón X para cerrar el modal */}
          <button
            onClick={onClose}
            className="ml-4 w-8 h-8 rounded-md flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
            aria-label="Cerrar modal"
          >
            <X size={16} />
          </button>
        </div>

        {/* Cuerpo del modal con scroll interno */}
        <div className="flex-1 overflow-y-auto px-6 py-5 scrollbar-thin">{children}</div>

        {/* Pie del modal con botones de acción (opcional) */}
        {footer && (
          <div className="px-6 py-4 border-t border-border bg-muted/30 rounded-b-xl flex items-center justify-end gap-3 shrink-0">
            {footer}
          </div>
        )}
      </div>
    </div>
  );
}