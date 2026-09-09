/**
 * Ruta de callback para autenticación OAuth y magic links de Supabase
 * Intercambia el código de autorización por una sesión activa
 */
import { createClient } from '@/lib/supabase/server';
import { NextResponse } from 'next/server';
import { type NextRequest } from 'next/server';

export async function GET(request: NextRequest) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get('code');
  const next = searchParams.get('next') ?? '/dashboard';

  if (code) {
    const supabase = await createClient();
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (!error) {
      return NextResponse.redirect(`${origin}${next}`);
    }
  }

  // Si hay error, redirige a la página de error de autenticación
  return NextResponse.redirect(`${origin}/login?error=auth`);
}
