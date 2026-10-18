export type ISODate = string;
export type Intensity = 'leve' | 'normal' | 'insistente';
export type RiskLevel = 'met' | 'green' | 'yellow' | 'fire' | 'red';
export type WeekStatus = 'met' | 'failed' | 'frozen';
/** weekday: 1 = segunda … 7 = domingo */
export interface LocalNow { date: ISODate; hour: number; weekday: number }
export interface GoalEntry { effectiveWeekStart: ISODate; weeklyGoal: number }
export interface ClosedWeek {
  weekStart: ISODate;
  goal: number;
  done: number;
  status: WeekStatus;
  penaltyAmount: number;
  penaltyPaidAt: string | null;
}
