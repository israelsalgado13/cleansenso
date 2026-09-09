'use client';

/**
 * Modal de confirmación reutilizable
 * Muestra un diálogo de advertencia con icono, mensaje y botones Cancelar/Confirmar
 * Usado para confirmar acciones destructivas como eliminar registros
 */

import React from 'react';
import Modal from './Modal';
import { AlertTriangle } from 'lucide-react';

// Props del modal de confirmación
interface ConfirmModalProps {
  open: boolean;              // Controla si el modal está visible
  onClose: () => void;        // Función para cancelar y cerrar
  onConfirm: () => void;      // Función que se ejecuta al confirmar
  title: string;              // Título de la acción a confirmar
  description: string;        // Descripción del impacto de la acción
  confirmLabel?: string;      // Texto del botón de confirmación (por defecto: "Confirmar")
  loading?: boolean;          // Muestra spinner mientras se procesa la acción
}

export default function ConfirmModal({
  open,
  onClose,
  onConfirm,
  title,
  description,
  confirmLabel = 'Confirmar',
  loading = false,
}: ConfirmModalProps) {
  return (
    <Modal
      open={open}
      onClose={onClose}
      title=""
      size="sm"
      // Botones de acción en el pie del modal
      footer={
        <>
          {/* Botón para cancelar la acción */}
          <button
            onClick={onClose}
            className="px-4 py-2 text-sm font-500 text-secondary-foreground bg-secondary border border-border rounded-md hover:bg-muted transition-colors"
          >
            Cancelar
          </button>

          {/* Botón de confirmación — color rojo para indicar acción destructiva */}
          <button
            onClick={onConfirm}
            disabled={loading}
            className="px-4 py-2 text-sm font-600 bg-rose-600 text-white rounded-md hover:bg-rose-700 disabled:opacity-50 transition-all duration-150 active:scale-95 flex items-center gap-2"
          >
            {/* Spinner de carga mientras se procesa */}
            {loading && (
              <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
            )}
            {confirmLabel}
          </button>
        </>
      }
    >
      {/* Contenido centrado: icono de advertencia, título y descripción */}
      <div className="flex flex-col items-center text-center py-2">
        {/* Icono de advertencia en círculo rojo */}
        <div className="w-12 h-12 rounded-full bg-rose-100 flex items-center justify-center mb-4">
          <AlertTriangle size={22} className="text-rose-600" />
        </div>
        {/* Título de la acción */}
        <h3 className="text-base font-700 text-foreground mb-2">{title}</h3>
        {/* Descripción del impacto */}
        <p className="text-sm text-muted-foreground">{description}</p>
      </div>
    </Modal>
  );
}