import { render, screen } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { AppShell } from './AppShell';

it('mostra as 5 seções e marca a ativa', () => {
  render(
    <QueryClientProvider client={new QueryClient()}>
    <MemoryRouter initialEntries={['/treino']}>
      <Routes>
        <Route element={<AppShell />}>
          <Route path="*" element={<p>conteúdo</p>} />
        </Route>
      </Routes>
    </MemoryRouter>
    </QueryClientProvider>,
  );
  for (const name of ['Início', 'Treino', 'Corpo', 'Histórico', 'Ajustes']) {
    expect(screen.getByRole('link', { name })).toBeInTheDocument();
  }
  expect(screen.getByRole('link', { name: 'Treino' })).toHaveAttribute('aria-current', 'page');
  expect(screen.getByRole('link', { name: 'Início' })).not.toHaveAttribute('aria-current');
  expect(screen.getByText('conteúdo')).toBeInTheDocument();
});
