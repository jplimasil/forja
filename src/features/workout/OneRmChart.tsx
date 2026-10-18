import { CartesianGrid, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis, type TooltipProps } from 'recharts';
import type { ISODate } from '@rules/types.ts';
import { KLabel } from './kinetic/ui';

const ddmm = (d: ISODate) => `${d.slice(8, 10)}/${d.slice(5, 7)}`;
const kg = (n: number) => n.toLocaleString('pt-BR', { maximumFractionDigits: 1 });

function Tip({ active, payload }: TooltipProps<number, string>) {
  if (!active || !payload?.length) return null;
  const p = payload[0].payload as { weekStart: ISODate; value: number };
  return (
    <div className="rounded-k border border-k-line bg-k-2/90 px-3 py-2 backdrop-blur">
      <KLabel>Semana de {ddmm(p.weekStart)}</KLabel>
      <p className="font-k-mono text-sm font-semibold text-k-text">{kg(p.value)} kg</p>
    </div>
  );
}

/** Melhor 1RM estimado por semana: linha única em verde-limão sobre a superfície escura. */
export function OneRmChart({ data }: { data: { weekStart: ISODate; value: number }[] }) {
  if (data.length < 2) {
    return <p className="font-k-body text-sm text-k-muted">Conclua séries deste exercício em mais uma semana para ver a linha de evolução.</p>;
  }
  const first = data[0].value;
  const last = data[data.length - 1].value;
  return (
    <figure className="space-y-2">
      <figcaption className="flex items-baseline justify-between gap-2">
        <KLabel>1RM estimado</KLabel>
        <span className="font-k-mono text-[11px] font-semibold text-k-lime">
          {kg(last)} kg ({last - first >= 0 ? '+' : '−'}{kg(Math.abs(last - first))} desde {ddmm(data[0].weekStart)})
        </span>
      </figcaption>
      <div className="h-36" aria-hidden="true">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={data} margin={{ top: 8, right: 8, bottom: 0, left: -16 }}>
            <CartesianGrid vertical={false} stroke="var(--color-k-line)" strokeDasharray="2 2" />
            <XAxis dataKey="weekStart" tickFormatter={ddmm} stroke="var(--color-k-muted)" tick={{ fontSize: 10, fontFamily: 'JetBrains Mono' }} tickLine={false} axisLine={false} />
            <YAxis stroke="var(--color-k-muted)" tick={{ fontSize: 10, fontFamily: 'JetBrains Mono' }} tickLine={false} axisLine={false} width={44} domain={['auto', 'auto']} tickFormatter={kg} />
            <Tooltip content={<Tip />} cursor={{ stroke: 'var(--color-k-dim)', strokeWidth: 1 }} />
            <Line type="monotone" dataKey="value" stroke="var(--color-k-lime)" strokeWidth={2} isAnimationActive={false}
              dot={{ r: 4, fill: 'var(--color-k-1)', stroke: 'var(--color-k-lime)', strokeWidth: 2 }}
              activeDot={{ r: 6, fill: 'var(--color-k-lime)', stroke: 'var(--color-k-1)', strokeWidth: 2 }} />
          </LineChart>
        </ResponsiveContainer>
      </div>
      <details className="font-k-body text-xs text-k-muted">
        <summary className="cursor-pointer hover:text-k-text">Ver dados em tabela</summary>
        <table className="mt-2 w-full text-left font-k-mono tabular">
          <thead><tr><th className="py-1 font-medium">Semana</th><th className="py-1 font-medium">1RM estimado (kg)</th></tr></thead>
          <tbody>
            {data.map((p) => (
              <tr key={p.weekStart} className="border-t border-k-line"><td className="py-1">{ddmm(p.weekStart)}</td><td className="py-1 text-k-text">{kg(p.value)}</td></tr>
            ))}
          </tbody>
        </table>
      </details>
    </figure>
  );
}
