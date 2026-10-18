import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import type { ISODate } from '@rules/types.ts';
import { supabase, unwrap } from '../lib/supabase';
import { notifyError } from '../lib/errors';

const KEY = ['freezes'];

export function useFreezes() {
  return useQuery({
    queryKey: KEY,
    queryFn: async (): Promise<ISODate[]> => {
      const rows = unwrap(await supabase.from('week_freezes').select('week_start').order('week_start'));
      return (rows ?? []).map((r) => r.week_start as ISODate);
    },
  });
}

export function useFreeze() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (weekStart: ISODate) => {
      unwrap(await supabase.from('week_freezes').insert({ week_start: weekStart }));
    },
    onError: notifyError,
    onSettled: () => qc.invalidateQueries({ queryKey: KEY }),
  });
}

export function useUnfreeze() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (weekStart: ISODate) => {
      unwrap(await supabase.from('week_freezes').delete().eq('week_start', weekStart));
    },
    onError: notifyError,
    onSettled: () => qc.invalidateQueries({ queryKey: KEY }),
  });
}
