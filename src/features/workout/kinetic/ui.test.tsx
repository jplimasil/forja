import { render, screen } from '@testing-library/react';
import { KButton, StatTile } from './ui';

it('StatTile mostra variação positiva e negativa', () => {
  const { rerender } = render(<StatTile label="Tonelagem hoje" value="9.850" unit="kg" delta={0.12} />);
  expect(screen.getByText('+12% vs. anterior')).toBeInTheDocument();
  rerender(<StatTile label="Tonelagem hoje" value="9.850" unit="kg" delta={-0.05} />);
  expect(screen.getByText('−5% vs. anterior')).toBeInTheDocument();
});

it('StatTile sem base de comparação não mostra variação', () => {
  render(<StatTile label="Tonelagem hoje" value="800" unit="kg" delta={null} />);
  expect(screen.queryByText(/vs\. anterior/)).not.toBeInTheDocument();
});

it('KButton é um botão com o texto', () => {
  render(<KButton variant="primary">Registrar treino</KButton>);
  expect(screen.getByRole('button', { name: 'Registrar treino' })).toBeInTheDocument();
});
