import { useId, useState, type FormEvent } from 'react';
import type { ExerciseInfo } from '../../data/workout';
import { MUSCLE_GROUPS, type ExerciseKind, type MuscleGroup } from './muscles';
import { Icon } from './kinetic/Icon';
import { KButton, KCard } from './kinetic/ui';

const field = 'w-full rounded-k border border-k-line bg-k-2 px-3 py-3 font-k-body text-sm text-k-text placeholder:text-k-dim focus:border-k-lime focus:outline-none';

/** Escolher um exercício já usado ou criar um novo com grupo e tipo. */
export function AddExercise({ exercises, onAdd, label = 'Adicionar exercício ao treino', askSets = false }: {
  exercises: ExerciseInfo[];
  onAdd: (e: { name: string; muscleGroup: MuscleGroup | null; kind: ExerciseKind | null; targetSets: number }) => void;
  label?: string;
  /** Pede as séries-alvo (usado nas fichas). */
  askSets?: boolean;
}) {
  const listId = useId();
  const [sets, setSets] = useState('3');
  const [open, setOpen] = useState(false);
  const [name, setName] = useState('');
  const [group, setGroup] = useState<MuscleGroup | ''>('');
  const [kind, setKind] = useState<ExerciseKind | ''>('');

  function changeName(v: string) {
    setName(v);
    const known = exercises.find((e) => e.name.toLowerCase() === v.trim().toLowerCase());
    if (known) {
      setGroup(known.muscleGroup ?? '');
      setKind(known.kind ?? '');
    }
  }

  function submit(e: FormEvent) {
    e.preventDefault();
    if (!name.trim()) return;
    onAdd({ name: name.trim(), muscleGroup: group || null, kind: kind || null, targetSets: Math.min(10, Math.max(1, Math.round(Number(sets) || 3))) });
    setName('');
    setGroup('');
    setKind('');
    setOpen(false);
  }

  if (!open) {
    return (
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="flex min-h-14 w-full items-center justify-center gap-2 rounded-k border border-k-line bg-k-1 font-k-body text-sm font-semibold uppercase tracking-wider text-k-text hover:border-k-lime"
      >
        <Icon name="plus" className="text-k-lime" /> {label}
      </button>
    );
  }

  return (
    <KCard className="p-4">
      <form onSubmit={submit} className="grid gap-3 sm:grid-cols-[1fr_10rem_9rem]">
        <label className="sm:col-span-3">
          <span className="sr-only">Nome do exercício</span>
          <input aria-label="Nome do exercício" className={field} list={listId} value={name} onChange={(e) => changeName(e.target.value)} placeholder="Ex.: Supino reto com barra" autoFocus />
          <datalist id={listId}>{exercises.map((x) => <option key={x.id} value={x.name} />)}</datalist>
        </label>
        <select aria-label="Grupo muscular" className={field} value={group} onChange={(e) => setGroup(e.target.value as MuscleGroup | '')}>
          <option value="">Grupo muscular</option>
          {MUSCLE_GROUPS.map((m) => <option key={m.key} value={m.key}>{m.label}</option>)}
        </select>
        <select aria-label="Tipo" className={field} value={kind} onChange={(e) => setKind(e.target.value as ExerciseKind | '')}>
          <option value="">Tipo</option>
          <option value="composto">Composto</option>
          <option value="isolador">Isolador</option>
        </select>
        {askSets && (
          <label className="sm:col-span-3">
            <span className="mb-1 block font-k-mono text-[11px] uppercase tracking-[0.08em] text-k-muted">Séries-alvo</span>
            <input aria-label="Séries-alvo" className={`${field} font-k-mono`} inputMode="numeric" value={sets} onChange={(e) => setSets(e.target.value)} />
          </label>
        )}
        <div className="flex gap-2 sm:col-span-3">
          <KButton onClick={() => setOpen(false)}>Cancelar</KButton>
          <KButton type="submit" variant="primary" className="flex-1" disabled={!name.trim()}>Adicionar</KButton>
        </div>
      </form>
    </KCard>
  );
}
