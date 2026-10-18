import { act, renderHook, waitFor } from '@testing-library/react';
import { QueryClientProvider, onlineManager } from '@tanstack/react-query';
import type { ReactNode } from 'react';
import { queryClient } from '../lib/queryClient';
import { ToastProvider } from '../ui/Toast';
import { useUndoCheckin } from './checkins';
import { useAddRoutineExercise } from './routines';
import { useAddSet, useRemoveSets, useUpdateExercise, type WorkoutSet } from './workout';

// Supabase falso: registra cada chamada da cadeia (from(...).update(...).eq(...)) e devolve `result`.
const log: string[] = [];
let tableData: Record<string, unknown> = {};
let failing: string | null = null;
function chain(table: string): unknown {
  const calls: string[] = [table];
  const proxy: unknown = new Proxy(() => {}, {
    get(_t, prop) {
      if (prop === 'then') {
        log.push(calls.join('.'));
        const data = tableData[calls.join('.')] ?? tableData[table] ?? null;
        const error = failing && calls.join(".").startsWith(failing) ? { message: "erro do servidor" } : null;
        return (res: (v: unknown) => void) => res({ data, error });
      }
      return (...args: unknown[]) => { calls.push(`${String(prop)}(${args.map((a) => JSON.stringify(a)).join(',')})`); return proxy; };
    },
  });
  return proxy;
}
const rpc = vi.fn();
vi.mock('../lib/supabase', async (orig) => ({
  ...(await orig<typeof import('../lib/supabase')>()),
  supabase: { rpc: (...a: unknown[]) => rpc(...a), from: (t: string) => chain(t) },
}));

const wrapper = ({ children }: { children: ReactNode }) => (
  <QueryClientProvider client={queryClient}><ToastProvider>{children}</ToastProvider></QueryClientProvider>
);
const set = (id: string, over: Partial<WorkoutSet> = {}): WorkoutSet => ({
  id, date: '2026-10-18', exercise: 'Supino', muscleGroup: 'peito', kind: null, setNumber: 1, reps: null, weightKg: null, rpe: null, done: false, ...over,
});

beforeEach(() => { queryClient.clear(); log.length = 0; tableData = {}; failing = null; rpc.mockReset(); });
afterEach(() => { onlineManager.setOnline(true); vi.restoreAllMocks(); });

it('editar grupo/tipo atualiza pelo id, nunca por nome com curingas', async () => {
  const { result } = renderHook(() => useUpdateExercise(), { wrapper });
  act(() => result.current.mutate({ id: 'ex-1', muscleGroup: 'biceps', kind: 'isolador' }));
  await waitFor(() => expect(log.some((l) => l.startsWith('exercises.update'))).toBe(true));
  const call = log.find((l) => l.startsWith('exercises.update'))!;
  expect(call).toContain('eq("id","ex-1")');
  expect(call).not.toContain('ilike');
});

it('ficha: nome com "_" não casa com outro exercício parecido', async () => {
  tableData = { exercises: [{ id: 'x1', name: 'Rosca 21', muscle_group: null, kind: null }], 'exercises.insert({"name":"Rosca_21","muscle_group":"biceps","kind":null}).select("id").single()': { id: 'novo' } };
  const { result } = renderHook(() => useAddRoutineExercise(), { wrapper });
  act(() => result.current.mutate({ routineId: 'A', name: 'Rosca_21', muscleGroup: 'biceps', kind: null, targetSets: 3, position: 0 }));
  await waitFor(() => expect(log.some((l) => l.startsWith('routine_exercises.insert'))).toBe(true));
  expect(log.find((l) => l.startsWith('routine_exercises.insert'))).toContain('"exercise_id":"novo"');
  expect(log.join('\n')).not.toContain('ilike');
});

it('remover exercício espera as séries enfileiradas antes de apagar', async () => {
  let finishAdd!: () => void;
  rpc.mockImplementation(() => new Promise((res) => { finishAdd = () => res({ data: null, error: null }); }));
  queryClient.setQueryData(['sets'], []);
  const { result } = renderHook(() => ({ add: useAddSet(), remove: useRemoveSets() }), { wrapper });
  onlineManager.setOnline(false);
  act(() => { result.current.add.mutate(set('s1')); result.current.remove.mutate(['s1']); });
  await waitFor(() => expect(queryClient.getQueryData(['sets'])).toEqual([]));
  act(() => onlineManager.setOnline(true));
  await waitFor(() => expect(rpc).toHaveBeenCalledTimes(1));
  await new Promise((r) => setTimeout(r, 30));
  expect(log.some((l) => l.startsWith('workout_sets.delete'))).toBe(false);
  act(() => finishAdd());
  await waitFor(() => expect(log.some((l) => l.startsWith('workout_sets.delete'))).toBe(true));
});

it('remoção recusada pelo servidor devolve as séries', async () => {
  failing = 'workout_sets.delete';
  queryClient.setQueryData(['sets'], [set('s1')]);
  const { result } = renderHook(() => useRemoveSets(), { wrapper });
  act(() => result.current.mutate(['s1']));
  await waitFor(() => expect(result.current.isError).toBe(true));
  expect((queryClient.getQueryData(['sets']) as WorkoutSet[]).map((x) => x.id)).toEqual(['s1']);
});

it('a fila só recarrega as séries quando termina, não a cada item', async () => {
  rpc.mockResolvedValue({ data: null, error: null });
  queryClient.setQueryData(['sets'], []);
  const spy = vi.spyOn(queryClient, 'invalidateQueries');
  const { result } = renderHook(() => useAddSet(), { wrapper });
  onlineManager.setOnline(false);
  act(() => { for (const id of ['a', 'b', 'c']) result.current.mutate(set(id)); });
  act(() => onlineManager.setOnline(true));
  await waitFor(() => expect(rpc).toHaveBeenCalledTimes(3));
  await waitFor(() => expect(queryClient.isMutating()).toBe(0));
  const setsRefetches = spy.mock.calls.filter(([f]) => JSON.stringify(f?.queryKey) === '["sets"]').length;
  expect(setsRefetches).toBe(1);
});

it('desfazer o check-in também limpa a ficha e os músculos do dia', async () => {
  rpc.mockResolvedValue({ data: null, error: null });
  queryClient.setQueryData(['checkins'], ['2026-10-18']);
  queryClient.setQueryData(['checkinDetails'], { '2026-10-18': { routineId: 'A', muscles: ['peito'] } });
  const { result } = renderHook(() => useUndoCheckin(), { wrapper });
  act(() => result.current.mutate('2026-10-18'));
  await waitFor(() => expect(queryClient.getQueryData(['checkinDetails'])).toEqual({}));
});
