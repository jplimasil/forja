import { act, renderHook } from '@testing-library/react';
import { useWeekState } from './useWeekState';

const checkinDates = ['2026-10-18'];
vi.mock('./settings', () => ({
  useSettings: () => ({ data: {
    preferredHour: 19, timezone: 'America/Sao_Paulo', penaltyAmount: 10, penaltyDescription: 'no cofrinho',
    intensity: 'normal', motivations: [], createdAt: '2026-10-01T12:00:00Z',
  } }),
}));
vi.mock('./goals', () => ({ useGoals: () => ({ data: [{ effectiveWeekStart: '2026-09-28', weeklyGoal: 4 }] }) }));
vi.mock('./checkins', () => ({ useCheckins: () => ({ data: checkinDates }) }));
vi.mock('./weeks', () => ({ useWeeks: () => ({ data: [] }) }));
vi.mock('./freezes', () => ({ useFreezes: () => ({ data: [] }) }));

afterEach(() => vi.useRealTimers());

it('vira o dia à meia-noite sem recarregar a tela', () => {
  vi.useFakeTimers();
  vi.setSystemTime(new Date('2026-10-19T02:59:30Z')); // domingo 23:59:30 em SP
  const { result } = renderHook(() => useWeekState());
  expect(result.current?.now.date).toBe('2026-10-18');
  expect(result.current?.checkedInToday).toBe(true);
  expect(result.current?.weekStart).toBe('2026-10-12');

  act(() => { vi.advanceTimersByTime(60_000); });
  expect(result.current?.now.date).toBe('2026-10-19');
  expect(result.current?.checkedInToday).toBe(false);
  expect(result.current?.weekStart).toBe('2026-10-19');
  expect(result.current?.progress).toMatchObject({ done: 0, goal: 4, available: 7 });
});
