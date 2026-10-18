import { useMemo, useState } from 'react';
import type { ISODate } from '@rules/types.ts';
import { weekStartOf } from '@rules/dates.ts';
import type { WorkoutSet } from '../../data/workout';
import { MuscleVolumeBars } from './MuscleVolumeBars';
import { OneRmChart } from './OneRmChart';
import { weekVolumeByGroup, weeklyBest1Rm } from './stats';
import { KCard, KLabel } from './kinetic/ui';

/** Evolução: 1RM estimado por exercício (6 semanas) e volume por grupo muscular na semana atual. */
export function Evolution({ sets, today }: { sets: WorkoutSet[]; today: ISODate }) {
  const names = useMemo(
    () => [...new Set(sets.filter((s) => s.done).map((s) => s.exercise))].sort((a, b) => a.localeCompare(b, 'pt-BR')),
    [sets],
  );
  const [picked, setPicked] = useState<string | null>(null);
  const exercise = picked ?? names[0] ?? null;

  return (
    <KCard className="space-y-6 p-4" aria-label="Evolução">
      <div>
        <KLabel>Evolução e gráficos</KLabel>
        <h2 className="font-k-body text-base font-semibold text-k-text">Cargas máximas e volume</h2>
      </div>

      {names.length === 0 ? (
        <p className="font-k-body text-sm text-k-muted">Quando você concluir séries, o 1RM estimado de cada exercício aparece aqui.</p>
      ) : (
        <div className="space-y-3">
          <label className="block max-w-xs">
            <span className="sr-only">Exercício do gráfico</span>
            <select
              aria-label="Exercício do gráfico"
              className="w-full rounded-k border border-k-line bg-k-2 px-3 py-2.5 font-k-body text-sm text-k-text focus:border-k-lime focus:outline-none"
              value={exercise ?? ''}
              onChange={(e) => setPicked(e.target.value)}
            >
              {names.map((n) => <option key={n} value={n}>{n}</option>)}
            </select>
          </label>
          {exercise && <OneRmChart data={weeklyBest1Rm(sets, exercise, today)} />}
        </div>
      )}

      <div className="space-y-3 border-t border-k-line pt-4">
        <KLabel>Séries por grupo nesta semana</KLabel>
        <MuscleVolumeBars data={weekVolumeByGroup(sets, weekStartOf(today))} />
      </div>
    </KCard>
  );
}
