import { useEffect, useState } from 'react';
import type { ISODate, LocalNow } from '@rules/types.ts';
import { localNow, weekStartOf } from '@rules/dates.ts';
import { debt, firstEvaluatedWeek, goalForWeek, streak, weekProgress, type WeekProgress } from '@rules/week.ts';
import { canFreeze, type FreezeCheck } from '@rules/freeze.ts';
import { countInWeek } from '@rules/tick.ts';
import { useSettings, type Settings } from './settings';
import { useGoals } from './goals';
import { useCheckins } from './checkins';
import { useWeeks } from './weeks';
import { useFreezes } from './freezes';

export interface WeekState {
  now: LocalNow;
  weekStart: ISODate;
  warmup: boolean;
  frozen: boolean;
  checkedInToday: boolean;
  progress: WeekProgress;
  streak: number;
  debt: number;
  freezeCheck: FreezeCheck;
  settings: Settings;
}

/** Relógio que avança a cada minuto, para "hoje" virar sozinho com a tela aberta. */
function useClock(): number {
  const [t, setT] = useState(() => Date.now());
  useEffect(() => {
    const id = setInterval(() => setT(Date.now()), 60_000);
    return () => clearInterval(id);
  }, []);
  return t;
}

export function useWeekState(): WeekState | null {
  const t = useClock();
  const settings = useSettings().data;
  const goals = useGoals().data;
  const checkins = useCheckins().data;
  const weeks = useWeeks().data;
  const freezes = useFreezes().data;
  if (!settings || !goals || !checkins || !weeks || !freezes) return null;

  const now = localNow(new Date(t), settings.timezone);
  const weekStart = weekStartOf(now.date);
  const goal = goalForWeek(goals, weekStart) ?? goals[goals.length - 1]?.weeklyGoal ?? 4;
  const checkedInToday = checkins.includes(now.date);
  const progress = weekProgress({ goal, done: countInWeek(checkins, weekStart), today: now.date, checkedInToday });
  const createdDate = localNow(new Date(settings.createdAt), settings.timezone).date;
  const warmup = weekStart < firstEvaluatedWeek(createdDate);
  const frozen = freezes.includes(weekStart);

  return {
    now,
    weekStart,
    warmup,
    frozen,
    checkedInToday,
    progress,
    streak: streak(weeks, progress.level === 'met' && !warmup && !frozen),
    debt: debt(weeks),
    freezeCheck: canFreeze({ currentWeekStart: weekStart, level: progress.level, frozenWeekStarts: freezes }),
    settings,
  };
}
