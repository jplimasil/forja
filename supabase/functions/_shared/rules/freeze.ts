import type { ISODate, RiskLevel } from './types.ts';
import { monthOf } from './dates.ts';

export type FreezeCheck = { ok: true } | { ok: false; reason: 'met' | 'monthly-limit' | 'already' };

export function canFreeze(p: { currentWeekStart: ISODate; level: RiskLevel; frozenWeekStarts: ISODate[] }): FreezeCheck {
  if (p.frozenWeekStarts.includes(p.currentWeekStart)) return { ok: false, reason: 'already' };
  if (p.level === 'met') return { ok: false, reason: 'met' };
  const month = monthOf(p.currentWeekStart);
  if (p.frozenWeekStarts.some((w) => monthOf(w) === month)) return { ok: false, reason: 'monthly-limit' };
  return { ok: true };
}
