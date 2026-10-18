import { act, renderHook, screen, waitFor } from '@testing-library/react';
import { QueryClientProvider } from '@tanstack/react-query';
import type { ReactNode } from 'react';
import { queryClient } from '../lib/queryClient';
import { ToastProvider } from '../ui/Toast';
import { useCheckin } from './checkins';

const rpc = vi.fn();
vi.mock('../lib/supabase', async (orig) => ({
  ...(await orig<typeof import('../lib/supabase')>()),
  supabase: { rpc: (...args: unknown[]) => rpc(...args) },
}));

function Providers({ children }: { children: ReactNode }) {
  return (
    <QueryClientProvider client={queryClient}>
      <ToastProvider>{children}</ToastProvider>
    </QueryClientProvider>
  );
}

beforeEach(() => queryClient.clear());

it('check-in recusado pelo servidor some do cache e avisa o usuário', async () => {
  rpc.mockResolvedValue({ data: null, error: { message: 'checkin_fora_da_janela' } });
  queryClient.setQueryData(['checkins'], ['2026-10-17']);
  const { result } = renderHook(() => useCheckin(), { wrapper: Providers });

  act(() => result.current.mutate('2026-10-18'));

  expect(await screen.findByText('Esse dia já fechou. O check-in não foi registrado.')).toBeInTheDocument();
  expect(rpc).toHaveBeenCalledWith('do_checkin', { p_date: '2026-10-18' });
  await waitFor(() => expect(queryClient.getQueryData(['checkins'])).toEqual(['2026-10-17']));
});

it('check-in aceito aparece no cache na hora', async () => {
  rpc.mockReturnValue(new Promise(() => {})); // servidor ainda não respondeu
  queryClient.setQueryData(['checkins'], ['2026-10-17']);
  const { result } = renderHook(() => useCheckin(), { wrapper: Providers });
  act(() => result.current.mutate('2026-10-18'));
  await waitFor(() => expect(queryClient.getQueryData(['checkins'])).toEqual(['2026-10-17', '2026-10-18']));
});
