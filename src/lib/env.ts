/**
 * Configuração pública do app, embutida no build pelo Vite.
 * Aceita os nomes VITE_* e também os NEXT_PUBLIC_* que a integração Supabase da Vercel cria
 * (vite.config.ts expõe os dois prefixos). VITE_* tem prioridade.
 */
type Env = Record<string, string | undefined>;

export function resolveSupabaseEnv(env: Env): { url: string; anonKey: string } {
  return {
    url: env.VITE_SUPABASE_URL || env.NEXT_PUBLIC_SUPABASE_URL || '',
    anonKey: env.VITE_SUPABASE_ANON_KEY || env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '',
  };
}

export const supabaseEnv = resolveSupabaseEnv(import.meta.env as Env);

/** Chave pública VAPID (par da VAPID_PRIVATE_KEY guardada nos secrets da função tick). Pública por natureza. */
export const VAPID_PUBLIC_KEY: string =
  import.meta.env.VITE_VAPID_PUBLIC_KEY || 'BLRG6dFxGtvu0Je4E6w3jbPhGhpKMieLzx4fr2ptvyJpjdH0OidOk_G2OJ3xxHBjujNM5McNoMGndN5bJQ9H7EU';
