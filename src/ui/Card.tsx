import type { HTMLAttributes } from 'react';

export function Card({ className = '', ...props }: HTMLAttributes<HTMLElement>) {
  return <section {...props} className={`rounded-2xl bg-card p-5 ${className}`} />;
}

/** Título de tela: condensado e grande, como placa de vestiário. */
export function PageTitle({ children, sub }: { children: string; sub?: string }) {
  return (
    <header className="mb-6">
      <h1 className="font-head text-4xl font-bold uppercase leading-none tracking-tight">{children}</h1>
      {sub && <p className="mt-2 text-muted">{sub}</p>}
    </header>
  );
}
