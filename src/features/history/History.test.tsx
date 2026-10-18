import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { History } from './History';

const markPaid = vi.fn();
vi.mock('../../data/useWeekState', () => ({
  useWeekState: () => ({ now: { date: '2026-10-20', hour: 9, weekday: 2 }, settings: { penaltyDescription: 'no cofrinho' } }),
}));
vi.mock('../../data/checkins', () => ({ useCheckins: () => ({ data: ['2026-10-05', '2026-10-13'] }) }));
vi.mock('../../data/weeks', () => ({
  useWeeks: () => ({ data: [
    { weekStart: '2026-10-12', goal: 4, done: 1, status: 'failed', penaltyAmount: 10, penaltyPaidAt: null },
    { weekStart: '2026-10-05', goal: 4, done: 3, status: 'failed', penaltyAmount: 10, penaltyPaidAt: '2026-10-13T10:00:00Z' },
  ] }),
  useMarkPaid: () => ({ mutate: markPaid }),
}));

it('calendário marca os dias treinados', () => {
  render(<History />);
  expect(screen.getByText('outubro de 2026')).toBeInTheDocument();
  expect(screen.getByLabelText('5 de outubro: treinou')).toHaveAttribute('data-trained', 'true');
  expect(screen.getByLabelText('6 de outubro: sem treino')).toHaveAttribute('data-trained', 'false');
});

it('multa não paga pode ser marcada como paga; paga mostra "Paga"', async () => {
  render(<History />);
  const unpaid = screen.getByRole('listitem', { name: 'Semana de 12/10' });
  expect(within(unpaid).getByText('R$10 no cofrinho')).toBeInTheDocument();
  await userEvent.setup().click(within(unpaid).getByRole('button', { name: 'Marcar como paga' }));
  expect(markPaid).toHaveBeenCalledWith('2026-10-12');
  expect(within(screen.getByRole('listitem', { name: 'Semana de 05/10' })).getByText('Paga')).toBeInTheDocument();
});
