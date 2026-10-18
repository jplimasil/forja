import { act, renderHook, screen, waitFor } from '@testing-library/react';
import { QueryClientProvider } from '@tanstack/react-query';
import type { ReactNode } from 'react';
import { queryClient } from '../lib/queryClient';
import { ToastProvider } from '../ui/Toast';
import { useFreeze } from './freezes';

const rpc = vi.fn();
vi.mock('../lib/supabase', async (orig) => ({
  ...(await orig<typeof import('../lib/supabase')>()),
  supabase: { rpc: (...args: unknown[]) => rpc(...args) },
}));

const wrapper = ({ children }: { children: ReactNode }) => (
  <QueryClientProvider client={queryClient}><ToastProvider>{children}</ToastProvider></QueryClientProvider>
);

it('congelar passa pela RPC que valida as regras no servidor', async () => {
  rpc.mockResolvedValue({ data: null, error: null });
  const { result } = renderHook(() => useFreeze(), { wrapper });
  act(() => result.current.mutate('2026-10-12'));
  await waitFor(() => expect(rpc).toHaveBeenCalledWith('freeze_week'));
});

it('recusa do servidor vira mensagem clara', async () => {
  rpc.mockResolvedValue({ data: null, error: { message: 'congelamento_limite_mensal' } });
  const { result } = renderHook(() => useFreeze(), { wrapper });
  act(() => result.current.mutate('2026-10-12'));
  expect(await screen.findByText('Você já congelou uma semana este mês.')).toBeInTheDocument();
});
