import { createClient } from '@supabase/supabase-js';

// Cliente com PODER TOTAL (ignora RLS). Use APENAS no servidor,
// nunca exponha a SERVICE_ROLE_KEY no navegador.
export function criarClienteAdmin() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { persistSession: false } }
  );
}

// Verifica se um email está na lista de admins (definida no .env.local).
export function ehAdmin(email: string | null | undefined): boolean {
  if (!email) return false;
  const lista = (process.env.NEXT_PUBLIC_ADMIN_EMAILS || '')
    .split(',')
    .map((e) => e.trim().toLowerCase())
    .filter(Boolean);
  return lista.includes(email.toLowerCase());
}
