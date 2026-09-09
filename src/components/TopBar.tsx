'use client';

/**
 * Barra superior (TopBar) de la aplicación CleanSenso
 * Muestra el título de la página actual, una barra de búsqueda global,
 * el botón de notificaciones y las acciones específicas de cada módulo
 */

import React from 'react';
import { Bell, Search } from 'lucide-react';

// Props que recibe la TopBar desde AppLayout
interface TopBarProps {
  title?: string;            // Título del módulo actual
  subtitle?: string;         // Descripción corta del módulo
  actions?: React.ReactNode; // Botones de acción (ej: "Nueva Cotización")
}

export default function TopBar({ title, subtitle, actions }: TopBarProps) {
  return (
    // Barra fija en la parte superior con altura de 64px
    <header className="h-16 border-b border-border bg-card flex items-center px-6 lg:px-8 xl:px-10 gap-4 shrink-0">

      {/* Sección izquierda: título y subtítulo del módulo */}
      <div className="flex-1 min-w-0">
        {title && (
          <div className="flex items-baseline gap-2">
            {/* Título principal del módulo */}
            <h1 className="text-lg font-700 text-foreground truncate">{title}</h1>
            {/* Subtítulo descriptivo (oculto en pantallas pequeñas) */}
            {subtitle && (
              <span className="text-sm text-muted-foreground hidden sm:block">{subtitle}</span>
            )}
          </div>
        )}
      </div>

      {/* Sección derecha: búsqueda, notificaciones y acciones */}
      <div className="flex items-center gap-2">

        {/* Barra de búsqueda global (visible solo en pantallas medianas y grandes) */}
        <div className="relative hidden md:block">
          <Search
            size={15}
            className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground pointer-events-none"
          />
          <input
            type="text"
            placeholder="Buscar..."
            className="pl-9 pr-4 py-2 text-sm bg-muted border border-border rounded-md focus:outline-none focus:ring-2 focus:ring-ring focus:border-transparent w-52 placeholder:text-muted-foreground"
          />
        </div>

        {/* Botón de notificaciones con indicador de nuevas notificaciones */}
        <button className="relative w-9 h-9 rounded-md flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-muted transition-colors">
          <Bell size={18} />
          {/* Punto rojo indicador de notificaciones sin leer */}
          <span className="absolute top-1.5 right-1.5 w-2 h-2 rounded-full bg-accent" />
        </button>

        {/* Acciones específicas del módulo (ej: botón "Nueva Cotización") */}
        {actions && <div className="flex items-center gap-2 ml-2">{actions}</div>}
      </div>
    </header>
  );
}