import { useEffect, useState } from 'react';
import type { Session } from '@supabase/supabase-js';
import { isSupabaseConfigured, supabase } from './supabase';
import { clearPersistedCache } from './queryClient';

export function useSession(): { session: Session | null; loading: boolean } {
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session);
      setLoading(false);
    });
    const { data } = supabase.auth.onAuthStateChange((_event, s) => setSession(s));
    return () => data.subscription.unsubscribe();
  }, []);
  return { session, loading };
}

const AUTH_ERRORS: Record<string, string> = {
  'Invalid login credentials': 'E-mail ou senha incorretos.',
  'Email not confirmed': 'Confirme seu e-mail pelo link que enviamos e depois entre.',
  'User already registered': 'Já existe uma conta com esse e-mail. Entre com sua senha.',
  'Signups not allowed for this instance': 'Novos cadastros estão desativados.',
};

export function translateAuthError(message: string): string {
  if (/failed to fetch|load failed|networkerror/i.test(message)) {
    return isSupabaseConfigured
      ? 'Não foi possível conectar ao servidor. Verifique a internet e tente de novo.'
      : 'O app foi publicado sem a configuração do servidor (VITE_SUPABASE_URL e VITE_SUPABASE_ANON_KEY). Configure as variáveis e publique de novo.';
  }
  if (message.startsWith('Password should be at least')) return 'A senha precisa ter pelo menos 6 caracteres.';
  return AUTH_ERRORS[message] ?? message;
}

export async function signIn(email: string, password: string): Promise<void> {
  const { error } = await supabase.auth.signInWithPassword({ email, password });
  if (error) throw new Error(translateAuthError(error.message));
}

/** Retorna true se a conta já entrou; false se o Supabase exige confirmar o e-mail antes. */
export async function signUp(email: string, password: string): Promise<boolean> {
  const { data, error } = await supabase.auth.signUp({ email, password, options: { emailRedirectTo: window.location.origin } });
  if (error) throw new Error(translateAuthError(error.message));
  return data.session !== null;
}

export async function signOut(): Promise<void> {
  await supabase.auth.signOut();
  clearPersistedCache();
}
