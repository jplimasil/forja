export type MuscleGroup =
  | 'peito' | 'costas' | 'ombros' | 'biceps' | 'triceps'
  | 'quadriceps' | 'posterior' | 'gluteos' | 'panturrilha' | 'abdomen';

export type ExerciseKind = 'composto' | 'isolador';

/** Mesma lista e ordem das restrições do banco (migração *_treino.sql). */
export const MUSCLE_GROUPS: { key: MuscleGroup; label: string }[] = [
  { key: 'peito', label: 'Peito' },
  { key: 'costas', label: 'Costas' },
  { key: 'ombros', label: 'Ombros' },
  { key: 'biceps', label: 'Bíceps' },
  { key: 'triceps', label: 'Tríceps' },
  { key: 'quadriceps', label: 'Quadríceps' },
  { key: 'posterior', label: 'Posterior' },
  { key: 'gluteos', label: 'Glúteos' },
  { key: 'panturrilha', label: 'Panturrilha' },
  { key: 'abdomen', label: 'Abdômen' },
];

export const KIND_LABELS: Record<ExerciseKind, string> = { composto: 'Composto', isolador: 'Isolador' };

export function muscleLabel(g: MuscleGroup | null): string {
  return MUSCLE_GROUPS.find((m) => m.key === g)?.label ?? 'Sem grupo';
}
