import { useMutation, useQuery } from '@tanstack/react-query';
import type { ISODate } from '@rules/types.ts';
import { fetchAll, supabase, unwrap } from '../lib/supabase';
import { queryClient, registerMutationDefaults } from '../lib/queryClient';
import { notifyError } from '../lib/errors';

const KEY = ['checkins'];

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
