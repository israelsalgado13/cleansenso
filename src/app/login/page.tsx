'use client';

/**
 * Página de inicio de sesión de CleanSenso
 * Permite autenticación con email y contraseña usando Supabase Auth
 * Muestra credenciales de demostración para facilitar el acceso inicial
 */

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import AppLogo from '@/components/ui/AppLogo';
import { Eye, EyeOff, LogIn, AlertCircle } from 'lucide-react';

// Credenciales de demostración para facilitar el acceso inicial
const DEMO_CREDENTIALS = [
  { role: 'Administrador', email: 'admin@cleansenso.pe', password: 'Admin2026!', color: 'bg-primary/10 text-primary border-primary/20' },
  { role: 'Supervisor', email: 'supervisor@cleansenso.pe', password: 'Super2026!', color: 'bg-violet-50 text-violet-700 border-violet-200' },
];

export default function LoginPage() {
  const router = useRouter();
  const { signIn } = useAuth();

  // Estado del formulario
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  /**
   * Maneja el envío del formulario de login
   * Valida campos, llama a Supabase Auth y redirige al dashboard
   */
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    // Validación básica de campos
    if (!email.trim() || !password.trim()) {
      setError('Por favor ingresa tu correo y contraseña.');
      return;
    }

    setLoading(true);
    try {
      await signIn(email.trim(), password);
      router.push('/dashboard');
      router.refresh();
    } catch (err: any) {
      // Mapea errores de Supabase a mensajes amigables en español
      if (err?.message?.includes('Invalid login credentials')) {
        setError('Correo o contraseña incorrectos. Verifica tus datos e intenta nuevamente.');
      } else if (err?.message?.includes('Email not confirmed')) {
        setError('Tu correo aún no ha sido verificado. Revisa tu bandeja de entrada.');
      } else if (err?.message?.includes('Too many requests')) {
        setError('Demasiados intentos fallidos. Espera unos minutos antes de intentar nuevamente.');
      } else {
        setError('Ocurrió un error al iniciar sesión. Intenta nuevamente.');
      }
    } finally {
      setLoading(false);
    }
  };

  /**
   * Rellena el formulario con las credenciales de demostración seleccionadas
   */
  const fillDemo = (cred: typeof DEMO_CREDENTIALS[0]) => {
    setEmail(cred.email);
    setPassword(cred.password);
    setError(null);
  };

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <div className="w-full max-w-md">

        {/* Encabezado con logo y nombre de la empresa */}
        <div className="text-center mb-8">
          <div className="flex items-center justify-center gap-3 mb-3">
            <AppLogo size={44} />
            <div className="text-left">
              <h1 className="text-xl font-800 text-foreground leading-tight">CleanSenso</h1>
              <p className="text-xs text-muted-foreground">Grupo Consenso Perú</p>
            </div>
          </div>
          <p className="text-sm text-muted-foreground mt-2">
            Sistema de gestión de servicios de limpieza
          </p>
        </div>

        {/* Tarjeta principal del formulario */}
        <div className="bg-card border border-border rounded-2xl shadow-sm p-8">
          <h2 className="text-lg font-700 text-foreground mb-1">Iniciar Sesión</h2>
          <p className="text-sm text-muted-foreground mb-6">
            Ingresa tus credenciales para acceder al sistema
          </p>

          {/* Mensaje de error de autenticación */}
          {error && (
            <div className="flex items-start gap-2.5 p-3 mb-5 bg-rose-50 border border-rose-200 rounded-lg">
              <AlertCircle size={16} className="text-rose-600 shrink-0 mt-0.5" />
              <p className="text-sm text-rose-700">{error}</p>
            </div>
          )}

          {/* Formulario de login */}
          <form onSubmit={handleSubmit} className="space-y-4">

            {/* Campo de correo electrónico */}
            <div>
              <label htmlFor="email" className="block text-sm font-600 text-foreground mb-1.5">
                Correo Electrónico
              </label>
              <input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="usuario@cleansenso.pe"
                autoComplete="email"
                className="w-full px-3 py-2.5 text-sm bg-background border border-input rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary transition-colors placeholder:text-muted-foreground"
              />
            </div>

            {/* Campo de contraseña con toggle de visibilidad */}
            <div>
              <label htmlFor="password" className="block text-sm font-600 text-foreground mb-1.5">
                Contraseña
              </label>
              <div className="relative">
                <input
                  id="password"
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  autoComplete="current-password"
                  className="w-full px-3 py-2.5 pr-10 text-sm bg-background border border-input rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary transition-colors placeholder:text-muted-foreground"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                  aria-label={showPassword ? 'Ocultar contraseña' : 'Mostrar contraseña'}
                >
                  {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
            </div>

            {/* Botón de envío */}
            <button
              type="submit"
              disabled={loading}
              className="w-full flex items-center justify-center gap-2 py-2.5 px-4 bg-primary text-primary-foreground text-sm font-600 rounded-lg hover:bg-primary/90 disabled:opacity-60 transition-all active:scale-[0.98]"
            >
              {loading ? (
                <>
                  <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  Verificando...
                </>
              ) : (
                <>
                  <LogIn size={16} />
                  Ingresar al Sistema
                </>
              )}
            </button>
          </form>
        </div>

        {/* Sección de credenciales de demostración */}
        <div className="mt-6">
          <p className="text-xs text-center text-muted-foreground mb-3 font-500 uppercase tracking-wide">
            Acceso de demostración
          </p>
          <div className="grid grid-cols-2 gap-2">
            {DEMO_CREDENTIALS.map((cred) => (
              <button
                key={cred.role}
                onClick={() => fillDemo(cred)}
                className={`flex flex-col items-center gap-1 p-3 rounded-xl border text-xs font-600 transition-all hover:scale-[1.02] active:scale-[0.98] ${cred.color}`}
              >
                <span>{cred.role}</span>
                <span className="font-400 opacity-70 truncate w-full text-center text-[10px]">
                  {cred.email.split('@')[0]}
                </span>
              </button>
            ))}
          </div>
          <p className="text-[10px] text-center text-muted-foreground mt-2">
            Haz clic en un rol para rellenar las credenciales automáticamente
          </p>
        </div>

        {/* Pie de página */}
        <p className="text-center text-xs text-muted-foreground mt-6">
          © 2026 Grupo Consenso Perú — CleanSenso v1.0
        </p>
      </div>
    </div>
  );
}
