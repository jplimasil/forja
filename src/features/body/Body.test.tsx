import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Body } from './Body';

const add = vi.fn();
vi.mock('../../data/body', async (orig) => ({
  ...(await orig<typeof import('../../data/body')>()),
  useBodyEntries: () => ({ data: [] }),
  useAddBodyEntry: () => ({ mutate: add }),
}));
vi.mock('../../data/useWeekState', () => ({ useWeekState: () => ({ now: { date: '2026-10-15', hour: 9, weekday: 4 } }) }));

beforeEach(() => vi.clearAllMocks());

it('aceita vírgula e envia só os campos preenchidos', async () => {
  render(<Body />);
  const user = userEvent.setup();
  await user.type(screen.getByLabelText('Peso (kg)'), '80,5');
  await user.type(screen.getByLabelText('Cintura (cm)'), '90');
  await user.click(screen.getByRole('button', { name: 'Salvar medidas' }));
  expect(add).toHaveBeenCalledWith({ date: '2026-10-15', weightKg: 80.5, measurements: { cintura: 90 } }, expect.anything());
});

it('formulário vazio não envia', async () => {
  render(<Body />);
  await userEvent.setup().click(screen.getByRole('button', { name: 'Salvar medidas' }));
  expect(add).not.toHaveBeenCalled();
});
