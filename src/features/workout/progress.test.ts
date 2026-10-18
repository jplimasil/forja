import { topSetByDate, lastSession } from './progress';
import type { WorkoutSet } from '../../data/workout';

const s = (id: string, date: string, exercise: string, setNumber: number, weightKg: number): WorkoutSet =>
  ({ id, date, exercise, setNumber, reps: 10, weightKg, muscleGroup: null, kind: null, rpe: null, done: true });

const sets = [
  s('a', '2026-10-13', 'Supino', 1, 60),
  s('b', '2026-10-13', 'Supino', 2, 70),
  s('c', '2026-10-13', 'Remada', 1, 50),
  s('d', '2026-10-15', 'Supino', 1, 72),
];

it('topSetByDate pega a maior carga de cada sessão em ordem cronológica', () => {
  expect(topSetByDate(sets, 'Supino')).toEqual([
    { date: '2026-10-13', weightKg: 70 },
    { date: '2026-10-15', weightKg: 72 },
  ]);
});

it('topSetByDate ignora maiúsculas no nome do exercício', () => {
  expect(topSetByDate(sets, 'supino')).toHaveLength(2);
});

it('lastSession devolve as séries da sessão mais recente antes da data', () => {
  expect(lastSession(sets, '2026-10-15').map((x) => x.id)).toEqual(['a', 'b', 'c']);
  expect(lastSession(sets, '2026-10-13')).toEqual([]);
});
