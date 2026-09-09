/**
 * Cliente Supabase para componentes del lado del servidor
 * Usado en Server Components, Server Actions y Route Handlers
 */
import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';

/**
 * Crea y retorna el cliente Supabase para uso en el servidor
 * Lee y escribe cookies del request/response de Next.js
 */
export async function createClient() {
  const cookieStore = await cookies();

  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, {
                ...options,
                sameSite: 'none',
                secure: true,
              })
            );
          } catch {
            // En Server Components de solo lectura — comportamiento esperado
          }
        },
      },
    }
  );
}
