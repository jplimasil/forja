import { Link } from 'react-router';
import { muscleLabel } from './muscles';
import type { Routine } from './stats';
import { KLabel } from './kinetic/ui';

/** `value`: id da ficha, `null` para treino livre, `undefined` sem escolha. */
export function RoutinePicker({ routines, value, onChange }: {
  routines: Routine[]; value: string | null | undefined; onChange: (id: string | null) => void;
}) {
  const option = (selected: boolean) =>
    `flex min-h-12 w-full flex-col items-start justify-center gap-0.5 rounded-k border px-3 py-2 text-left transition ${
      selected ? 'border-k-lime/60 bg-k-2 shadow-[0_0_16px_-4px_rgba(204,255,0,0.3)]' : 'border-k-line bg-k-2 hover:border-k-dim'
    }`;
  return (
    <div className="grid gap-2 sm:grid-cols-2">
      {routines.map((r) => {
        const groups = [...new Set(r.exercises.map((e) => muscleLabel(e.muscleGroup)))].join(', ');
        return (
          <button key={r.id} type="button" aria-label={r.name} aria-pressed={value === r.id} onClick={() => onChange(r.id)} className={option(value === r.id)}>
            <span className="font-k-body text-sm font-semibold text-k-text">{r.name}</span>
            <KLabel>{r.exercises.length} {r.exercises.length === 1 ? 'exercício' : 'exercícios'}{groups && `: ${groups}`}</KLabel>
          </button>
        );
      })}
      <button type="button" aria-label="Treino livre" aria-pressed={value === null} onClick={() => onChange(null)} className={option(value === null)}>
        <span className="font-k-body text-sm font-semibold text-k-text">Treino livre</span>
        <KLabel>Sem ficha, você adiciona os exercícios</KLabel>
      </button>
      {routines.length === 0 && (
        <p className="font-k-body text-xs text-k-muted sm:col-span-2">
          Você ainda não tem fichas. <Link to="/treino/fichas" className="text-k-lime underline underline-offset-4">Criar uma ficha</Link> deixa a tabela pronta com as cargas da última vez.
        </p>
      )}
    </div>
  );
}
