import { muscleLabel, type MuscleGroup } from './muscles';

const series = (n: number) => (n === 1 ? '1 série' : `${n} séries`);

/** Séries concluídas por grupo muscular: barras horizontais com rótulo direto (uma cor, a magnitude é o comprimento). */
export function MuscleVolumeBars({ data }: { data: { group: MuscleGroup | null; sets: number }[] }) {
  if (!data.length) return <p className="font-k-body text-sm text-k-muted">Nenhuma série concluída nesta semana.</p>;
  const max = Math.max(...data.map((d) => d.sets));
  return (
    <ul className="space-y-2.5">
      {data.map((d) => (
        <li key={d.group ?? 'sem-grupo'} className="space-y-1" title={`${muscleLabel(d.group)}: ${series(d.sets)}`}>
          <div className="flex items-baseline justify-between gap-2">
            <span className="font-k-body text-sm text-k-text">{muscleLabel(d.group)}</span>
            <span className="font-k-mono text-[11px] font-semibold text-k-muted tabular">{series(d.sets)}</span>
          </div>
          <div className="h-2 rounded-full bg-k-3" aria-hidden="true">
            <div className={`h-2 rounded-full ${d.group ? 'bg-k-lime' : 'bg-k-dim'}`} style={{ width: `${(d.sets / max) * 100}%` }} />
          </div>
        </li>
      ))}
    </ul>
  );
}
