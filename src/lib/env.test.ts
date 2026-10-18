import { resolveSupabaseEnv } from './env';

it('usa as variáveis VITE_ quando existem', () => {
  expect(resolveSupabaseEnv({ VITE_SUPABASE_URL: 'https://a.supabase.co', VITE_SUPABASE_ANON_KEY: 'k1', NEXT_PUBLIC_SUPABASE_URL: 'https://b.supabase.co', NEXT_PUBLIC_SUPABASE_ANON_KEY: 'k2' }))
    .toEqual({ url: 'https://a.supabase.co', anonKey: 'k1' });
});

it('aceita os nomes criados pela integração Supabase da Vercel', () => {
  expect(resolveSupabaseEnv({ NEXT_PUBLIC_SUPABASE_URL: 'https://b.supabase.co', NEXT_PUBLIC_SUPABASE_ANON_KEY: 'k2' }))
    .toEqual({ url: 'https://b.supabase.co', anonKey: 'k2' });
});

it('sem nenhuma variável devolve vazio', () => {
  expect(resolveSupabaseEnv({})).toEqual({ url: '', anonKey: '' });
});
