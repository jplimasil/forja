import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import type { WorkoutSet } from '../../data/workout';
import { SetRow } from './SetRow';

const base: WorkoutSet = { id: 's1', date: '2026-10-15', exercise: 'Supino', muscleGroup: 'peito', kind: 'composto', setNumber: 1, reps: 10, weightKg: 80, rpe: null, done: false };
const onUpdate = vi.fn();
beforeEach(() => onUpdate.mockClear());

it('✓ marca a série como concluída', async () => {
  render(<SetRow set={base} pr={false} onUpdate={onUpdate} />);
  await userEvent.setup().click(screen.getByRole('button', { name: 'Marcar série 1 como concluída' }));
  expect(onUpdate).toHaveBeenCalledWith({ id: 's1', done: true });
});

it('✓ sem carga abre a edição e não marca', async () => {
  render(<SetRow set={{ ...base, weightKg: null, reps: null }} pr={false} onUpdate={onUpdate} />);
  await userEvent.setup().click(screen.getByRole('button', { name: 'Marcar série 1 como concluída' }));
  expect(onUpdate).not.toHaveBeenCalled();
  expect(screen.getByLabelText('Carga (kg)')).toBeInTheDocument();
});

it('mostra o selo PR', () => {
  render(<SetRow set={{ ...base, done: true }} pr onUpdate={onUpdate} />);
  expect(screen.getByText('PR')).toBeInTheDocument();
});

it('editar carga envia só o campo alterado, aceitando vírgula', async () => {
  render(<SetRow set={base} pr={false} onUpdate={onUpdate} />);
  const user = userEvent.setup();
  await user.click(screen.getByRole('button', { name: 'Editar série 1' }));
  const carga = screen.getByLabelText('Carga (kg)');
  await user.clear(carga);
  await user.type(carga, '82,5');
  await user.click(screen.getByRole('button', { name: 'Salvar' }));
  expect(onUpdate).toHaveBeenCalledWith({ id: 's1', weightKg: 82.5 });
});
