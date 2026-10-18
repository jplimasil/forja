import type { ClosedWeek, GoalEntry, ISODate, Intensity, LocalNow } from './types.ts';
import { addDays, weekStartOf } from './dates.ts';
import { closeWeek, firstEvaluatedWeek, goalForWeek, streak, weekProgress, weeksToClose } from './week.ts';
import { dueReminder } from './notifications.ts';
import { reminderMessage, weeklySummaryMessage, type Msg } from './messages.ts';

export interface TickInput {
  now: LocalNow;
  accountCreatedDate: ISODate;
  settings: { preferredHour: number; intensity: Intensity; penaltyAmount: number; penaltyDescription: string; motivations: string[] };
  goals: GoalEntry[];
  checkinDates: ISODate[];
  freezes: ISODate[];
  closed: ClosedWeek[];
}
export interface PlannedNotification extends Msg { kind: 'summary' | 'reminder'; slotHour: number }
export interface TickPlan { weeksToInsert: Omit<ClosedWeek, 'penaltyPaidAt'>[]; notifications: PlannedNotification[] }

export function countInWeek(dates: ISODate[], weekStart: ISODate): number {
  const end = addDays(weekStart, 7);
  return dates.filter((d) => d >= weekStart && d < end).length;
}

/** Decide o que a execução horária deve gravar e enviar para um usuário. Puro: sem IO. */
export function planUserTick(input: TickInput): TickPlan {
  const { now, settings } = input;
  const lastClosed = input.closed.reduce<ISODate | null>((m, w) => (!m || w.weekStart > m ? w.weekStart : m), null);
  const weeksToInsert: TickPlan['weeksToInsert'] = [];
  for (const weekStart of weeksToClose({ now, lastClosedWeekStart: lastClosed, firstEvaluatedWeek: firstEvaluatedWeek(input.accountCreatedDate) })) {
    const goal = goalForWeek(input.goals, weekStart);
    if (goal === null) continue;
    weeksToInsert.push(closeWeek({
      weekStart,
      goal,
      done: countInWeek(input.checkinDates, weekStart),
      frozen: input.freezes.includes(weekStart),
      penaltyAmount: settings.penaltyAmount,
    }));
  }

  const notifications: PlannedNotification[] = [];
  const allClosed: ClosedWeek[] = [...input.closed, ...weeksToInsert.map((w) => ({ ...w, penaltyPaidAt: null }))];
  const currentStreak = streak(allClosed, false);
  if (weeksToInsert.length) {
    const last = weeksToInsert[weeksToInsert.length - 1];
    notifications.push({
      kind: 'summary',
      slotHour: now.hour,
      ...weeklySummaryMessage({ status: last.status, streak: currentStreak, penaltyAmount: last.penaltyAmount, penaltyDescription: settings.penaltyDescription }),
    });
  }

  const weekStart = weekStartOf(now.date);
  const goal = goalForWeek(input.goals, weekStart);
  if (goal !== null && !input.freezes.includes(weekStart)) {
    const checkedInToday = input.checkinDates.includes(now.date);
    const progress = weekProgress({ goal, done: countInWeek(input.checkinDates, weekStart), today: now.date, checkedInToday });
    const slot = dueReminder({ now, level: progress.level, intensity: settings.intensity, preferredHour: settings.preferredHour, checkedInToday });
    if (slot !== null) {
      notifications.push({
        kind: 'reminder',
        slotHour: slot,
        ...reminderMessage({
          level: progress.level,
          streak: currentStreak,
          penaltyAmount: settings.penaltyAmount,
          penaltyDescription: settings.penaltyDescription,
          need: progress.need,
          available: progress.available,
          motivations: settings.motivations,
          seed: Number(now.date.replaceAll('-', '')) + slot,
        }),
      });
    }
  }
  return { weeksToInsert, notifications };
}
