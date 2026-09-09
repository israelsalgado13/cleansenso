/**
 * Layout principal de la aplicación CleanSenso
 * Envuelve todas las páginas internas con la barra lateral (Sidebar)
 * y la barra superior (TopBar), dejando el contenido en el área central
 */
import React from 'react';
import Sidebar from './Sidebar';
import TopBar from './TopBar';

// Props que acepta el layout: contenido hijo, título, subtítulo y acciones opcionales
interface AppLayoutProps {
  children: React.ReactNode; // Contenido de la página
  title?: string;            // Título que aparece en la TopBar
  subtitle?: string;         // Subtítulo descriptivo en la TopBar
  actions?: React.ReactNode; // Botones de acción en la esquina derecha de la TopBar
}

export default function AppLayout({ children, title, subtitle, actions }: AppLayoutProps) {
  return (
    // Contenedor principal: sidebar a la izquierda, contenido a la derecha
    <div className="flex min-h-screen bg-background">
      {/* Barra lateral de navegación */}
      <Sidebar />

      {/* Área de contenido principal */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Barra superior con título y acciones */}
        <TopBar title={title} subtitle={subtitle} actions={actions} />

        {/* Contenido de la página con padding y ancho máximo */}
        <main className="flex-1 px-6 lg:px-8 xl:px-10 py-6 max-w-screen-2xl w-full mx-auto">
          {children}
        </main>
      </div>
    </div>
  );
}