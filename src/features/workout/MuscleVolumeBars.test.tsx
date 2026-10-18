import { render, screen } from '@testing-library/react';
import { MuscleVolumeBars } from './MuscleVolumeBars';

it('barras com rótulo e contagem, incluindo "Sem grupo" no singular', () => {
  render(<MuscleVolumeBars data={[{ group: 'peito', sets: 6 }, { group: null, sets: 1 }]} />);
  expect(screen.getByText('Peito')).toBeInTheDocument();
  expect(screen.getByText('6 séries')).toBeInTheDocument();
  expect(screen.getByText('Sem grupo')).toBeInTheDocument();
  expect(screen.getByText('1 série')).toBeInTheDocument();
});

it('semana sem séries concluídas', () => {
  render(<MuscleVolumeBars data={[]} />);
  expect(screen.getByText('Nenhuma série concluída nesta semana.')).toBeInTheDocument();
});
