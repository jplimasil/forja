import { it, expect } from 'vitest';
import { planUserTick } from './tick.ts';

const settings = { preferredHour: 19, intensity: 'normal' as const, penaltyAmount: 10, penaltyDescription: 'no cofrinho', motivations: [] };
const goals = [{ effectiveWeekStart: '2026-10-05', weeklyGoal: 4 }];
it('recupera semanas atrasadas e manda um único resumo da mais recente', () => {
  const plan = planUserTick({ now: { date: '2026-10-28', hour: 10, weekday: 3 }, accountCreatedDate: '2026-10-01', settings, goals,
    checkinDates: ['2026-10-05', '2026-10-06', '2026-10-07', '2026-10-08', '2026-10-13'], freezes: [], closed: [] });
  expect(plan.weeksToInsert.map((w) => [w.weekStart, w.status])).toEqual([['2026-10-05', 'met'], ['2026-10-12', 'failed'], ['2026-10-19', 'failed']]);
  expect(plan.notifications.filter((n) => n.kind === 'summary')).toHaveLength(1);
});
it('semana já fechada não é refechada (cron duplo)', () => {
  const closed = [{ weekStart: '2026-10-19', goal: 4, done: 4, status: 'met' as const, penaltyAmount: 0, penaltyPaidAt: null }];
  const plan = planUserTick({ now: { date: '2026-10-26', hour: 10, weekday: 1 }, accountCreatedDate: '2026-10-14', settings, goals, checkinDates: [], freezes: [], closed });
  expect(plan.weeksToInsert).toEqual([]);
  expect(plan.notifications.filter((n) => n.kind === 'summary')).toEqual([]);
});
it('semana de aquecimento não fecha', () => {
  const plan = planUserTick({ now: { date: '2026-10-26', hour: 10, weekday: 1 }, accountCreatedDate: '2026-10-21', settings, goals, checkinDates: [], freezes: [], closed: [] });
  expect(plan.weeksToInsert).toEqual([]);
});
it('lembrete no horário certo e silêncio se já treinou hoje', () => {
  // semanas anteriores já fechadas, para que só o lembrete apareça (quinta, 0 treinos, meta 4 → fire)
  const closed = [{ weekStart: '2026-10-12', goal: 4, done: 4, status: 'met' as const, penaltyAmount: 0, penaltyPaidAt: null }];
  const input = { now: { date: '2026-10-22', hour: 19, weekday: 4 }, accountCreatedDate: '2026-10-01', settings, goals, freezes: [], closed };
  expect(planUserTick({ ...input, checkinDates: [] }).notifications).toMatchObject([{ kind: 'reminder', slotHour: 19 }]);
  expect(planUserTick({ ...input, checkinDates: ['2026-10-22'] }).notifications).toEqual([]);
});
it('semana congelada fecha como frozen', () => {
  const plan = planUserTick({ now: { date: '2026-10-26', hour: 10, weekday: 1 }, accountCreatedDate: '2026-10-01', settings, goals,
    checkinDates: [], freezes: ['2026-10-19'], closed: [{ weekStart: '2026-10-12', goal: 4, done: 4, status: 'met', penaltyAmount: 0, penaltyPaidAt: null }] });
  expect(plan.weeksToInsert).toMatchObject([{ weekStart: '2026-10-19', status: 'frozen', penaltyAmount: 0 }]);
});
