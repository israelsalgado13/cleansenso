'use client';

/**
 * Contexto de autenticación global de CleanSenso
 * Provee el estado del usuario, sesión y métodos de auth a toda la aplicación
 * Incluye soporte para roles: admin, supervisor, cliente
 */

import { createContext, useContext, useEffect, useState } from 'react';
import { createClient } from '@/lib/supabase/client';

// Tipos para el perfil de usuario con roles
export type UserRole = 'admin' | 'supervisor';

export interface UserProfile {
  id: string;
  email: string;
  full_name: string;
  role: UserRole;
  avatar_url?: string;
  phone?: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

interface AuthContextType {
  user: any;
  session: any;
  profile: UserProfile | null;
  loading: boolean;
  signUp: (email: string, password: string, metadata?: any) => Promise<any>;
  signIn: (email: string, password: string) => Promise<any>;
  signOut: () => Promise<void>;
  getCurrentUser: () => Promise<any>;
  isEmailVerified: () => boolean;
  getUserProfile: () => Promise<UserProfile | null>;
  isAdmin: () => boolean;
  isSupervisor: () => boolean;
  isAdminOrSupervisor: () => boolean;
}

const AuthContext = createContext<AuthContextType>({} as AuthContextType);

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within AuthProvider');
  }
  return context;
};

export const AuthProvider = ({ children }: { children: React.ReactNode }) => {
  const [user, setUser] = useState<any>(null);
  const [session, setSession] = useState<any>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const supabase = createClient();

  /**
   * Carga el perfil del usuario desde la tabla user_profiles
   * Se llama automáticamente al detectar un cambio de sesión
   */
  const loadProfile = async (userId: string) => {
    try {
      const { data, error } = await supabase
        .from('user_profiles')
        .select('*')
        .eq('id', userId)
        .single();
      if (!error && data) {
        setProfile(data as UserProfile);
      }
    } catch {
      // Perfil no disponible aún — se cargará en el próximo ciclo
    }
  };

  useEffect(() => {
    // Obtiene la sesión inicial al montar el componente
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setUser(session?.user ?? null);
      if (session?.user) loadProfile(session.user.id);
      setLoading(false);
    });

    // Escucha cambios de estado de autenticación en tiempo real
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
      setUser(session?.user ?? null);
      if (session?.user) {
        loadProfile(session.user.id);
      } else {
        setProfile(null);
      }
      setLoading(false);
    });

    return () => subscription.unsubscribe();
  }, []);

  // Registro de nuevo usuario con metadatos de perfil
  const signUp = async (email: string, password: string, metadata = {}) => {
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          full_name: (metadata as any)?.fullName || '',
          avatar_url: (metadata as any)?.avatarUrl || '',
          role: (metadata as any)?.role || 'supervisor',
        },
        emailRedirectTo: `${window.location.origin}/auth/callback`,
      },
    });
    if (error) throw error;
    return data;
  };

  // Inicio de sesión con email y contraseña
  const signIn = async (email: string, password: string) => {
    const { data, error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) throw error;
    return data;
  };

  // Cierre de sesión
  const signOut = async () => {
    const { error } = await supabase.auth.signOut();
    if (error) throw error;
    setProfile(null);
  };

  // Obtiene el usuario actual desde Supabase Auth
  const getCurrentUser = async () => {
    const { data: { user }, error } = await supabase.auth.getUser();
    if (error) throw error;
    return user;
  };

  // Verifica si el correo del usuario está confirmado
  const isEmailVerified = () => user?.email_confirmed_at !== null;

  // Obtiene el perfil completo del usuario desde la base de datos
  const getUserProfile = async (): Promise<UserProfile | null> => {
    if (!user) return null;
    const { data, error } = await supabase
      .from('user_profiles')
      .select('*')
      .eq('id', user.id)
      .single();
    if (error) throw error;
    return data as UserProfile;
  };

  // Helpers de verificación de roles
  const isAdmin = () => profile?.role === 'admin';
  const isSupervisor = () => profile?.role === 'supervisor';
  const isAdminOrSupervisor = () => profile?.role === 'admin' || profile?.role === 'supervisor';

  const value: AuthContextType = {
    user,
    session,
    profile,
    loading,
    signUp,
    signIn,
    signOut,
    getCurrentUser,
    isEmailVerified,
    getUserProfile,
    isAdmin,
    isSupervisor,
    isAdminOrSupervisor,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};
