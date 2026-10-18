import type { ISODate } from '@rules/types.ts';
import { addDays, weekStartOf } from '@rules/dates.ts';
import type { WorkoutSet } from '../../data/workout';
import type { ExerciseKind, MuscleGroup } from './muscles';

export interface DayDetail { routineId: string | null; muscles: MuscleGroup[] }
export interface RoutineExercise {
  id: string; exerciseId: string; name: string; muscleGroup: MuscleGroup | null; kind: ExerciseKind | null;
  position: number; targetSets: number;
}
export interface Routine { id: string; name: string; position: number; exercises: RoutineExercise[] }

const same = (a: string, b: string) => a.toLowerCase() === b.toLowerCase();
type DoneSet = WorkoutSet & { reps: number; weightKg: number };
const isDone = (s: WorkoutSet): s is DoneSet => s.done && s.reps !== null && s.weightKg !== null;

/** 1RM estimado (Epley). Com 1 repetição, a própria carga. */
export function epley(weightKg: number, reps: number): number {
  return reps <= 1 ? weightKg : weightKg * (1 + reps / 30);
}

export function tonnage(sets: WorkoutSet[], date: ISODate): number {
  return sets.filter((s) => s.date === date && isDone(s)).reduce((t, s) => t + (s as DoneSet).weightKg * (s as DoneSet).reps, 0);
}

/**
 * Sessão anterior para comparar a tonelagem: a mais recente com séries concluídas e a mesma ficha;
 * no treino livre (ou se nenhuma sessão usou a ficha, ex.: ficha apagada), a mais recente de qualquer tipo.
 */
export function previousSessionDate(p: { sets: WorkoutSet[]; details: Record<ISODate, DayDetail>; date: ISODate; routineId: string | null }): ISODate | null {
  const dates = [...new Set(p.sets.filter((s) => s.date < p.date && isDone(s)).map((s) => s.date))].sort().reverse();
  if (p.routineId) {
    const match = dates.find((d) => p.details[d]?.routineId === p.routineId);
    if (match) return match;
  }
  return dates[0] ?? null;
}

/** Variação como fração (0.12 = +12%); null sem base de comparação. */
export function tonnageDelta(today: number, previous: number | null): number | null {
  return previous ? (today - previous) / previous : null;
}

export function dayProgress(sets: WorkoutSet[], date: ISODate) {
  const day = sets.filter((s) => s.date === date);
  const byExercise = new Map<string, WorkoutSet[]>();
  for (const s of day) byExercise.set(s.exercise.toLowerCase(), [...(byExercise.get(s.exercise.toLowerCase()) ?? []), s]);
  return {
    setsDone: day.filter(isDone).length,
    setsTotal: day.length,
    exercisesDone: [...byExercise.values()].filter((list) => list.every(isDone)).length,
    exercisesTotal: byExercise.size,
  };
}

/** Selo PR: a melhor série concluída do dia em cada exercício, se superar todo o histórico anterior dele. */
export function dayPRs(sets: WorkoutSet[], date: ISODate): Set<string> {
  const out = new Set<string>();
  const today = sets.filter((s) => s.date === date && isDone(s)) as DoneSet[];
  for (const name of new Set(today.map((s) => s.exercise.toLowerCase()))) {
    const best = today.filter((s) => same(s.exercise, name)).reduce((a, b) => (epley(b.weightKg, b.reps) > epley(a.weightKg, a.reps) ? b : a));
    const history = sets.filter((s) => s.date < date && same(s.exercise, name) && isDone(s)) as DoneSet[];
    if (!history.length) continue;
    const previousBest = Math.max(...history.map((s) => epley(s.weightKg, s.reps)));
    if (epley(best.weightKg, best.reps) > previousBest) out.add(best.id);
  }
  return out;
}

/** Melhor 1RM estimado de cada semana (seg–dom) nas últimas `weeks` semanas, incluindo a atual. */
export function weeklyBest1Rm(sets: WorkoutSet[], exercise: string, today: ISODate, weeks = 6): { weekStart: ISODate; value: number }[] {
  const current = weekStartOf(today);
  const first = addDays(current, -7 * (weeks - 1));
  const best = new Map<ISODate, number>();
  for (const s of sets) {
    if (!isDone(s) || !same(s.exercise, exercise) || s.date > today) continue;
    const w = weekStartOf(s.date);
    if (w < first) continue;
    best.set(w, Math.max(best.get(w) ?? 0, epley(s.weightKg, s.reps)));
  }
  return [...best.entries()].sort(([a], [b]) => (a < b ? -1 : 1)).map(([weekStart, value]) => ({ weekStart, value }));
}

export function weekVolumeByGroup(sets: WorkoutSet[], weekStart: ISODate): { group: MuscleGroup | null; sets: number }[] {
  const end = addDays(weekStart, 7);
  const count = new Map<MuscleGroup | null, number>();
  for (const s of sets) {
    if (s.date < weekStart || s.date >= end || !isDone(s)) continue;
    count.set(s.muscleGroup, (count.get(s.muscleGroup) ?? 0) + 1);
  }
  return [...count.entries()].map(([group, n]) => ({ group, sets: n })).sort((a, b) => b.sets - a.sets);
}

/** Séries planejadas da ficha, com carga/reps da sessão mais recente de cada exercício. */
export function planRoutineSets(p: { routine: Routine; sets: WorkoutSet[]; date: ISODate }): Omit<WorkoutSet, 'id'>[] {
  const out: Omit<WorkoutSet, 'id'>[] = [];
  for (const ex of [...p.routine.exercises].sort((a, b) => a.position - b.position)) {
    const history = p.sets.filter((s) => s.date < p.date && same(s.exercise, ex.name) && isDone(s)) as DoneSet[];
    const lastDate = history.reduce<ISODate | null>((m, s) => (!m || s.date > m ? s.date : m), null);
    const last = history.filter((s) => s.date === lastDate).sort((a, b) => a.setNumber - b.setNumber);
    for (let i = 0; i < ex.targetSets; i++) {
      const src = last[Math.min(i, last.length - 1)];
      out.push({
        date: p.date, exercise: ex.name, muscleGroup: ex.muscleGroup, kind: ex.kind, setNumber: i + 1,
        reps: src?.reps ?? null, weightKg: src?.weightKg ?? null, rpe: null, done: false,
      });
    }
  }
  return out;
}
