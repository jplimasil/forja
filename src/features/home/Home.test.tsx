import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router';
import type { WeekState } from '../../data/useWeekState';
import { Home } from './Home';

const checkin = vi.fn();
const undo = vi.fn();
const freeze = vi.fn();
let state: WeekState;

vi.mock('../../data/useWeekState', () => ({ useWeekState: () => state }));
vi.mock('../../data/checkins', () => ({
  useCheckin: () => ({ mutate: checkin }),
  useUndoCheckin: () => ({ mutate: undo }),
  useCheckins: () => ({ data: ['2026-10-12', '2026-10-13'] }),
}));
vi.mock('../../data/freezes', () => ({ useFreeze: () => ({ mutate: freeze }), useUnfreeze: () => ({ mutate: vi.fn() }) }));

function base(over: Partial<WeekState> = {}): WeekState {
  return {
    now: { date: '2026-10-15', hour: 12, weekday: 4 },
    weekStart: '2026-10-12',
    warmup: false,
    frozen: false,
    checkedInToday: false,
    progress: { done: 2, goal: 4, need: 2, available: 3, level: 'yellow' },
    streak: 6,
    debt: 0,
    freezeCheck: { ok: true },
    settings: { preferredHour: 18, timezone: 'America/Sao_Paulo', penaltyAmount: 10, penaltyDescription: 'no cofrinho', intensity: 'normal', motivations: [], createdAt: '2026-09-01T00:00:00Z' },
    ...over,
  };
}

function renderHome(s: WeekState) {
  state = s;
  render(<MemoryRouter><Home /></MemoryRouter>);
  return userEvent.setup();
}

beforeEach(() => vi.clearAllMocks());

it('mostra placar, dias restantes e nível de risco', () => {
  renderHome(base());
  expect(screen.getByLabelText('2 de 4 treinos')).toBeInTheDocument();
  expect(screen.getByText('Faltam 2 treinos e restam 3 dias.')).toBeInTheDocument();
  expect(screen.getByText('Apertado')).toBeInTheDocument();
  expect(screen.getByText('6 semanas')).toBeInTheDocument();
});

it('TREINEI HOJE registra o dia de hoje', async () => {
  const user = renderHome(base());
  await user.click(screen.getByRole('button', { name: 'Treinei hoje' }));
  expect(checkin).toHaveBeenCalledWith('2026-10-15');
});

it('com check-in feito mostra confirmação e permite desfazer', async () => {
  const user = renderHome(base({ checkedInToday: true }));
  expect(screen.getByText('Treino de hoje registrado')).toBeInTheDocument();
  await user.click(screen.getByRole('button', { name: 'Desfazer' }));
  expect(undo).toHaveBeenCalledWith('2026-10-15');
});

it('semana de aquecimento esconde streak e multa', () => {
  renderHome(base({ warmup: true, debt: 20 }));
  expect(screen.getByText('Semana de aquecimento: a cobrança começa na segunda.')).toBeInTheDocument();
  expect(screen.queryByText('6 semanas')).not.toBeInTheDocument();
  expect(screen.queryByText('R$20')).not.toBeInTheDocument();
});

it('dívida aparece só quando existe', () => {
  renderHome(base({ debt: 20 }));
  expect(screen.getByText('R$20')).toBeInTheDocument();
});

it('sem dívida o valor não aparece', () => {
  renderHome(base({ debt: 0 }));
  expect(screen.queryByText('R$0')).not.toBeInTheDocument();
});

it('congelar fica bloqueado com o motivo quando já usou no mês', () => {
  renderHome(base({ freezeCheck: { ok: false, reason: 'monthly-limit' } }));
  expect(screen.getByRole('button', { name: 'Congelar semana' })).toBeDisabled();
  expect(screen.getByText('Você já congelou uma semana este mês.')).toBeInTheDocument();
});

it('congelar chama a mutação com a semana atual', async () => {
  const user = renderHome(base());
  await user.click(screen.getByRole('button', { name: 'Congelar semana' }));
  expect(freeze).toHaveBeenCalledWith('2026-10-12');
});

it('atalho para o Tô sem vontade', () => {
  renderHome(base());
  expect(screen.getByRole('link', { name: 'Tô sem vontade' })).toHaveAttribute('href', '/sos');
});
