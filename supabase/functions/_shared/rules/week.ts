import type { ClosedWeek, GoalEntry, ISODate, LocalNow, RiskLevel } from './types.ts';
import { addDays, weekdayOf, weekStartOf } from './dates.ts';

/** Fechamento da semana: segunda-feira seguinte, a esta hora local. */
export const CLOSE_HOUR = 10;

export function goalForWeek(history: GoalEntry[], weekStart: ISODate): number | null {
  let best: GoalEntry | null = null;
  for (const g of history) {
    if (g.effectiveWeekStart <= weekStart && (!best || g.effectiveWeekStart > best.effectiveWeekStart)) best = g;
  }
  return best ? best.weeklyGoal : null;
}

/** A semana de criação da conta é de aquecimento; a cobrança começa na segunda seguinte. */
export function firstEvaluatedWeek(accountCreatedDate: ISODate): ISODate {
  return addDays(weekStartOf(accountCreatedDate), 7);
}

export interface WeekProgress { done: number; goal: number; need: number; available: number; level: RiskLevel }

export function weekProgress(p: { goal: number; done: number; today: ISODate; checkedInToday: boolean }): WeekProgress {
  const need = Math.max(p.goal - p.done, 0);
  const available = 8 - weekdayOf(p.today) - (p.checkedInToday ? 1 : 0);
  let level: RiskLevel;
  if (need === 0) level = 'met';
  else if (need > available) level = 'red';
  else if (need === available) level = 'fire';
  else if (need === available - 1) level = 'yellow';
  else level = 'green';
  return { done: p.done, goal: p.goal, need, available, level };
}

export function closeWeek(p: { weekStart: ISODate; goal: number; done: number; frozen: boolean; penaltyAmount: number }): Omit<ClosedWeek, 'penaltyPaidAt'> {
  const status = p.frozen ? 'frozen' : p.done >= p.goal ? 'met' : 'failed';
  return { weekStart: p.weekStart, goal: p.goal, done: p.done, status, penaltyAmount: status === 'failed' ? p.penaltyAmount : 0 };
}

export function weeksToClose(p: { now: LocalNow; lastClosedWeekStart: ISODate | null; firstEvaluatedWeek: ISODate }): ISODate[] {
  const out: ISODate[] = [];
  let w = p.lastClosedWeekStart && p.lastClosedWeekStart >= p.firstEvaluatedWeek
    ? addDays(p.lastClosedWeekStart, 7)
    : p.firstEvaluatedWeek;
  for (;;) {
    const closesOn = addDays(w, 7);
    const closable = p.now.date > closesOn || (p.now.date === closesOn && p.now.hour >= CLOSE_HOUR);
    if (!closable) return out;
    out.push(w);
    w = closesOn;
  }
}

export function streak(closed: ClosedWeek[], currentWeekMet: boolean): number {
  let n = currentWeekMet ? 1 : 0;
  const sorted = [...closed].sort((a, b) => (a.weekStart < b.weekStart ? 1 : -1));
  for (const w of sorted) {
    if (w.status === 'failed') break;
    if (w.status === 'met') n++;
  }
  return n;
}

export function debt(closed: ClosedWeek[]): number {
  return closed.reduce((sum, w) => (w.status === 'failed' && !w.penaltyPaidAt ? sum + w.penaltyAmount : sum), 0);
}
