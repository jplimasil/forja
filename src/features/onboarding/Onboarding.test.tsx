import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Route, Routes } from 'react-router';
import { Onboarding } from './Onboarding';

const saveSettings = vi.fn().mockResolvedValue(undefined);
const setGoal = vi.fn().mockResolvedValue('2026-10-12');
vi.mock('../../data/settings', () => ({ useSaveSettings: () => ({ mutateAsync: saveSettings }) }));
vi.mock('../../data/goals', () => ({ useSetGoal: () => ({ mutateAsync: setGoal }) }));

function setup() {
  render(
    <MemoryRouter initialEntries={['/boas-vindas']}>
      <Routes>
        <Route path="/boas-vindas" element={<Onboarding />} />
        <Route path="/" element={<p>tela inicial</p>} />
      </Routes>
    </MemoryRouter>,
  );
  return userEvent.setup();
}

it('configura meta, horário, multa e motivos e grava tudo ao concluir', async () => {
  const user = setup();
  expect(screen.getByRole('button', { name: '4 treinos' })).toHaveAttribute('aria-pressed', 'true');
  await user.click(screen.getByRole('button', { name: 'Próximo' }));

  expect(screen.getByLabelText('Horário')).toHaveValue('18');
  await user.click(screen.getByRole('button', { name: 'Próximo' }));

  expect(screen.getByLabelText('Valor (R$)')).toHaveValue(10);
  expect(screen.getByLabelText('Onde vai o dinheiro')).toHaveValue('no cofrinho');
  await user.click(screen.getByRole('button', { name: 'Próximo' }));

  await user.type(screen.getByLabelText('Motivo 1'), 'ficar forte');
  for (let i = 0; i < 4; i++) await user.click(screen.getByRole('button', { name: 'Adicionar motivo' }));
  expect(screen.getByLabelText('Motivo 5')).toBeInTheDocument();
  expect(screen.queryByRole('button', { name: 'Adicionar motivo' })).not.toBeInTheDocument();
  await user.click(screen.getByRole('button', { name: 'Próximo' }));

  await user.click(screen.getByRole('button', { name: 'Começar' }));
  expect(saveSettings).toHaveBeenCalledWith(expect.objectContaining({
    preferredHour: 18, penaltyAmount: 10, penaltyDescription: 'no cofrinho', intensity: 'normal', motivations: ['ficar forte'],
  }));
  expect(setGoal).toHaveBeenCalledWith({ weeklyGoal: 4 });
  expect(await screen.findByText('tela inicial')).toBeInTheDocument();
});

it('grava a meta antes das configurações (sem meta o app não cobra)', async () => {
  saveSettings.mockClear();
  setGoal.mockClear();
  const user = setup();
  for (let i = 0; i < 4; i++) await user.click(screen.getByRole('button', { name: 'Próximo' }));
  await user.click(screen.getByRole('button', { name: 'Começar' }));
  await screen.findByText('tela inicial');
  expect(setGoal.mock.invocationCallOrder[0]).toBeLessThan(saveSettings.mock.invocationCallOrder[0]);
});
