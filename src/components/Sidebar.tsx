'use client';

/**
 * Barra lateral de navegación principal de CleanSenso
 * Muestra los módulos del sistema agrupados por categoría
 * Incluye información del usuario autenticado y botón de cierre de sesión
 * Soporta modo colapsado para mayor espacio en pantalla
 */

import React, { useState } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import AppLogo from '@/components/ui/AppLogo';
import { useAuth } from '@/contexts/AuthContext';
import {
  FileText, Users, CalendarDays, ChevronLeft, ChevronRight,
  Settings, BarChart3, LogOut, Wrench, LayoutDashboard, User,
} from 'lucide-react';
import { toast } from 'sonner';

// ── Tipos de navegación ────────────────────────────────────────────────────────

interface NavItem {
  id: string;
  label: string;
  href: string;
  icon: React.ReactNode;
  badge?: number;
  group: string;
}

// ── Definición de ítems de navegación ─────────────────────────────────────────

const navItems: NavItem[] = [
  {
    id: 'nav-dashboard',
    label: 'Dashboard',
    href: '/dashboard',
    icon: <LayoutDashboard size={18} />,
    group: 'Principal',
  },
  {
    id: 'nav-quotes',
    label: 'Cotizaciones',
    href: '/',
    icon: <FileText size={18} />,
    group: 'Operaciones',
  },
  {
    id: 'nav-clients',
    label: 'Clientes',
    href: '/client-management',
    icon: <Users size={18} />,
    group: 'Operaciones',
  },
  {
    id: 'nav-appointments',
    label: 'Citas y Agenda',
    href: '/appointments-schedule-management',
    icon: <CalendarDays size={18} />,
    group: 'Operaciones',
  },
  {
    id: 'nav-services',
    label: 'Servicios',
    href: '/services',
    icon: <Wrench size={18} />,
    group: 'Catálogo',
  },
  {
    id: 'nav-reports',
    label: 'Reportes',
    href: '/reports',
    icon: <BarChart3 size={18} />,
    group: 'Administración',
  },
  {
    id: 'nav-settings',
    label: 'Configuración',
    href: '/settings',
    icon: <Settings size={18} />,
    group: 'Administración',
  },
];

// Grupos de navegación en orden de aparición
const groups = ['Principal', 'Operaciones', 'Catálogo', 'Administración'];

// Etiquetas de rol en español para mostrar en la interfaz
const roleLabels: Record<string, string> = {
  admin: 'Administrador',
  supervisor: 'Supervisor',
};

export default function Sidebar() {
  const [collapsed, setCollapsed] = useState(false);
  const pathname = usePathname();
  const router = useRouter();
  const { profile, signOut } = useAuth();

  /**
   * Determina si un ítem de navegación está activo según la ruta actual
   */
  const isActive = (href: string) => {
    if (href === '/') return pathname === '/';
    return pathname.startsWith(href);
  };

  /**
   * Maneja el cierre de sesión del usuario
   * Redirige al login después de cerrar la sesión correctamente
   */
  const handleSignOut = async () => {
    try {
      await signOut();
      router.push('/login');
      router.refresh();
    } catch {
      toast.error('Error al cerrar sesión. Intenta nuevamente.');
    }
  };

  // Obtiene las iniciales del nombre del usuario para el avatar
  const getInitials = (name: string) => {
    return name.split(' ').slice(0, 2).map(n => n.charAt(0)).join('').toUpperCase();
  };

  const userName = profile?.full_name || 'Usuario';
  const userRole = profile?.role ? roleLabels[profile.role] || profile.role : 'Cargando...';
  const userInitials = getInitials(userName);

  return (
    <aside
      className={`relative flex flex-col bg-card border-r border-border sidebar-transition shrink-0 ${
        collapsed ? 'w-16' : 'w-60'
      }`}
      style={{ minHeight: '100vh' }}
    >
      {/* Logo y nombre de la aplicación */}
      <div
        className={`flex items-center border-b border-border h-16 px-4 ${
          collapsed ? 'justify-center' : 'gap-3'
        }`}
      >
        <AppLogo size={32} />
        {!collapsed && (
          <span className="font-bold text-base text-foreground tracking-tight leading-tight">
            CleanSenso
          </span>
        )}
      </div>

      {/* Badge del workspace con rol del usuario */}
      {!collapsed && (
        <div className="mx-3 mt-3 mb-1 px-3 py-2 rounded-md bg-primary/5 border border-primary/20">
          <p className="text-xs font-500 text-primary leading-tight">Grupo Consenso Perú</p>
          <p className="text-xs text-muted-foreground mt-0.5">{userRole}</p>
        </div>
      )}

      {/* Grupos de navegación */}
      <nav className="flex-1 overflow-y-auto py-3 scrollbar-thin">
        {groups.map((group) => {
          const items = navItems.filter((n) => n.group === group);
          return (
            <div key={`group-${group}`} className="mb-4">
              {!collapsed && (
                <p className="px-4 mb-1 text-[10px] font-600 uppercase tracking-widest text-muted-foreground">
                  {group}
                </p>
              )}
              {items.map((item) => {
                const active = isActive(item.href);
                return (
                  <Link
                    key={item.id}
                    href={item.href}
                    title={collapsed ? item.label : undefined}
                    className={`group relative flex items-center gap-3 mx-2 px-3 py-2.5 rounded-md text-sm font-500 transition-all duration-150 mb-0.5
                      ${active
                        ? 'bg-primary/10 text-primary' :'text-secondary-foreground hover:bg-muted hover:text-foreground'
                      }`}
                  >
                    <span className="shrink-0">{item.icon}</span>
                    {!collapsed && <span className="flex-1 truncate">{item.label}</span>}
                    {!collapsed && item.badge !== undefined && (
                      <span className="ml-auto text-[10px] font-700 bg-accent text-accent-foreground rounded-full px-1.5 py-0.5 leading-none tabular-nums">
                        {item.badge}
                      </span>
                    )}
                    {collapsed && item.badge !== undefined && (
                      <span className="absolute top-1.5 right-1.5 w-2 h-2 rounded-full bg-accent" />
                    )}
                    {/* Tooltip al colapsar */}
                    {collapsed && (
                      <span className="pointer-events-none absolute left-full ml-3 z-50 hidden group-hover:block whitespace-nowrap rounded-md bg-foreground text-background text-xs px-2 py-1 shadow-lg">
                        {item.label}
                      </span>
                    )}
                  </Link>
                );
              })}
            </div>
          );
        })}
      </nav>

      {/* Sección inferior: perfil del usuario y cierre de sesión */}
      <div className="border-t border-border p-3">
        {/* Enlace al perfil del supervisor */}
        {profile?.role === 'supervisor' && !collapsed && (
          <Link
            href="/supervisor-profile"
            className="flex items-center gap-2 px-2 py-1.5 mb-2 rounded-md text-xs text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
          >
            <User size={14} />
            <span>Mi Perfil</span>
          </Link>
        )}

        <div className={`flex items-center gap-3 px-2 py-2 rounded-md hover:bg-muted transition-colors ${collapsed ? 'justify-center' : ''}`}>
          {/* Avatar con iniciales del usuario */}
          <div className="w-8 h-8 rounded-full bg-primary/20 flex items-center justify-center shrink-0">
            <span className="text-xs font-700 text-primary">{userInitials}</span>
          </div>
          {!collapsed && (
            <div className="flex-1 min-w-0">
              <p className="text-sm font-600 text-foreground truncate">{userName}</p>
              <p className="text-xs text-muted-foreground truncate">{userRole}</p>
            </div>
          )}
          {/* Botón de cierre de sesión */}
          {!collapsed && (
            <button
              onClick={handleSignOut}
              title="Cerrar sesión"
              className="text-muted-foreground hover:text-rose-600 transition-colors"
            >
              <LogOut size={16} />
            </button>
          )}
        </div>
      </div>

      {/* Botón para colapsar/expandir la barra lateral */}
      <button
        onClick={() => setCollapsed(!collapsed)}
        className="absolute -right-3 top-20 z-10 w-6 h-6 rounded-full bg-card border border-border shadow-sm flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-muted transition-all duration-150"
        aria-label={collapsed ? 'Expandir menú' : 'Colapsar menú'}
      >
        {collapsed ? <ChevronRight size={12} /> : <ChevronLeft size={12} />}
      </button>
    </aside>
  );
}