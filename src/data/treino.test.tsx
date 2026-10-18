import { act, renderHook, screen, waitFor } from '@testing-library/react';
import { QueryClientProvider, onlineManager } from '@tanstack/react-query';
import type { ReactNode } from 'react';
import { queryClient } from '../lib/queryClient';
import { ToastProvider } from '../ui/Toast';
import { useRegisterDay } from './checkins';
import { useAddSet, useUpdateSet, type WorkoutSet } from './workout';

const rpc = vi.fn();
const update = vi.fn();
vi.mock('../lib/supabase', async (orig) => ({
  ...(await orig<typeof import('../lib/supabase')>()),
  supabase: {
    rpc: (...args: unknown[]) => rpc(...args),
    from: () => ({ update: (vals: unknown) => ({ eq: (col: string, val: unknown) => update(vals, col, val) }) }),
  },
}));

const wrapper = ({ children }: { children: ReactNode }) => (
  <QueryClientProvider client={queryClient}><ToastProvider>{children}</ToastProvider></QueryClientProvider>
);
const set = (id: string, over: Partial<WorkoutSet> = {}): WorkoutSet => ({
  id, date: '2026-10-18', exercise: 'Supino', muscleGroup: 'peito', kind: 'composto', setNumber: 1,
  reps: 10, weightKg: 80, rpe: null, done: false, ...over,
});

beforeEach(() => { queryClient.clear(); rpc.mockReset(); update.mockReset(); });
afterEach(() => onlineManager.setOnline(true));

it('registro offline com ficha aparece na hora e sobe em ordem ao reconectar', async () => {
  const calls: string[] = [];
  rpc.mockImplementation(async (fn: string, args: unknown) => { calls.push(`${fn}:${JSON.stringify(args)}`); return { data: null, error: null }; });
  queryClient.setQueryData(['checkins'], []);
  queryClient.setQueryData(['checkinDetails'], {});
  queryClient.setQueryData(['sets'], []);
  const { result } = renderHook(() => ({ day: useRegisterDay(), add: useAddSet() }), { wrapper });

  onlineManager.setOnline(false);
  act(() => {
    result.current.day.mutate({ date: '2026-10-18', routineId: 'A', muscles: ['peito'] });
    result.current.add.mutate(set('s1'));
    result.current.add.mutate(set('s2', { setNumber: 2 }));
  });
  await waitFor(() => expect(queryClient.getQueryData(['checkins'])).toEqual(['2026-10-18']));
  expect(queryClient.getQueryData(['checkinDetails'])).toEqual({ '2026-10-18': { routineId: 'A', muscles: ['peito'] } });
  expect((queryClient.getQueryData(['sets']) as WorkoutSet[]).map((x) => x.id)).toEqual(['s1', 's2']);
  expect(rpc).not.toHaveBeenCalled();

  act(() => onlineManager.setOnline(true));
  await waitFor(() => expect(calls).toHaveLength(3));
  expect(calls[0]).toBe('do_checkin:{"p_date":"2026-10-18","p_routine_id":"A","p_muscles":["peito"]}');
  expect(calls[1]).toContain('add_set:');
  expect(calls[1]).toContain('"p_done":false');
});

it('marcar série concluída atualiza na hora; recusa do servidor desfaz e avisa', async () => {
  update.mockResolvedValueOnce({ data: null, error: null }).mockResolvedValueOnce({ data: null, error: { message: 'erro qualquer' } });
  queryClient.setQueryData(['sets'], [set('s1')]);
  const { result } = renderHook(() => useUpdateSet(), { wrapper });

  act(() => result.current.mutate({ id: 's1', done: true }));
  await waitFor(() => expect((queryClient.getQueryData(['sets']) as WorkoutSet[])[0].done).toBe(true));
  expect(update).toHaveBeenCalledWith({ done: true }, 'id', 's1');

  await waitFor(() => expect(result.current.isSuccess).toBe(true));
  queryClient.setQueryData(['sets'], [set('s1', { done: true, weightKg: 80 })]);
  act(() => result.current.mutate({ id: 's1', weightKg: 82.5 }));
  await waitFor(() => expect(update).toHaveBeenLastCalledWith({ weight_kg: 82.5 }, 'id', 's1'));
  expect(await screen.findByRole('alert')).toBeInTheDocument();
  expect((queryClient.getQueryData(['sets']) as WorkoutSet[])[0].weightKg).toBe(80);
});
