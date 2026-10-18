import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import type { Intensity } from '@rules/types.ts';
import { supabase, unwrap } from '../lib/supabase';

export interface Settings {
  preferredHour: number;
  timezone: string;
  penaltyAmount: number;
  penaltyDescription: string;
  intensity: Intensity;
  motivations: string[];
  createdAt: string;
}

interface SettingsRow {
  preferred_hour: number;
  timezone: string;
  penalty_amount: number | string;
  penalty_description: string;
  notification_intensity: Intensity;
  motivations: string[];
  created_at: string;
}

const fromRow = (r: SettingsRow): Settings => ({
  preferredHour: r.preferred_hour,
  timezone: r.timezone,
  penaltyAmount: Number(r.penalty_amount),
  penaltyDescription: r.penalty_description,
  intensity: r.notification_intensity,
  motivations: r.motivations ?? [],
  createdAt: r.created_at,
});

function toRow(s: Partial<Settings>): Partial<SettingsRow> {
  const row: Partial<SettingsRow> = {};
  if (s.preferredHour !== undefined) row.preferred_hour = s.preferredHour;
  if (s.timezone !== undefined) row.timezone = s.timezone;
  if (s.penaltyAmount !== undefined) row.penalty_amount = s.penaltyAmount;
  if (s.penaltyDescription !== undefined) row.penalty_description = s.penaltyDescription;
  if (s.intensity !== undefined) row.notification_intensity = s.intensity;
  if (s.motivations !== undefined) row.motivations = s.motivations;
  return row;
}

export async function currentUserId(): Promise<string> {
  const { data } = await supabase.auth.getSession();
  const id = data.session?.user.id;
  if (!id) throw new Error('nao_autenticado');
  return id;
}

export function useSettings() {
  return useQuery({
    queryKey: ['settings'],
    queryFn: async (): Promise<Settings | null> => {
      const row = unwrap(await supabase.from('settings').select('*').maybeSingle());
      return row ? fromRow(row as SettingsRow) : null;
    },
  });
}

export function useSaveSettings() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (s: Partial<Settings>) => {
      unwrap(await supabase.from('settings').upsert({ user_id: await currentUserId(), ...toRow(s) }, { onConflict: 'user_id' }));
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['settings'] }),
  });
}
