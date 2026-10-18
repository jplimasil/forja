import type { ButtonHTMLAttributes, HTMLAttributes, ReactNode } from 'react';

/** Componentes base do Kinetic Stealth (DESIGN.md do usuário): superfícies em camadas, bordas finas, cantos de 4px. */

export function KCard({ active = false, className = '', ...props }: HTMLAttributes<HTMLElement> & { active?: boolean }) {
  return (
    <section
      {...props}
      className={`rounded-k border ${active ? 'border-k-lime/40 bg-k-2 shadow-[0_0_24px_-4px_rgba(204,255,0,0.18)]' : 'border-k-line bg-k-1'} ${className}`}
    />
  );
}

/** Rótulo tático: mono, caixa alta, espaçado. */
export function KLabel({ children, className = '' }: { children: ReactNode; className?: string }) {
  return <span className={`font-k-mono text-[11px] font-semibold uppercase leading-[14px] tracking-[0.08em] text-k-muted ${className}`}>{children}</span>;
}

type Variant = 'primary' | 'ghost' | 'danger';
const VARIANTS: Record<Variant, string> = {
  primary: 'bg-k-lime text-k-base font-bold hover:shadow-[0_0_20px_rgba(204,255,0,0.4)] active:scale-[0.99]',
  ghost: 'border border-k-line text-k-text hover:border-k-lime',
  danger: 'border border-k-danger text-k-danger bg-k-2 hover:bg-k-danger/10',
};

export function KButton({ variant = 'ghost', className = '', ...props }: ButtonHTMLAttributes<HTMLButtonElement> & { variant?: Variant }) {
  return (
    <button
      type="button"
      {...props}
      className={`inline-flex min-h-12 items-center justify-center gap-2 rounded-k px-4 font-k-body text-sm uppercase tracking-wider transition
                  disabled:cursor-not-allowed disabled:opacity-40 ${VARIANTS[variant]} ${className}`}
    />
  );
}

/** Chip de seleção/status: pílula, para criar contraste com os cartões retangulares. */
export function KChip({ selected = false, className = '', ...props }: ButtonHTMLAttributes<HTMLButtonElement> & { selected?: boolean }) {
  return (
    <button
      type="button"
      aria-pressed={selected}
      {...props}
      className={`inline-flex min-h-9 items-center gap-1 rounded-full px-3 font-k-mono text-[11px] font-semibold uppercase tracking-[0.08em] transition ${
        selected ? 'bg-k-lime text-k-base shadow-[0_0_12px_rgba(204,255,0,0.35)]' : 'bg-k-3 text-k-text hover:bg-k-line'
      } ${className}`}
    />
  );
}

const pct = (d: number) => `${d >= 0 ? '+' : '−'}${Math.round(Math.abs(d) * 100)}% vs. anterior`;

export function StatTile({ label, value, unit, delta, hint }: { label: string; value: string; unit?: string; delta?: number | null; hint?: string }) {
  return (
    <KCard className="flex flex-col p-4">
      <KLabel>{label}</KLabel>
      <p className="mt-2 flex items-baseline gap-1">
        <span className="font-k-mono text-[22px] font-semibold leading-[26px] tracking-[-0.02em] text-k-text tabular">{value}</span>
        {unit && <KLabel>{unit}</KLabel>}
      </p>
      {delta !== undefined && delta !== null && (
        <p className={`mt-1 font-k-mono text-[11px] font-semibold ${delta >= 0 ? 'text-k-lime' : 'text-k-muted'}`}>{pct(delta)}</p>
      )}
      {hint && <p className="mt-1 font-k-mono text-[11px] text-k-muted">{hint}</p>}
    </KCard>
  );
}
