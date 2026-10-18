import { it, expect } from 'vitest';
import { canCheckin, canUndoCheckin } from './checkin.ts';

const wed = { date: '2026-10-14', hour: 15, weekday: 3 };
it('hoje e ontem sim; anteontem e amanhã não', () => {
  expect(canCheckin('2026-10-14', wed)).toBe(true);
  expect(canCheckin('2026-10-13', wed)).toBe(true);
  expect(canCheckin('2026-10-12', wed)).toBe(false);
  expect(canCheckin('2026-10-15', wed)).toBe(false);
});
it('domingo pode ser marcado na segunda só até 9h59', () => {
  expect(canCheckin('2026-10-18', { date: '2026-10-19', hour: 9, weekday: 1 })).toBe(true);
  expect(canCheckin('2026-10-18', { date: '2026-10-19', hour: 10, weekday: 1 })).toBe(false);
});
it('desfazer só hoje', () => {
  expect(canUndoCheckin('2026-10-14', wed)).toBe(true);
  expect(canUndoCheckin('2026-10-13', wed)).toBe(false);
});
