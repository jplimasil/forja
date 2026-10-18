import { it, expect } from 'vitest';
import { canFreeze } from './freeze.ts';
import type { RiskLevel } from './types.ts';

it.each([
  ['yellow', [], { ok: true }],
  ['met', [], { ok: false, reason: 'met' }],
  ['yellow', ['2026-10-05'], { ok: false, reason: 'monthly-limit' }],
  ['yellow', ['2026-09-28'], { ok: true }],
  ['yellow', ['2026-10-19'], { ok: false, reason: 'already' }],
])('canFreeze %s %j', (level, frozenWeekStarts, expected) => {
  expect(canFreeze({ currentWeekStart: '2026-10-19', level: level as RiskLevel, frozenWeekStarts: frozenWeekStarts as string[] })).toEqual(expected);
});
