import { it, expect } from 'vitest';
import { reminderHours, dueReminder } from './notifications.ts';
import type { Intensity, RiskLevel } from './types.ts';

it.each([
  ['green', 'normal', 19, [19]],
  ['yellow', 'normal', 19, [17, 19, 21]],
  ['yellow', 'leve', 19, [19]],
  ['fire', 'insistente', 19, [15, 17, 19, 21]],
  ['fire', 'normal', 8, [8, 10, 12]],
  ['red', 'insistente', 19, [19]],
  ['met', 'insistente', 19, []],
])('reminderHours %s %s P=%i', (level, intensity, p, hours) => {
  expect(reminderHours(level as RiskLevel, intensity as Intensity, p as number)).toEqual(hours);
});
it('dueReminder', () => {
  const base = { level: 'yellow' as const, intensity: 'normal' as const, preferredHour: 19 };
  expect(dueReminder({ ...base, now: { date: '2026-10-15', hour: 17, weekday: 4 }, checkedInToday: false })).toBe(17);
  expect(dueReminder({ ...base, now: { date: '2026-10-15', hour: 17, weekday: 4 }, checkedInToday: true })).toBeNull();
  expect(dueReminder({ ...base, now: { date: '2026-10-15', hour: 18, weekday: 4 }, checkedInToday: false })).toBeNull();
});
