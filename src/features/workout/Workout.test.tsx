import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router';
import type { WorkoutSet } from '../../data/workout';
import type { DayDetail, Routine } from './stats';
import { Workout } from './Workout';

const D = '2026-10-15';
const registerDay = vi.fn();
const addSet = vi.fn();
let sets: WorkoutSet[] = [];
let details: Record<string, DayDetail> = {};
let checkedInToday = false;
const routines: Routine[] = [{ id: 'A', name: 'Treino A', position: 0, exercises: [
  { id: 'r1', exerciseId: 'e1', name: 'Supino', muscleGroup: 'peito', kind: 'composto', position: 0, targetSets: 2 },
  { id: 'r2', exerciseId: 'e2', name: 'Rosca', muscleGroup: 'biceps', kind: 'isolador', position: 1, targetSets: 1 },
] }];

vi.mock('../../data/useWeekState', () => ({
  useWeekState: () => ({ now: { date: D, hour: 18, weekday: 4 }, streak: 6, checkedInToday }),
}));
vi.mock('../../data/workout', () => ({
  useSets: () => ({ data: sets }),
  useExercises: () => ({ data: [] }),
  useAddSet: () => ({ mutate: addSet }),
  useUpdateSet: () => ({ mutate: vi.fn() }),
  useUpdateExercise: () => ({ mutate: vi.fn() }),
  useRemoveSets: () => ({ mutate: vi.fn() }),
}));
vi.mock('../../data/checkins', () => ({
  useCheckinDetails: () => ({ data: details }),
  useRegisterDay: () => ({ mutate: registerDay }),
}));
vi.mock('../../data/routines', () => ({ useRoutines: () => ({ data: routines }) }));

const s = (id: string, date: string, exercise: string, setNumber: number, weightKg: number | null, reps: number | null, done: boolean): WorkoutSet =>
  ({ id, date, exercise, muscleGroup: exercise === 'Rosca' ? 'biceps' : 'peito', kind: null, setNumber, reps, weightKg, rpe: null, done });

function renderWorkout() {
  render(<MemoryRouter><Workout /></MemoryRouter>);
  return userEvent.setup();
}

beforeEach(() => { vi.clearAllMocks(); sets = []; details = {}; checkedInToday = false; });

it('registra o treino com a ficha: check-in com músculos e séries planejadas', async () => {
  const user = renderWorkout();
  expect(screen.getByText('Qual foi o treino de hoje?')).toBeInTheDocument();
  expect(screen.getByRole('button', { name: 'Treino livre' })).toBeInTheDocument();
  await user.click(screen.getByRole('button', { name: 'Treino A' }));
  expect(screen.getByRole('button', { name: 'Peito' })).toHaveAttribute('aria-pressed', 'true');
  expect(screen.getByRole('button', { name: 'Bíceps' })).toHaveAttribute('aria-pressed', 'true');
  await user.click(screen.getByRole('button', { name: 'Registrar treino' }));
  expect(registerDay).toHaveBeenCalledWith({ date: D, routineId: 'A', muscles: ['peito', 'biceps'] });
  expect(addSet).toHaveBeenCalledTimes(3);
  expect(addSet.mock.calls.map(([x]) => [x.exercise, x.setNumber, x.done, typeof x.id])).toEqual([
    ['Supino', 1, false, 'string'], ['Supino', 2, false, 'string'], ['Rosca', 1, false, 'string'],
  ]);
});

it('treino registrado mostra status, tonelagem com variação e progresso', () => {
  checkedInToday = true;
  details = { [D]: { routineId: 'A', muscles: ['peito', 'biceps'] }, '2026-10-08': { routineId: 'A', muscles: ['peito'] } };
  sets = [
    s('h1', '2026-10-08', 'Supino', 1, 71.4, 10, true),
    s('a', D, 'Supino', 1, 40, 10, true), s('b', D, 'Supino', 2, 40, 10, true),
    s('c', D, 'Rosca', 1, 0, 12, true), s('d', D, 'Rosca', 2, null, null, false),
  ];
  renderWorkout();
  expect(screen.getByText('Treino registrado // Treino A')).toBeInTheDocument();
  expect(screen.getByText('800')).toBeInTheDocument();
  expect(screen.getByText('+12% vs. anterior')).toBeInTheDocument();
  expect(screen.getByText('3/4')).toBeInTheDocument();
  expect(screen.getByText('1/2')).toBeInTheDocument();
});

it('check-in feito pelo Início pede para completar o treino', () => {
  checkedInToday = true;
  details = { [D]: { routineId: null, muscles: [] } };
  renderWorkout();
  expect(screen.getByText('Check-in feito. Complete o treino de hoje.')).toBeInTheDocument();
});
