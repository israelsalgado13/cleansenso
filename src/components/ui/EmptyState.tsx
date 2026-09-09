/**
 * Componente de estado vacío reutilizable
 * Se muestra cuando una tabla o lista no tiene datos para mostrar
 * Acepta un icono, título, descripción y una acción opcional (ej: botón "Crear")
 */

import React from 'react';

// Props del componente
interface EmptyStateProps {
  icon: React.ReactNode;       // Icono representativo del módulo vacío
  title: string;               // Título del estado vacío (ej: "Sin cotizaciones")
  description: string;         // Descripción de qué hacer para agregar datos
  action?: React.ReactNode;    // Botón de acción opcional (ej: "Crear primera cotización")
}

export default function EmptyState({ icon, title, description, action }: EmptyStateProps) {
  return (
    // Contenedor centrado con padding vertical generoso
    <div className="flex flex-col items-center justify-center py-16 px-4 text-center">
      {/* Círculo con el icono del módulo */}
      <div className="w-14 h-14 rounded-full bg-muted flex items-center justify-center mb-4 text-muted-foreground">
        {icon}
      </div>

      {/* Título del estado vacío */}
      <h3 className="text-base font-600 text-foreground mb-1">{title}</h3>

      {/* Descripción con instrucciones para el usuario */}
      <p className="text-sm text-muted-foreground max-w-xs mb-4">{description}</p>

      {/* Acción opcional (botón para crear el primer registro) */}
      {action}
    </div>
  );
}