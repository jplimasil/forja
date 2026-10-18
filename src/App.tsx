import { BrowserRouter, Navigate, Outlet, Route, Routes, useLocation } from 'react-router';
import { useSession } from './lib/auth';
import { useSettings } from './data/settings';
import { AppShell } from './ui/AppShell';
import { AuthScreen } from './features/auth/AuthScreen';
import { Onboarding } from './features/onboarding/Onboarding';
import { Home } from './features/home/Home';
import { Sos } from './features/sos/Sos';
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

/** Sem configuração → primeiro acesso; já configurado → nunca volta ao primeiro acesso. */
function SettingsGate() {
  const { data, isPending } = useSettings();
  const { pathname } = useLocation();
  if (isPending) return <Splash />;
  const onboarding = pathname === '/boas-vindas';
  if (!data && !onboarding) return <Navigate to="/boas-vindas" replace />;
  if (data && onboarding) return <Navigate to="/" replace />;
  return <Outlet />;
}

export function App() {
  const { session, loading } = useSession();
  if (loading) return <Splash />;
  if (!session) return <AuthScreen />;
  return (
    <BrowserRouter>
      <Routes>
        <Route element={<SettingsGate />}>
          <Route path="/boas-vindas" element={<Onboarding />} />
          <Route element={<AppShell />}>
            <Route index element={<Home />} />
            <Route path="sos" element={<Sos />} />
            <Route path="treino" element={<Placeholder title="Treino" />} />
            <Route path="corpo" element={<Placeholder title="Corpo" />} />
            <Route path="historico" element={<Placeholder title="Histórico" />} />
            <Route path="ajustes" element={<Placeholder title="Ajustes" />} />
            <Route path="*" element={<Navigate to="/" replace />} />
          </Route>
        </Route>
      </Routes>
    </BrowserRouter>
  );
}
