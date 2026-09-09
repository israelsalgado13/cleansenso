/**
 * Layout raíz de la aplicación CleanSenso
 * Define la fuente global (Plus Jakarta Sans), metadatos SEO,
 * y envuelve toda la app con el AuthProvider para autenticación
 */
import React from 'react';
import type { Metadata, Viewport } from 'next';
import { Plus_Jakarta_Sans } from 'next/font/google';
import '../styles/tailwind.css';
import { Toaster } from 'sonner';
import { AuthProvider } from '@/contexts/AuthContext';

// Configuración de la fuente Plus Jakarta Sans con variantes de peso
const plusJakartaSans = Plus_Jakarta_Sans({
  subsets: ['latin'],
  weight: ['400', '500', '600', '700', '800'],
  variable: '--font-plus-jakarta-sans',
  display: 'swap', // Muestra texto con fuente del sistema mientras carga la fuente web
});

// Configuración del viewport para dispositivos móviles
export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
};

// Metadatos SEO de la aplicación
export const metadata: Metadata = {
  title: 'CleanSenso — Gestión de Servicios de Limpieza',
  description:
    'Sistema web para la gestión de solicitudes, cotizaciones y citas de servicios de limpieza de CleanSenso, parte del Grupo Consenso Perú.',
  icons: {
    icon: [{ url: '/favicon.ico', type: 'image/x-icon' }],
  },
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    // Idioma español para accesibilidad y SEO
    <html lang="es" className={plusJakartaSans.variable}>
      <body className={plusJakartaSans.className}>
        {/* AuthProvider envuelve toda la app para proveer estado de autenticación */}
        <AuthProvider>
          {children}
          {/* Sistema de notificaciones toast en la esquina inferior derecha */}
          <Toaster position="bottom-right" richColors />
        </AuthProvider>

        {/* Scripts de análisis y seguimiento de Rocket */}

        <script type="module" async src="https://static.rocket.new/rocket-web.js?_cfg=https%3A%2F%2Fcleansenso8072back.builtwithrocket.new&_be=https%3A%2F%2Fappanalytics.rocket.new&_v=0.1.20" />
        <script type="module" defer src="https://static.rocket.new/rocket-shot.js?v=0.0.3" /></body>
    </html>
  );
}