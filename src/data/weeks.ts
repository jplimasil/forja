import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import type { ClosedWeek, ISODate, WeekStatus } from '@rules/types.ts';
import { supabase, unwrap } from '../lib/supabase';
import { notifyError } from '../lib/errors';

export function useWeeks() {
  return useQuery({
    queryKey: ['weeks'],
    queryFn: async (): Promise<ClosedWeek[]> => {
      const rows = unwrap(
        await supabase.from('weeks').select('week_start, goal, done, status, penalty_amount, penalty_paid_at').order('week_start', { ascending: false }),
      );
      return (rows ?? []).map((r) => ({
        weekStart: r.week_start,
        goal: r.goal,
        done: r.done,
        status: r.status as WeekStatus,
        penaltyAmount: Number(r.penalty_amount),
        penaltyPaidAt: r.penalty_paid_at,
      }));
    },
  });
}

export function useMarkPaid() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (weekStart: ISODate) => {
      unwrap(await supabase.from('weeks').update({ penalty_paid_at: new Date().toISOString() }).eq('week_start', weekStart));
    },
    onError: notifyError,
    onSettled: () => qc.invalidateQueries({ queryKey: ['weeks'] }),
  });
}
