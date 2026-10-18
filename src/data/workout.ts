import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import type { ISODate } from '@rules/types.ts';
import { fetchAll, supabase, unwrap } from '../lib/supabase';
import { invalidateWhenQueueIdle, queryClient, registerMutationDefaults } from '../lib/queryClient';
import { notifyError } from '../lib/errors';
import type { ExerciseKind, MuscleGroup } from '../features/workout/muscles';

export interface WorkoutSet {
  id: string;
  date: ISODate;
  exercise: string;
  muscleGroup: MuscleGroup | null;
  kind: ExerciseKind | null;
  setNumber: number;
  /** null em série planejada sem histórico (ainda não preenchida). */
  reps: number | null;
  weightKg: number | null;
  rpe: number | null;
  done: boolean;
}

export interface ExerciseInfo { id: string; name: string; muscleGroup: MuscleGroup | null; kind: ExerciseKind | null }

const SETS = ['sets'];
const EXERCISES = ['exercises'];

export function useExercises() {
  return useQuery({
    queryKey: EXERCISES,
    queryFn: async (): Promise<ExerciseInfo[]> => {
      const rows = unwrap(await supabase.from('exercises').select('id, name, muscle_group, kind').order('name'));
      return (rows ?? []).map((r) => ({ id: r.id, name: r.name, muscleGroup: r.muscle_group, kind: r.kind }));
    },
  });
}

interface SetRow {
  id: string;
  set_number: number;
  reps: number | null;
  weight_kg: number | string | null;
  rpe: number | string | null;
  done: boolean;
  checkins: { date: ISODate };
  exercises: { name: string; muscle_group: MuscleGroup | null; kind: ExerciseKind | null };
}

const num = (v: number | string | null) => (v === null ? null : Number(v));

export function useSets() {
  return useQuery({
    queryKey: SETS,
    queryFn: async (): Promise<WorkoutSet[]> => {
      const rows = (await fetchAll((from, to) =>
        supabase
          .from('workout_sets')
          .select('id, set_number, reps, weight_kg, rpe, done, checkins!inner(date), exercises!inner(name, muscle_group, kind)')
          .order('id')
          .range(from, to),
      )) as unknown as SetRow[];
      return rows
        .map((r) => ({
          id: r.id,
          date: r.checkins.date,
          exercise: r.exercises.name,
          muscleGroup: r.exercises.muscle_group,
          kind: r.exercises.kind,
          setNumber: r.set_number,
          reps: r.reps,
          weightKg: num(r.weight_kg),
          rpe: num(r.rpe),
          done: r.done,
        }))
        .sort((a, b) => (a.date === b.date ? a.setNumber - b.setNumber : a.date < b.date ? -1 : 1));
    },
  });
}

registerMutationDefaults<WorkoutSet>(['addSet'], {
  mutationFn: async (s) =>
    unwrap(
      await supabase.rpc('add_set', {
        p_id: s.id,
        p_date: s.date,
        p_exercise_name: s.exercise,
        p_set_number: s.setNumber,
        p_reps: s.reps,
        p_weight_kg: s.weightKg,
        p_rpe: s.rpe,
        p_done: s.done,
        p_muscle_group: s.muscleGroup,
        p_kind: s.kind,
      }),
    ),
  onMutate: async (s) => {
    await queryClient.cancelQueries({ queryKey: SETS });
    queryClient.setQueryData<WorkoutSet[]>(SETS, (l) => [...(l ?? []).filter((x) => x.id !== s.id), s]);
  },
  onError: (err, s) => {
    queryClient.setQueryData<WorkoutSet[]>(SETS, (l) => (l ?? []).filter((x) => x.id !== s.id));
    notifyError(err);
  },
  onSettled: () => invalidateWhenQueueIdle(SETS, EXERCISES),
});

export function useAddSet() {
  return useMutation<unknown, Error, WorkoutSet>({ mutationKey: ['addSet'] });
}

export type SetPatch = { id: string } & Partial<Pick<WorkoutSet, 'reps' | 'weightKg' | 'rpe' | 'done'>>;

function patchRow(p: SetPatch): Record<string, unknown> {
  const row: Record<string, unknown> = {};
  if (p.reps !== undefined) row.reps = p.reps;
  if (p.weightKg !== undefined) row.weight_kg = p.weightKg;
  if (p.rpe !== undefined) row.rpe = p.rpe;
  if (p.done !== undefined) row.done = p.done;
  return row;
}

// Marcar ✓ e editar carga/reps/RPE: na fila offline, em ordem, com desfazer se o servidor recusar.
registerMutationDefaults<SetPatch, { previous: WorkoutSet[] | undefined }>(['updateSet'], {
  mutationFn: async (p) => unwrap(await supabase.from('workout_sets').update(patchRow(p)).eq('id', p.id)),
  onMutate: async (p) => {
    await queryClient.cancelQueries({ queryKey: SETS });
    const previous = queryClient.getQueryData<WorkoutSet[]>(SETS);
    const { id, ...changes } = p;
    queryClient.setQueryData<WorkoutSet[]>(SETS, (l) => (l ?? []).map((s) => (s.id === id ? { ...s, ...changes } : s)));
    return { previous };
  },
  onError: (err, _p, ctx) => {
    queryClient.setQueryData(SETS, ctx?.previous);
    notifyError(err);
  },
  onSettled: () => invalidateWhenQueueIdle(SETS),
});

export function useUpdateSet() {
  return useMutation<unknown, Error, SetPatch>({ mutationKey: ['updateSet'] });
}

/** Atualiza pelo id: nomes podem conter "_" ou "%", que num filtro por padrão casariam outros exercícios. */
export function useUpdateExercise() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (e: { id: string; muscleGroup: MuscleGroup | null; kind: ExerciseKind | null }) => {
      unwrap(await supabase.from('exercises').update({ muscle_group: e.muscleGroup, kind: e.kind }).eq('id', e.id));
    },
    onError: notifyError,
    onSettled: () => {
      void qc.invalidateQueries({ queryKey: EXERCISES });
      void qc.invalidateQueries({ queryKey: SETS });
      void qc.invalidateQueries({ queryKey: ['routines'] });
    },
  });
}

// Remover um exercício do treino do dia: na mesma fila das séries, para não apagar antes de elas subirem
// (senão as séries enfileiradas chegariam depois e o exercício "voltaria").
registerMutationDefaults<string[], { previous: WorkoutSet[] | undefined }>(['removeSets'], {
  mutationFn: async (ids) => unwrap(await supabase.from('workout_sets').delete().in('id', ids)),
  onMutate: async (ids) => {
    await queryClient.cancelQueries({ queryKey: SETS });
    const previous = queryClient.getQueryData<WorkoutSet[]>(SETS);
    queryClient.setQueryData<WorkoutSet[]>(SETS, (l) => (l ?? []).filter((x) => !ids.includes(x.id)));
    return { previous };
  },
  onError: (err, _ids, ctx) => {
    queryClient.setQueryData(SETS, ctx?.previous);
    notifyError(err);
  },
  onSettled: () => invalidateWhenQueueIdle(SETS),
});

/** Remove do treino do dia as séries de um exercício (a ficha não muda). */
export function useRemoveSets() {
  return useMutation<unknown, Error, string[]>({ mutationKey: ['removeSets'] });
}
