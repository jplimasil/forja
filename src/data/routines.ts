import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase, unwrap } from '../lib/supabase';
import { notifyError } from '../lib/errors';
import type { ExerciseKind, MuscleGroup } from '../features/workout/muscles';
import type { Routine } from '../features/workout/stats';

const KEY = ['routines'];

interface RoutineRow {
  id: string;
  name: string;
  position: number;
  routine_exercises: {
    id: string;
    exercise_id: string;
    position: number;
    target_sets: number;
    exercises: { name: string; muscle_group: MuscleGroup | null; kind: ExerciseKind | null };
  }[];
}

/** Fichas de treino; gestão sempre online (sem fila offline). */
export function useRoutines() {
  return useQuery({
    queryKey: KEY,
    queryFn: async (): Promise<Routine[]> => {
      const rows = unwrap(
        await supabase
          .from('routines')
          .select('id, name, position, routine_exercises(id, exercise_id, position, target_sets, exercises(name, muscle_group, kind))')
          .order('position')
          .order('created_at'),
      ) as unknown as RoutineRow[];
      return (rows ?? []).map((r) => ({
        id: r.id,
        name: r.name,
        position: r.position,
        exercises: r.routine_exercises
          .map((e) => ({
            id: e.id,
            exerciseId: e.exercise_id,
            name: e.exercises.name,
            muscleGroup: e.exercises.muscle_group,
            kind: e.exercises.kind,
            position: e.position,
            targetSets: e.target_sets,
          }))
          .sort((a, b) => a.position - b.position),
      }));
    },
  });
}

function useRoutineMutation<TVars>(fn: (v: TVars) => Promise<unknown>) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: fn,
    onError: notifyError,
    onSettled: () => qc.invalidateQueries({ queryKey: KEY }),
  });
}

export function useSaveRoutine() {
  return useRoutineMutation(async (r: { id?: string; name: string; position?: number }) => {
    const name = r.name.trim();
    if (r.id) unwrap(await supabase.from('routines').update({ name }).eq('id', r.id));
    else unwrap(await supabase.from('routines').insert({ name, position: r.position ?? 0 }));
  });
}

export function useDeleteRoutine() {
  return useRoutineMutation(async (id: string) => unwrap(await supabase.from('routines').delete().eq('id', id)));
}

export interface NewRoutineExercise {
  routineId: string;
  name: string;
  muscleGroup: MuscleGroup | null;
  kind: ExerciseKind | null;
  targetSets: number;
  position: number;
}

/** Adiciona um exercício à ficha, criando o exercício se ainda não existir (nome sem diferenciar maiúsculas). */
export function useAddRoutineExercise() {
  return useRoutineMutation(async (e: NewRoutineExercise) => {
    const name = e.name.trim();
    const existing = unwrap(await supabase.from('exercises').select('id, muscle_group, kind').ilike('name', name).maybeSingle());
    let exerciseId: string;
    if (existing) {
      exerciseId = existing.id;
      if ((!existing.muscle_group && e.muscleGroup) || (!existing.kind && e.kind)) {
        unwrap(await supabase.from('exercises').update({
          muscle_group: existing.muscle_group ?? e.muscleGroup,
          kind: existing.kind ?? e.kind,
        }).eq('id', exerciseId));
      }
    } else {
      const created = unwrap(await supabase.from('exercises').insert({ name, muscle_group: e.muscleGroup, kind: e.kind }).select('id').single());
      exerciseId = created.id;
    }
    unwrap(await supabase.from('routine_exercises').insert({
      routine_id: e.routineId, exercise_id: exerciseId, target_sets: e.targetSets, position: e.position,
    }));
  });
}

export function useUpdateRoutineExercise() {
  return useRoutineMutation(async (e: { id: string; position?: number; targetSets?: number }) => {
    const row: Record<string, number> = {};
    if (e.position !== undefined) row.position = e.position;
    if (e.targetSets !== undefined) row.target_sets = e.targetSets;
    unwrap(await supabase.from('routine_exercises').update(row).eq('id', e.id));
  });
}

export function useRemoveRoutineExercise() {
  return useRoutineMutation(async (id: string) => unwrap(await supabase.from('routine_exercises').delete().eq('id', id)));
}
