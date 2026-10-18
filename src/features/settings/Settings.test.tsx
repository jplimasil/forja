import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Settings } from './Settings';

const setGoal = vi.fn().mockResolvedValue('2026-10-19');
const save = vi.fn().mockResolvedValue(undefined);
vi.mock('../../data/useWeekState', () => ({
  useWeekState: () => ({
    now: { date: '2026-10-14', hour: 9, weekday: 3 }, weekStart: '2026-10-12',
    settings: { preferredHour: 18, timezone: 'America/Sao_Paulo', penaltyAmount: 10, penaltyDescription: 'no cofrinho', intensity: 'normal', motivations: ['ficar forte'], createdAt: '2026-09-01T00:00:00Z' },
  }),
}));
vi.mock('../../data/goals', () => ({
  useGoals: () => ({ data: [{ effectiveWeekStart: '2026-09-28', weeklyGoal: 4 }] }),
  useSetGoal: () => ({ mutateAsync: setGoal }),
}));
vi.mock('../../data/settings', () => ({ useSaveSettings: () => ({ mutateAsync: save }) }));
vi.mock('../../lib/auth', () => ({ signOut: vi.fn() }));
vi.mock('./PushSection', () => ({ PushSection: () => null }));

beforeEach(() => vi.clearAllMocks());

it('nova meta vale a partir da próxima segunda', async () => {
  render(<Settings />);
  const user = userEvent.setup();
  await user.click(screen.getByRole('button', { name: '5 treinos' }));
  await user.click(screen.getByRole('button', { name: 'Salvar meta' }));
  expect(setGoal).toHaveBeenCalledWith({ weeklyGoal: 5 });
  expect(await screen.findByText('Nova meta vale a partir de segunda (19/10).')).toBeInTheDocument();
});

it('mudar a intensidade salva na hora', async () => {
  render(<Settings />);
  await userEvent.setup().click(screen.getByRole('button', { name: 'Insistente' }));
  expect(save).toHaveBeenCalledWith({ intensity: 'insistente' });
});
