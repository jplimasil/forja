import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import type { ISODate } from '@rules/types.ts';
import { supabase, unwrap } from '../lib/supabase';
import { notifyError } from '../lib/errors';

export const MEASUREMENTS = ['cintura', 'quadril', 'peito', 'braco', 'coxa'] as const;
export type Measurement = (typeof MEASUREMENTS)[number];
export const MEASUREMENT_LABELS: Record<Measurement, string> = {
  cintura: 'Cintura', quadril: 'Quadril', peito: 'Peito', braco: 'Braço', coxa: 'Coxa',
};

export interface BodyEntry {
  id: string;
  date: ISODate;
  weightKg: number | null;
  measurements: Partial<Record<Measurement, number>>;
}

export function useBodyEntries() {
  return useQuery({
    queryKey: ['body'],
    queryFn: async (): Promise<BodyEntry[]> => {
      const rows = unwrap(await supabase.from('body_entries').select('id, date, weight_kg, measurements').order('date'));
      return (rows ?? []).map((r) => ({
        id: r.id,
        date: r.date,
        weightKg: r.weight_kg === null ? null : Number(r.weight_kg),
        measurements: r.measurements ?? {},
      }));
    },
  });
}

export function useAddBodyEntry() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (e: Omit<BodyEntry, 'id'>) => {
      unwrap(await supabase.from('body_entries').insert({ date: e.date, weight_kg: e.weightKg, measurements: e.measurements }));
    },
    onError: notifyError,
    onSettled: () => qc.invalidateQueries({ queryKey: ['body'] }),
  });
}
