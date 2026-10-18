import { act, renderHook, screen, waitFor } from '@testing-library/react';
import { QueryClientProvider, onlineManager } from '@tanstack/react-query';
import type { ReactNode } from 'react';
import { queryClient, shouldPersistMutation } from '../lib/queryClient';
import { ToastProvider } from '../ui/Toast';
import { useCheckin } from './checkins';
import { useAddSet } from './workout';

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

beforeEach(() => { queryClient.clear(); rpc.mockReset(); });
afterEach(() => onlineManager.setOnline(true));

it('fila offline envia o check-in antes das séries ao reconectar', async () => {
  const order: string[] = [];
  let finishCheckin!: () => void;
  rpc.mockImplementation((fn: string) => {
    order.push(`start:${fn}`);
    if (fn === 'do_checkin') return new Promise((res) => { finishCheckin = () => { order.push('end:do_checkin'); res({ data: null, error: null }); }; });
    return Promise.resolve({ data: null, error: null });
  });
  const { result } = renderHook(() => ({ checkin: useCheckin(), addSet: useAddSet() }), { wrapper: Providers });

  onlineManager.setOnline(false);
  act(() => {
    result.current.checkin.mutate('2026-10-18');
    result.current.addSet.mutate({ id: 's1', date: '2026-10-18', exercise: 'Supino', muscleGroup: null, kind: null, setNumber: 1, reps: 10, weightKg: 60, rpe: null, done: true });
  });
  act(() => onlineManager.setOnline(true));
  await waitFor(() => expect(order).toContain('start:do_checkin'));
  await new Promise((r) => setTimeout(r, 20));
  expect(order).not.toContain('start:add_set');
  act(() => finishCheckin());
  await waitFor(() => expect(order).toEqual(['start:do_checkin', 'end:do_checkin', 'start:add_set']));
});

it('erro de rede no check-in tenta de novo em vez de descartar', async () => {
  rpc.mockRejectedValueOnce(new TypeError('Load failed')).mockResolvedValue({ data: null, error: null });
  queryClient.setQueryData(['checkins'], []);
  const { result } = renderHook(() => useCheckin(), { wrapper: Providers });
  act(() => result.current.mutate('2026-10-18'));
  await waitFor(() => expect(rpc).toHaveBeenCalledTimes(2), { timeout: 4000 });
  await waitFor(() => expect(result.current.isSuccess).toBe(true));
  expect(queryClient.getQueryData(['checkins'])).toEqual(['2026-10-18']);
  expect(screen.queryByRole('alert')).not.toBeInTheDocument();
});

it('só mutações retomáveis (com função registrada) são guardadas no aparelho', () => {
  const m = (key: string[] | undefined) => ({ options: { mutationKey: key }, state: { isPaused: true } }) as never;
  expect(shouldPersistMutation(m(['checkin']))).toBe(true);
  expect(shouldPersistMutation(m(['addSet']))).toBe(true);
  expect(shouldPersistMutation(m(undefined))).toBe(false);
  expect(shouldPersistMutation(m(['freeze']))).toBe(false);
});
