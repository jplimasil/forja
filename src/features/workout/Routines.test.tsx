import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router';
import type { Routine } from './stats';
import { Routines } from './Routines';

const saveRoutine = vi.fn();
const addRoutineExercise = vi.fn();
const updateRoutineExercise = vi.fn();
const routines: Routine[] = [{ id: 'A', name: 'Treino A', position: 0, exercises: [
  { id: 'r1', exerciseId: 'e1', name: 'Supino', muscleGroup: 'peito', kind: 'composto', position: 0, targetSets: 3 },
  { id: 'r2', exerciseId: 'e2', name: 'Rosca', muscleGroup: 'biceps', kind: 'isolador', position: 1, targetSets: 3 },
] }];

vi.mock('../../data/routines', () => ({
  useRoutines: () => ({ data: routines }),
  useSaveRoutine: () => ({ mutate: saveRoutine }),
  useDeleteRoutine: () => ({ mutate: vi.fn() }),
  useAddRoutineExercise: () => ({ mutate: addRoutineExercise }),
  useUpdateRoutineExercise: () => ({ mutate: updateRoutineExercise }),
  useRemoveRoutineExercise: () => ({ mutate: vi.fn() }),
}));
vi.mock('../../data/workout', () => ({ useExercises: () => ({ data: [] }) }));

function setup() {
  render(<MemoryRouter><Routines /></MemoryRouter>);
  return userEvent.setup();
}
beforeEach(() => vi.clearAllMocks());

it('cria ficha com nome; nome vazio não salva', async () => {
  const user = setup();
  expect(screen.getByRole('button', { name: 'Criar ficha' })).toBeDisabled();
  await user.type(screen.getByLabelText('Nome da nova ficha'), 'Treino B');
  await user.click(screen.getByRole('button', { name: 'Criar ficha' }));
  expect(saveRoutine).toHaveBeenCalledWith(expect.objectContaining({ name: 'Treino B' }));
});

it('adiciona exercício com grupo, tipo e séries-alvo no fim da ficha', async () => {
  const user = setup();
  const card = screen.getByRole('region', { name: 'Treino A' });
  await user.click(within(card).getByRole('button', { name: 'Adicionar exercício à ficha' }));
  await user.type(within(card).getByLabelText('Nome do exercício'), 'Supino reto');
  await user.selectOptions(within(card).getByLabelText('Grupo muscular'), 'peito');
  await user.selectOptions(within(card).getByLabelText('Tipo'), 'composto');
  await user.clear(within(card).getByLabelText('Séries-alvo'));
  await user.type(within(card).getByLabelText('Séries-alvo'), '4');
  await user.click(within(card).getByRole('button', { name: 'Adicionar' }));
  expect(addRoutineExercise).toHaveBeenCalledWith(expect.objectContaining({
    routineId: 'A', name: 'Supino reto', muscleGroup: 'peito', kind: 'composto', targetSets: 4, position: 2,
  }));
});

it('↓ troca a posição com o exercício seguinte', async () => {
  const user = setup();
  await user.click(screen.getByRole('button', { name: 'Mover Supino para baixo' }));
  expect(updateRoutineExercise).toHaveBeenCalledWith({ id: 'r1', position: 1 });
  expect(updateRoutineExercise).toHaveBeenCalledWith({ id: 'r2', position: 0 });
});
