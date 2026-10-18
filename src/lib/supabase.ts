import { createClient } from '@supabase/supabase-js';

/** Falso quando o app foi gerado sem as variáveis VITE_SUPABASE_* (o Vite as embute no build). */
export const isSupabaseConfigured = Boolean(import.meta.env.VITE_SUPABASE_URL && import.meta.env.VITE_SUPABASE_ANON_KEY);

const url = import.meta.env.VITE_SUPABASE_URL || 'http://localhost:54321';
const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || 'missing-anon-key';

export const supabase = createClient(url, anonKey, {
  auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: true },
});

const PAGE = 1000;

/**
 * Busca todas as linhas, página por página: o PostgREST devolve no máximo 1000 por consulta
 * e corta o resto sem erro. A consulta passada precisa ter ordem estável.
 */
export async function fetchAll<T>(
  page: (from: number, to: number) => PromiseLike<{ data: T[] | null; error: { message: string } | null }>,
): Promise<T[]> {
  const out: T[] = [];
  for (let from = 0; ; from += PAGE) {
    const rows = unwrap(await page(from, from + PAGE - 1)) ?? [];
    out.push(...rows);
    if (rows.length < PAGE) return out;
  }
}

/** Lança o erro do Supabase, mantendo a mensagem original (usada para traduzir RPCs conhecidas). */
export function unwrap<T>(res: { data: T; error: { message: string } | null }): T {
  if (res.error) throw new Error(res.error.message);
  return res.data;
}
