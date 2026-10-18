import { CartesianGrid, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis, type TooltipProps } from 'recharts';

export interface Point { x: string; y: number }

const shortDate = (iso: string) => `${iso.slice(8, 10)}/${iso.slice(5, 7)}`;
const fmt = (n: number) => n.toLocaleString('pt-BR', { maximumFractionDigits: 1 });

function ChartTooltip({ active, payload, unit }: TooltipProps<number, string> & { unit: string }) {
  if (!active || !payload?.length) return null;
  const p = payload[0].payload as Point;
  return (
    <div className="rounded-lg border border-line bg-raised px-3 py-2 text-sm shadow-lg shadow-black/40">
      <p className="text-muted">{shortDate(p.x)}</p>
      <p className="font-semibold text-fg tabular">{fmt(p.y)} {unit}</p>
    </div>
  );
}

/** Evolução de uma única medida no tempo: número atual em destaque, variação e linha. */
export function LineChartCard({ title, data, unit }: { title: string; data: Point[]; unit: string }) {
  const last = data[data.length - 1];
  const delta = data.length > 1 ? last.y - data[0].y : 0;
  return (
    <figure className="rounded-2xl bg-card p-5">
      <figcaption className="flex flex-wrap items-baseline justify-between gap-2">
        <span className="font-head text-xl font-semibold">{title}</span>
        {last && (
          <span className="flex items-baseline gap-2">
            <span className="font-display text-3xl tabular">{fmt(last.y)}</span>
            <span className="text-sm text-muted">{unit}</span>
            {data.length > 1 && (
              <span className="text-sm text-muted tabular">
                {delta > 0 ? '+' : ''}{fmt(delta)} desde {shortDate(data[0].x)}
              </span>
            )}
          </span>
        )}
      </figcaption>

      {data.length < 2 ? (
        <p className="mt-4 text-sm text-muted">Registre mais uma vez para ver a linha de evolução.</p>
      ) : (
        <>
          <div className="mt-4 h-48" aria-hidden="true">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={data} margin={{ top: 8, right: 8, bottom: 0, left: -12 }}>
                <CartesianGrid vertical={false} stroke="var(--color-line)" strokeDasharray="0" />
                <XAxis dataKey="x" tickFormatter={shortDate} stroke="var(--color-muted)" tick={{ fontSize: 12 }} tickLine={false} axisLine={false} minTickGap={24} />
                <YAxis stroke="var(--color-muted)" tick={{ fontSize: 12 }} tickLine={false} axisLine={false} width={44} domain={['auto', 'auto']} tickFormatter={fmt} />
                <Tooltip content={<ChartTooltip unit={unit} />} cursor={{ stroke: 'var(--color-muted)', strokeWidth: 1 }} />
                <Line
                  type="monotone"
                  dataKey="y"
                  stroke="var(--color-accent)"
                  strokeWidth={2}
                  dot={{ r: 4, fill: 'var(--color-accent)', stroke: 'var(--color-card)', strokeWidth: 2 }}
                  activeDot={{ r: 6, fill: 'var(--color-accent)', stroke: 'var(--color-card)', strokeWidth: 2 }}
                  isAnimationActive={false}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
          <details className="mt-3 text-sm text-muted">
            <summary className="cursor-pointer hover:text-fg">Ver dados em tabela</summary>
            <table className="mt-2 w-full text-left tabular">
              <thead><tr><th className="py-1 font-medium">Data</th><th className="py-1 font-medium">{title} ({unit})</th></tr></thead>
              <tbody>
                {data.map((p) => (
                  <tr key={p.x} className="border-t border-line"><td className="py-1">{shortDate(p.x)}</td><td className="py-1 text-fg">{fmt(p.y)}</td></tr>
                ))}
              </tbody>
            </table>
          </details>
        </>
      )}
    </figure>
  );
}
