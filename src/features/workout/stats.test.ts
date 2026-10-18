import type { WorkoutSet } from '../../data/workout';
import type { MuscleGroup } from './muscles';
import {
  dayPRs, dayProgress, epley, planRoutineSets, previousSessionDate, tonnage, tonnageDelta,
  weekVolumeByGroup, weeklyBest1Rm, type Routine,
} from './stats';

const D = '2026-10-15'; // quinta
function s(id: string, date: string, exercise: string, setNumber: number, weightKg: number | null, reps: number | null,
  done = true, group: MuscleGroup | null = 'peito'): WorkoutSet {
  return { id, date, exercise, muscleGroup: group, kind: null, setNumber, reps, weightKg, rpe: null, done };
}

it('epley: 1 rep = carga; 100kg x 10 ≈ 133,3', () => {
  expect(epley(100, 1)).toBe(100);
  expect(epley(100, 10)).toBeCloseTo(133.33, 1);
});

it('tonelagem soma só séries concluídas do dia', () => {
  const sets = [s('a', D, 'Supino', 1, 80, 10), s('b', D, 'Supino', 2, 90, 8, false), s('c', '2026-10-10', 'Supino', 1, 50, 10)];
  expect(tonnage(sets, D)).toBe(800);
});

it('sessão anterior: mesma ficha; treino livre pega qualquer; ficha apagada vira livre', () => {
  const details = { '2026-10-08': { routineId: 'A', muscles: [] }, '2026-10-10': { routineId: 'B', muscles: [] } };
  const sets = [s('x', '2026-10-08', 'Supino', 1, 80, 10), s('y', '2026-10-10', 'Remada', 1, 60, 10)];
  expect(previousSessionDate({ sets, details, date: D, routineId: 'A' })).toBe('2026-10-08');
  expect(previousSessionDate({ sets, details, date: D, routineId: null })).toBe('2026-10-10');
  expect(previousSessionDate({ sets, details, date: D, routineId: 'apagada' })).toBe('2026-10-10');
});

it('tonnageDelta', () => {
  expect(tonnageDelta(1120, 1000)).toBeCloseTo(0.12);
  expect(tonnageDelta(500, null)).toBeNull();
  expect(tonnageDelta(500, 0)).toBeNull();
});

it('dayProgress conta séries e exercícios concluídos', () => {
  const sets = [s('a', D, 'Supino', 1, 80, 10), s('b', D, 'Supino', 2, 80, 10), s('c', D, 'Rosca', 1, 30, 12), s('d', D, 'Rosca', 2, null, null, false)];
  expect(dayProgress(sets, D)).toEqual({ setsDone: 3, setsTotal: 4, exercisesDone: 1, exercisesTotal: 2 });
});

it('PR: só a melhor série do dia, só se superar o histórico; primeira sessão não conta', () => {
  const hist = [s('h', '2026-10-08', 'Supino', 1, 100, 6)]; // e1RM 120
  const day = [s('p1', D, 'Supino', 1, 100, 8), s('p2', D, 'Supino', 2, 100, 7), s('r1', D, 'Rosca', 1, 40, 10)];
  expect([...dayPRs([...hist, ...day], D)]).toEqual(['p1']);
});

it('1RM semanal: melhor da semana, 6 semanas, omite vazias', () => {
  const sets = [s('a', '2026-08-31', 'Supino', 1, 100, 1), s('b', '2026-10-06', 'Supino', 1, 100, 5), s('c', '2026-10-07', 'Supino', 1, 105, 3), s('d', D, 'Supino', 1, 90, 10, false)];
  const out = weeklyBest1Rm(sets, 'supino', D);
  expect(out).toHaveLength(1);
  expect(out[0].weekStart).toBe('2026-10-05');
  expect(out[0].value).toBeCloseTo(116.67, 1);
});

it('volume por grupo na semana; exercício sem grupo vira null', () => {
  const sets = [s('a', D, 'Supino', 1, 80, 10), s('b', D, 'Supino', 2, 80, 10), s('c', D, 'Prancha', 1, 0, 30, true, null), s('d', D, 'Supino', 3, 80, 10, false)];
  expect(weekVolumeByGroup(sets, '2026-10-12')).toEqual([{ group: 'peito', sets: 2 }, { group: null, sets: 1 }]);
});

it('ficha pré-preenche pela última sessão; sem histórico fica vazio; menos séries repete a última', () => {
  const routine: Routine = { id: 'A', name: 'Treino A', position: 0, exercises: [
    { id: 're1', exerciseId: 'e1', name: 'Supino', muscleGroup: 'peito', kind: 'composto', position: 0, targetSets: 3 },
    { id: 're2', exerciseId: 'e2', name: 'Crucifixo', muscleGroup: 'peito', kind: 'isolador', position: 1, targetSets: 1 },
  ] };
  const sets = [s('a', '2026-10-08', 'Supino', 1, 80, 10), s('b', '2026-10-08', 'Supino', 2, 85, 8)];
  expect(planRoutineSets({ routine, sets, date: D }).map((x) => [x.exercise, x.setNumber, x.weightKg, x.reps, x.done])).toEqual([
    ['Supino', 1, 80, 10, false], ['Supino', 2, 85, 8, false], ['Supino', 3, 85, 8, false], ['Crucifixo', 1, null, null, false],
  ]);
});
