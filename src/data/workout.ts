import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import type { ISODate } from '@rules/types.ts';
import { supabase, unwrap } from '../lib/supabase';
import { queryClient, registerMutationDefaults } from '../lib/queryClient';
import { notifyError } from '../lib/errors';

export interface WorkoutSet {
  id: string;
  date: ISODate;
  exercise: string;
  setNumber: number;
  reps: number;
  weightKg: number;
}

const SETS = ['sets'];

export function useExercises() {
  return useQuery({
    queryKey: ['exercises'],
    queryFn: async (): Promise<string[]> => {
      const rows = unwrap(await supabase.from('exercises').select('name').order('name'));
      return (rows ?? []).map((r) => r.name as string);
    },
  });
}

interface SetRow {
  id: string;
  set_number: number;
  reps: number;
  weight_kg: number | string;
  checkins: { date: ISODate };
  exercises: { name: string };
}

export function useSets() {
  return useQuery({
    queryKey: SETS,
    queryFn: async (): Promise<WorkoutSet[]> => {
      const rows = unwrap(
        await supabase.from('workout_sets').select('id, set_number, reps, weight_kg, checkins!inner(date), exercises!inner(name)'),
      ) as unknown as SetRow[];
      return (rows ?? [])
        .map((r) => ({
          id: r.id,
          date: r.checkins.date,
          exercise: r.exercises.name,
          setNumber: r.set_number,
          reps: r.reps,
          weightKg: Number(r.weight_kg),
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
  onSettled: () => {
    void queryClient.invalidateQueries({ queryKey: SETS });
    void queryClient.invalidateQueries({ queryKey: ['exercises'] });
  },
});

export function useAddSet() {
  return useMutation<unknown, Error, WorkoutSet>({ mutationKey: ['addSet'] });
}

export function useDeleteSet() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      unwrap(await supabase.from('workout_sets').delete().eq('id', id));
    },
    onMutate: (id) => qc.setQueryData<WorkoutSet[]>(SETS, (l) => (l ?? []).filter((x) => x.id !== id)),
    onError: notifyError,
    onSettled: () => qc.invalidateQueries({ queryKey: SETS }),
  });
}
