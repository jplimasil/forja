import { createClient } from '@supabase/supabase-js';

const url = import.meta.env.VITE_SUPABASE_URL ?? 'http://localhost:54321';
const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY ?? 'missing-anon-key';

export const supabase = createClient(url, anonKey, {
  auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: true },
});

/** Lança o erro do Supabase, mantendo a mensagem original (usada para traduzir RPCs conhecidas). */
export function unwrap<T>(res: { data: T; error: { message: string } | null }): T {
  if (res.error) throw new Error(res.error.message);
  return res.data;
}
