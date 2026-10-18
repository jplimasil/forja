import { describe, it, expect } from 'vitest';
import { localNow, addDays, weekdayOf, weekStartOf, monthOf } from './dates.ts';

describe('localNow', () => {
  it('domingo 23:30 em SP mesmo sendo segunda em UTC', () => {
    expect(localNow(new Date('2026-10-19T02:30:00Z'), 'America/Sao_Paulo'))
      .toEqual({ date: '2026-10-18', hour: 23, weekday: 7 });
  });
  it('segunda 10h em SP', () => {
    expect(localNow(new Date('2026-10-19T13:00:00Z'), 'America/Sao_Paulo'))
      .toEqual({ date: '2026-10-19', hour: 10, weekday: 1 });
  });
  it('meia-noite vira hora 0, não 24', () => {
    expect(localNow(new Date('2026-10-19T03:00:00Z'), 'America/Sao_Paulo').hour).toBe(0);
  });
});

describe('aritmética de datas', () => {
  it('addDays cruza mês', () => expect(addDays('2026-10-31', 1)).toBe('2026-11-01'));
  it('addDays negativo', () => expect(addDays('2026-10-19', -1)).toBe('2026-10-18'));
  it('weekdayOf domingo = 7', () => expect(weekdayOf('2026-10-18')).toBe(7));
  it('weekStartOf domingo → segunda anterior', () => expect(weekStartOf('2026-10-18')).toBe('2026-10-12'));
  it('weekStartOf segunda → ela mesma', () => expect(weekStartOf('2026-10-19')).toBe('2026-10-19'));
  it('monthOf', () => expect(monthOf('2026-10-05')).toBe('2026-10'));
});
