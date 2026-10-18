import type { ISODate } from '@rules/types.ts';
import type { WorkoutSet } from '../../data/workout';

/** Maior carga de cada sessão para um exercício, em ordem cronológica. */
export function topSetByDate(sets: WorkoutSet[], exercise: string): { date: ISODate; weightKg: number }[] {
  const name = exercise.toLowerCase();
  const best = new Map<ISODate, number>();
  for (const s of sets) {
    if (s.exercise.toLowerCase() !== name) continue;
    best.set(s.date, Math.max(best.get(s.date) ?? 0, s.weightKg));
  }
  return [...best.entries()].sort(([a], [b]) => (a < b ? -1 : 1)).map(([date, weightKg]) => ({ date, weightKg }));
}

/** Séries da sessão mais recente anterior a `before`. */
export function lastSession(sets: WorkoutSet[], before: ISODate): WorkoutSet[] {
  const last = sets.reduce<ISODate | null>((m, s) => (s.date < before && (!m || s.date > m) ? s.date : m), null);
  return last ? sets.filter((s) => s.date === last) : [];
}
