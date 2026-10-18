import { translateAuthError } from './auth';

vi.mock('./supabase', () => ({ supabase: {}, isSupabaseConfigured: true }));

it('falha de rede com configuração vira mensagem de conexão', () => {
  expect(translateAuthError('Failed to fetch')).toBe('Não foi possível conectar ao servidor. Verifique a internet e tente de novo.');
  expect(translateAuthError('Load failed')).toBe('Não foi possível conectar ao servidor. Verifique a internet e tente de novo.');
});
