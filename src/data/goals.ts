import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import type { GoalEntry, ISODate } from '@rules/types.ts';
import { supabase, unwrap } from '../lib/supabase';

export function useGoals() {
  return useQuery({
    queryKey: ['goals'],
    queryFn: async (): Promise<GoalEntry[]> => {
      const rows = unwrap(await supabase.from('goal_history').select('effective_week_start, weekly_goal').order('effective_week_start'));
      return (rows ?? []).map((r) => ({ effectiveWeekStart: r.effective_week_start, weeklyGoal: r.weekly_goal }));
    },
  });
}

/**
 * Grava a meta pela RPC set_goal: o servidor decide a semana em que ela passa a valer
 * (a atual, se for a primeira meta; senão a próxima segunda). Retorna essa data.
 */
export function useSetGoal() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ weeklyGoal }: { weeklyGoal: number }): Promise<ISODate> =>
      unwrap(await supabase.rpc('set_goal', { p_goal: weeklyGoal })) as ISODate,
    onSuccess: () => qc.invalidateQueries({ queryKey: ['goals'] }),
  });
}
