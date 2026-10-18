import { useMutation, useQuery } from '@tanstack/react-query';
import type { ISODate } from '@rules/types.ts';
import { fetchAll, supabase, unwrap } from '../lib/supabase';
import { queryClient, registerMutationDefaults } from '../lib/queryClient';
import { notifyError } from '../lib/errors';
import type { DayDetail } from '../features/workout/stats';
import type { MuscleGroup } from '../features/workout/muscles';

const KEY = ['checkins'];
const DETAILS = ['checkinDetails'];

export function useCheckins() {
  return useQuery({
    queryKey: KEY,
    queryFn: async (): Promise<ISODate[]> => {
      const rows = await fetchAll((from, to) => supabase.from('checkins').select('date').order('date').range(from, to));
      return rows.map((r) => r.date as ISODate);
    },
  });
}

const withDate = (list: ISODate[] | undefined, d: ISODate) => [...new Set([...(list ?? []), d])].sort();
const withoutDate = (list: ISODate[] | undefined, d: ISODate) => (list ?? []).filter((x) => x !== d);

// Registrado no carregamento do módulo para que a fila offline retome após recarregar a página.
registerMutationDefaults<ISODate>(['checkin'], {
  mutationFn: async (date) => unwrap(await supabase.rpc('do_checkin', { p_date: date })),
  onMutate: async (date) => {
    await queryClient.cancelQueries({ queryKey: KEY });
    queryClient.setQueryData<ISODate[]>(KEY, (l) => withDate(l, date));
  },
  onError: (err, date) => {
    queryClient.setQueryData<ISODate[]>(KEY, (l) => withoutDate(l, date));
    notifyError(err);
  },
  onSettled: () => void queryClient.invalidateQueries({ queryKey: KEY }),
});

registerMutationDefaults<ISODate>(['undoCheckin'], {
  mutationFn: async (date) => unwrap(await supabase.rpc('undo_checkin', { p_date: date })),
  onMutate: async (date) => {
    await queryClient.cancelQueries({ queryKey: KEY });
    queryClient.setQueryData<ISODate[]>(KEY, (l) => withoutDate(l, date));
  },
  onError: (err, date) => {
    queryClient.setQueryData<ISODate[]>(KEY, (l) => withDate(l, date));
    notifyError(err);
  },
  onSettled: () => {
    void queryClient.invalidateQueries({ queryKey: KEY });
    void queryClient.invalidateQueries({ queryKey: ['sets'] });
  },
});

export function useCheckin() {
  return useMutation<unknown, Error, ISODate>({ mutationKey: ['checkin'] });
}

export function useUndoCheckin() {
  return useMutation<unknown, Error, ISODate>({ mutationKey: ['undoCheckin'] });
}

/** Ficha e músculos de cada dia treinado (o check-in é a sessão do dia). */
export function useCheckinDetails() {
  return useQuery({
    queryKey: DETAILS,
    queryFn: async (): Promise<Record<ISODate, DayDetail>> => {
      const rows = await fetchAll((from, to) =>
        supabase.from('checkins').select('date, routine_id, muscle_groups').order('date').range(from, to),
      );
      return Object.fromEntries(rows.map((r) => [r.date as ISODate, { routineId: r.routine_id, muscles: r.muscle_groups ?? [] }]));
    },
  });
}

export interface RegisterDayVars { date: ISODate; routineId: string | null; muscles: MuscleGroup[] }
type DetailsCache = Record<ISODate, DayDetail> | undefined;

// Check-in com ficha e músculos. Mesmo comportamento do servidor: ficha nula mantém a anterior.
registerMutationDefaults<RegisterDayVars, { details: DetailsCache; checkins: ISODate[] | undefined }>(['registerDay'], {
  mutationFn: async (v) => unwrap(await supabase.rpc('do_checkin', { p_date: v.date, p_routine_id: v.routineId, p_muscles: v.muscles })),
  onMutate: async (v) => {
    await queryClient.cancelQueries({ queryKey: KEY });
    await queryClient.cancelQueries({ queryKey: DETAILS });
    const snapshot = { details: queryClient.getQueryData<DetailsCache>(DETAILS), checkins: queryClient.getQueryData<ISODate[]>(KEY) };
    queryClient.setQueryData<ISODate[]>(KEY, (l) => withDate(l, v.date));
    queryClient.setQueryData<Record<ISODate, DayDetail>>(DETAILS, (d) => ({
      ...(d ?? {}),
      [v.date]: { routineId: v.routineId ?? d?.[v.date]?.routineId ?? null, muscles: v.muscles },
    }));
    return snapshot;
  },
  onError: (err, _v, ctx) => {
    queryClient.setQueryData(KEY, ctx?.checkins);
    queryClient.setQueryData(DETAILS, ctx?.details);
    notifyError(err);
  },
  onSettled: () => {
    void queryClient.invalidateQueries({ queryKey: KEY });
    void queryClient.invalidateQueries({ queryKey: DETAILS });
  },
});

export function useRegisterDay() {
  return useMutation<unknown, Error, RegisterDayVars>({ mutationKey: ['registerDay'] });
}
