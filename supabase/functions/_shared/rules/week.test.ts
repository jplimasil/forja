import { it, expect } from 'vitest';
import { goalForWeek, firstEvaluatedWeek, weekProgress, closeWeek, weeksToClose, streak, debt } from './week.ts';
import type { WeekStatus } from './types.ts';

const H = [{ effectiveWeekStart: '2026-10-12', weeklyGoal: 4 }, { effectiveWeekStart: '2026-10-26', weeklyGoal: 5 }];
it('meta mudada vale só da semana efetiva em diante', () => {
  expect(goalForWeek(H, '2026-10-19')).toBe(4);
  expect(goalForWeek(H, '2026-10-26')).toBe(5);
  expect(goalForWeek(H, '2026-10-05')).toBeNull();
});
it('firstEvaluatedWeek pula a semana de criação', () => {
  expect(firstEvaluatedWeek('2026-10-15')).toBe('2026-10-19');
  expect(firstEvaluatedWeek('2026-10-19')).toBe('2026-10-26');
});
// quinta 2026-10-15, meta 4
it.each([
  [2, false, '2026-10-15', 'green', 2, 4],
  [1, false, '2026-10-15', 'yellow', 3, 4],
  [0, false, '2026-10-15', 'fire', 4, 4],
  [2, false, '2026-10-18', 'red', 2, 1],
  [4, false, '2026-10-15', 'met', 0, 4],
  [2, true, '2026-10-15', 'yellow', 2, 3],
])('weekProgress done=%i hoje=%s %s → %s', (done, checkedInToday, today, level, need, available) => {
  expect(weekProgress({ goal: 4, done, today, checkedInToday })).toMatchObject({ level, need, available });
});
it('closeWeek', () => {
  expect(closeWeek({ weekStart: '2026-10-12', goal: 4, done: 1, frozen: true, penaltyAmount: 10 })).toMatchObject({ status: 'frozen', penaltyAmount: 0 });
  expect(closeWeek({ weekStart: '2026-10-12', goal: 4, done: 4, frozen: false, penaltyAmount: 10 })).toMatchObject({ status: 'met', penaltyAmount: 0 });
  expect(closeWeek({ weekStart: '2026-10-12', goal: 4, done: 3, frozen: false, penaltyAmount: 10 })).toMatchObject({ status: 'failed', penaltyAmount: 10 });
});
it('weeksToClose respeita segunda 10h e recupera atrasos', () => {
  const mon = (hour: number) => ({ date: '2026-10-26', hour, weekday: 1 });
  expect(weeksToClose({ now: mon(9), lastClosedWeekStart: '2026-10-12', firstEvaluatedWeek: '2026-10-12' })).toEqual([]);
  expect(weeksToClose({ now: mon(10), lastClosedWeekStart: '2026-10-12', firstEvaluatedWeek: '2026-10-12' })).toEqual(['2026-10-19']);
  expect(weeksToClose({ now: { date: '2026-10-28', hour: 15, weekday: 3 }, lastClosedWeekStart: '2026-10-05', firstEvaluatedWeek: '2026-10-05' })).toEqual(['2026-10-12', '2026-10-19']);
  expect(weeksToClose({ now: mon(10), lastClosedWeekStart: null, firstEvaluatedWeek: '2026-10-19' })).toEqual(['2026-10-19']);
  expect(weeksToClose({ now: mon(10), lastClosedWeekStart: null, firstEvaluatedWeek: '2026-10-26' })).toEqual([]);
});
const w = (weekStart: string, status: WeekStatus, penaltyAmount = 0, penaltyPaidAt: string | null = null) =>
  ({ weekStart, goal: 4, done: 0, status, penaltyAmount, penaltyPaidAt });
it('streak: frozen não soma nem quebra; failed quebra', () => {
  const ws = [w('2026-10-19', 'met'), w('2026-09-21', 'met'), w('2026-10-12', 'frozen'), w('2026-09-28', 'failed'), w('2026-10-05', 'met')];
  expect(streak(ws, false)).toBe(2);
  expect(streak(ws, true)).toBe(3);
  expect(streak([], false)).toBe(0);
  expect(streak([], true)).toBe(1);
});
it('debt soma só multas não pagas', () => {
  expect(debt([w('a', 'failed', 10), w('b', 'failed', 15, '2026-10-01'), w('c', 'failed', 10)])).toBe(20);
});
