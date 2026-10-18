import { translateAuthError } from './auth';

vi.mock('./supabase', () => ({ supabase: {}, isSupabaseConfigured: false }));

it('falha de rede sem configuração aponta as variáveis de ambiente', () => {
  expect(translateAuthError('Failed to fetch')).toBe(
    'O app foi publicado sem a configuração do servidor (VITE_SUPABASE_URL e VITE_SUPABASE_ANON_KEY, ou a integração Supabase da Vercel). Configure as variáveis e publique de novo.',
  );
});
