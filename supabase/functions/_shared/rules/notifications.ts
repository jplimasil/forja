import type { Intensity, LocalNow, RiskLevel } from './types.ts';

/** Horas locais em que notificações podem sair (silêncio das 22h às 7h). */
export const FIRST_HOUR = 7;
export const LAST_HOUR = 21;

const OFFSETS: Record<RiskLevel, Record<Intensity, number[]>> = {
  met: { leve: [], normal: [], insistente: [] },
  green: { leve: [0], normal: [0], insistente: [0] },
  yellow: { leve: [0], normal: [-2, 0, 2], insistente: [-2, 0, 2, 4] },
  fire: { leve: [0], normal: [-2, 0, 2, 4], insistente: [-4, -2, 0, 2, 4] },
  red: { leve: [0], normal: [0], insistente: [0] },
};

export function reminderHours(level: RiskLevel, intensity: Intensity, preferredHour: number): number[] {
  const hours = OFFSETS[level][intensity]
    .map((o) => preferredHour + o)
    .filter((h) => h >= FIRST_HOUR && h <= LAST_HOUR);
  return [...new Set(hours)].sort((a, b) => a - b);
}

export function dueReminder(p: { now: LocalNow; level: RiskLevel; intensity: Intensity; preferredHour: number; checkedInToday: boolean }): number | null {
  if (p.checkedInToday) return null;
  return reminderHours(p.level, p.intensity, p.preferredHour).includes(p.now.hour) ? p.now.hour : null;
}
