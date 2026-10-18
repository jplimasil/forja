import type { ISODate, LocalNow } from './types.ts';
import { addDays } from './dates.ts';
import { CLOSE_HOUR } from './week.ts';

/** Hoje, ou ontem desde que a semana de ontem ainda não tenha fechado (segunda antes das 10h). */
export function canCheckin(target: ISODate, now: LocalNow): boolean {
  if (target === now.date) return true;
  if (target !== addDays(now.date, -1)) return false;
  return now.weekday !== 1 || now.hour < CLOSE_HOUR;
}

export function canUndoCheckin(target: ISODate, now: LocalNow): boolean {
  return target === now.date;
}
