import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ExerciseCard } from './ExerciseCard';

it('editor de grupo e tipo abre com os valores atuais, não os da primeira renderização', async () => {
  const props = { name: 'Supino', sets: [], prs: new Set<string>(), onUpdate: vi.fn(), onAddSet: vi.fn(), onEditMeta: vi.fn(), onRemove: vi.fn() };
  const { rerender } = render(<ExerciseCard {...props} muscleGroup="peito" kind={null} />);
  rerender(<ExerciseCard {...props} muscleGroup="costas" kind="composto" />);
  const user = userEvent.setup();
  await user.click(screen.getByRole('button', { name: 'Opções de Supino' }));
  await user.click(screen.getByRole('button', { name: /Editar grupo e tipo/ }));
  expect(screen.getByLabelText('Grupo muscular')).toHaveValue('costas');
  await user.selectOptions(screen.getByLabelText('Tipo'), 'isolador');
  await user.click(screen.getByRole('button', { name: 'Salvar' }));
  expect(props.onEditMeta).toHaveBeenCalledWith('costas', 'isolador');
});
