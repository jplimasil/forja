import type { ISODate, LocalNow } from './types.ts';

const WEEKDAYS: Record<string, number> = { Mon: 1, Tue: 2, Wed: 3, Thu: 4, Fri: 5, Sat: 6, Sun: 7 };
const formatters = new Map<string, Intl.DateTimeFormat>();

function formatterFor(timeZone: string): Intl.DateTimeFormat {
  let f = formatters.get(timeZone);
  if (!f) {
    f = new Intl.DateTimeFormat('en-US', {
      timeZone,
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      hourCycle: 'h23',
      weekday: 'short',
    });
    formatters.set(timeZone, f);
  }
  return f;
}

/** Data, hora e dia da semana de um instante no fuso informado. */
export function localNow(instant: Date, timeZone: string): LocalNow {
  const parts: Record<string, string> = {};
  for (const p of formatterFor(timeZone).formatToParts(instant)) parts[p.type] = p.value;
  return {
    date: `${parts.year}-${parts.month}-${parts.day}`,
    hour: Number(parts.hour) % 24,
    weekday: WEEKDAYS[parts.weekday],
  };
}

function toUTC(d: ISODate): Date {
  const [y, m, day] = d.split('-').map(Number);
  return new Date(Date.UTC(y, m - 1, day));
}

function fromUTC(d: Date): ISODate {
  return d.toISOString().slice(0, 10);
}

export function addDays(d: ISODate, n: number): ISODate {
  const t = toUTC(d);
  t.setUTCDate(t.getUTCDate() + n);
  return fromUTC(t);
}

export function weekdayOf(d: ISODate): number {
  return toUTC(d).getUTCDay() || 7;
}

/** Segunda-feira da semana que contém `d`. */
export function weekStartOf(d: ISODate): ISODate {
  return addDays(d, 1 - weekdayOf(d));
}

export function monthOf(d: ISODate): string {
  return d.slice(0, 7);
}
