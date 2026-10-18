import { NavLink, Outlet } from 'react-router';
import type { ReactNode } from 'react';

const icon = (d: ReactNode) => (
  <svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    {d}
  </svg>
);

const ITEMS = [
  { to: '/', label: 'Início', icon: icon(<><path d="M3 11l9-7 9 7" /><path d="M5 10v10h14V10" /></>) },
  { to: '/treino', label: 'Treino', icon: icon(<><path d="M6 7v10M18 7v10M3 10v4M21 10v4M6 12h12" /></>) },
  { to: '/corpo', label: 'Corpo', icon: icon(<><path d="M4 19l4-12 4 8 4-5 4 9" /></>) },
  { to: '/historico', label: 'Histórico', icon: icon(<><rect x="3" y="5" width="18" height="16" rx="2" /><path d="M3 10h18M8 3v4M16 3v4" /></>) },
  { to: '/ajustes', label: 'Ajustes', icon: icon(<><circle cx="12" cy="12" r="3" /><path d="M12 2v3M12 19v3M2 12h3M19 12h3M4.9 4.9l2.1 2.1M17 17l2.1 2.1M4.9 19.1L7 17M17 7l2.1-2.1" /></>) },
];

export function AppShell() {
  return (
    <div className="min-h-dvh lg:flex">
      <nav
        aria-label="Principal"
        className="fixed inset-x-0 bottom-0 z-30 border-t border-line bg-bg/95 pb-[env(safe-area-inset-bottom)] backdrop-blur
                   lg:sticky lg:top-0 lg:h-dvh lg:w-60 lg:shrink-0 lg:border-t-0 lg:border-r lg:pb-0 lg:pt-8"
      >
        <p className="hidden px-7 pb-10 font-display text-3xl tracking-wide text-accent lg:block">FORJA</p>
        <ul className="mx-auto flex max-w-lg justify-around lg:mx-0 lg:max-w-none lg:flex-col lg:gap-1 lg:px-3">
          {ITEMS.map((item) => (
            <li key={item.to} className="flex-1 lg:flex-none">
              <NavLink
                to={item.to}
                end={item.to === '/'}
                className={({ isActive }) =>
                  `flex flex-col items-center gap-1 py-2.5 text-[11px] font-medium transition-colors lg:flex-row lg:gap-3 lg:rounded-lg lg:px-4 lg:py-3 lg:text-[15px] ${
                    isActive ? 'text-accent lg:bg-card' : 'text-muted hover:text-fg'
                  }`
                }
              >
                {item.icon}
                <span>{item.label}</span>
              </NavLink>
            </li>
          ))}
        </ul>
      </nav>
      <main className="mx-auto w-full max-w-5xl px-4 pb-28 pt-[max(1.25rem,env(safe-area-inset-top))] sm:px-6 lg:px-10 lg:pb-12 lg:pt-10">
        <Outlet />
      </main>
    </div>
  );
}
