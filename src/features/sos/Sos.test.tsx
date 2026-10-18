import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Route, Routes } from 'react-router';
import type { WeekState } from '../../data/useWeekState';
import { Sos } from './Sos';

const checkin = vi.fn();
let state: WeekState;
vi.mock('../../data/useWeekState', () => ({ useWeekState: () => state }));
vi.mock('../../data/checkins', () => ({ useCheckin: () => ({ mutate: checkin }) }));

function make(streak: number, motivations: string[]): WeekState {
  return {
    now: { date: '2026-10-15', hour: 18, weekday: 4 }, weekStart: '2026-10-12', warmup: false, frozen: false, checkedInToday: false,
    progress: { done: 1, goal: 4, need: 3, available: 4, level: 'yellow' }, streak, debt: 0, freezeCheck: { ok: true },
    settings: { preferredHour: 18, timezone: 'America/Sao_Paulo', penaltyAmount: 10, penaltyDescription: 'no cofrinho', intensity: 'normal', motivations, createdAt: '2026-09-01T00:00:00Z' },
  };
}

function setup(s: WeekState) {
  state = s;
  render(
    <MemoryRouter initialEntries={['/sos']}>
      <Routes>
        <Route path="/sos" element={<Sos />} />
        <Route path="/" element={<p>tela inicial</p>} />
      </Routes>
    </MemoryRouter>,
  );
  return userEvent.setup();
}

beforeEach(() => vi.clearAllMocks());

it('passa pelos motivos, pelo que está em jogo e pelo desafio de 15 minutos', async () => {
  const user = setup(make(6, ['ficar forte', 'dormir melhor']));
  expect(screen.getByText('ficar forte')).toBeInTheDocument();
  expect(screen.getByText('dormir melhor')).toBeInTheDocument();
  await user.click(screen.getByRole('button', { name: 'Próximo' }));

  const stakes = screen.getByTestId('stakes').textContent ?? '';
  expect(stakes).toContain('6 semanas');
  expect(stakes).toContain('R$10');
  await user.click(screen.getByRole('button', { name: 'Próximo' }));

  expect(screen.getByText('Só 15 minutos')).toBeInTheDocument();
  await user.click(screen.getByRole('button', { name: 'Fui! Registrar treino' }));
  expect(checkin).toHaveBeenCalledWith('2026-10-15');
  expect(await screen.findByText('tela inicial')).toBeInTheDocument();
});

it('sem motivos cadastrados faz a pergunta', () => {
  setup(make(6, []));
  expect(screen.getByText('Você começou isso por um motivo. Lembra qual era?')).toBeInTheDocument();
});

it('streak zero não aparece como "0 semanas"', async () => {
  const user = setup(make(0, []));
  await user.click(screen.getByRole('button', { name: 'Próximo' }));
  expect(screen.getByTestId('stakes').textContent).not.toContain('0 semanas');
});

it('singular quando falta um treino', async () => {
  const s = make(2, []);
  const user = setup({ ...s, progress: { ...s.progress, need: 1 } });
  await user.click(screen.getByRole('button', { name: 'Próximo' }));
  expect(screen.getByText('Falta 1 treino para fechar a semana.')).toBeInTheDocument();
});
