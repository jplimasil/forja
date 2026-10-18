import { BrowserRouter, Route, Routes } from 'react-router';
import { useSession } from './lib/auth';
import { AppShell } from './ui/AppShell';
import { AuthScreen } from './features/auth/AuthScreen';
import { PageTitle } from './ui/Card';

function Placeholder({ title }: { title: string }) {
  return <PageTitle>{title}</PageTitle>;
}

function Splash() {
  return (
    <div className="grid min-h-dvh place-items-center">
      <p className="font-display text-5xl text-accent">FORJA</p>
    </div>
  );
}

export function App() {
  const { session, loading } = useSession();
  if (loading) return <Splash />;
  if (!session) return <AuthScreen />;
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/boas-vindas" element={<Placeholder title="Boas-vindas" />} />
        <Route element={<AppShell />}>
          <Route index element={<Placeholder title="Início" />} />
          <Route path="sos" element={<Placeholder title="Tô sem vontade" />} />
          <Route path="treino" element={<Placeholder title="Treino" />} />
          <Route path="corpo" element={<Placeholder title="Corpo" />} />
          <Route path="historico" element={<Placeholder title="Histórico" />} />
          <Route path="ajustes" element={<Placeholder title="Ajustes" />} />
        </Route>
      </Routes>
    </BrowserRouter>
  );
}
