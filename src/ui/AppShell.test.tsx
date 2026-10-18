import { render, screen } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router';
import { AppShell } from './AppShell';

it('mostra as 5 seções e marca a ativa', () => {
  render(
    <MemoryRouter initialEntries={['/treino']}>
      <Routes>
        <Route element={<AppShell />}>
          <Route path="*" element={<p>conteúdo</p>} />
        </Route>
      </Routes>
    </MemoryRouter>,
  );
  for (const name of ['Início', 'Treino', 'Corpo', 'Histórico', 'Ajustes']) {
    expect(screen.getByRole('link', { name })).toBeInTheDocument();
  }
  expect(screen.getByRole('link', { name: 'Treino' })).toHaveAttribute('aria-current', 'page');
  expect(screen.getByRole('link', { name: 'Início' })).not.toHaveAttribute('aria-current');
  expect(screen.getByText('conteúdo')).toBeInTheDocument();
});
