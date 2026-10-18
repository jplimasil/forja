import { useState, type FormEvent } from 'react';
import { Link } from 'react-router';
import {
  useAddRoutineExercise, useDeleteRoutine, useRemoveRoutineExercise, useRoutines, useSaveRoutine, useUpdateRoutineExercise,
} from '../../data/routines';
import { useExercises } from '../../data/workout';
import { AddExercise } from './AddExercise';
import { KIND_LABELS, muscleLabel } from './muscles';
import type { Routine } from './stats';
import { Icon } from './kinetic/Icon';
import { KButton, KCard, KLabel } from './kinetic/ui';

const field = 'w-full rounded-k border border-k-line bg-k-2 px-3 py-3 font-k-body text-sm text-k-text placeholder:text-k-dim focus:border-k-lime focus:outline-none';
const iconBtn = 'grid size-10 place-items-center rounded-k bg-k-3 text-k-muted hover:text-k-text disabled:opacity-30';

function RoutineCard({ routine }: { routine: Routine }) {
  const exercises = useExercises().data ?? [];
  const save = useSaveRoutine();
  const remove = useDeleteRoutine();
  const addExercise = useAddRoutineExercise();
  const updateExercise = useUpdateRoutineExercise();
  const removeExercise = useRemoveRoutineExercise();
  const [renaming, setRenaming] = useState(false);
  const [name, setName] = useState(routine.name);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const list = routine.exercises;

  function move(i: number, dir: -1 | 1) {
    const a = list[i];
    const b = list[i + dir];
    if (!b) return;
    updateExercise.mutate({ id: a.id, position: b.position === a.position ? i + dir : b.position });
    updateExercise.mutate({ id: b.id, position: b.position === a.position ? i : a.position });
  }

  function rename(e: FormEvent) {
    e.preventDefault();
    if (!name.trim()) return;
    save.mutate({ id: routine.id, name });
    setRenaming(false);
  }

  return (
    <KCard aria-label={routine.name} className="overflow-hidden">
      <header className="flex items-center justify-between gap-3 border-b border-k-line bg-k-2 p-4">
        {renaming ? (
          <form onSubmit={rename} className="flex flex-1 gap-2">
            <input aria-label="Nome da ficha" className={field} value={name} onChange={(e) => setName(e.target.value)} maxLength={60} autoFocus />
            <KButton type="submit" variant="primary" disabled={!name.trim()}>Salvar</KButton>
          </form>
        ) : (
          <>
            <div className="min-w-0">
              <KLabel>{list.length} {list.length === 1 ? 'exercício' : 'exercícios'}</KLabel>
              <h2 className="line-clamp-2 font-k-display text-[28px] leading-8 tracking-[0.03em] text-k-text">{routine.name}</h2>
            </div>
            <div className="flex shrink-0 gap-1.5">
              <button type="button" aria-label={`Renomear ${routine.name}`} onClick={() => setRenaming(true)} className={iconBtn}><Icon name="edit" size={16} /></button>
              {confirmDelete ? (
                <KButton variant="danger" onClick={() => remove.mutate(routine.id)}>Apagar mesmo</KButton>
              ) : (
                <button type="button" aria-label={`Apagar ${routine.name}`} onClick={() => setConfirmDelete(true)} className={iconBtn}><Icon name="trash" size={16} /></button>
              )}
            </div>
          </>
        )}
      </header>

      <ol className="divide-y divide-k-line">
        {list.map((e, i) => (
          <li key={e.id} className="flex flex-wrap items-center gap-x-3 gap-y-2 px-4 py-3">
            <span className="w-6 font-k-mono text-[11px] font-semibold text-k-muted">{String(i + 1).padStart(2, '0')}</span>
            <div className="min-w-0 flex-1 basis-[calc(100%-2.25rem)] sm:basis-auto">
              <p className="truncate font-k-body text-sm font-semibold text-k-text">{e.name}</p>
              <KLabel>{muscleLabel(e.muscleGroup)}{e.kind ? `, ${KIND_LABELS[e.kind]}` : ''}</KLabel>
            </div>
            <div className="ml-9 flex items-center gap-1 sm:ml-0" aria-label={`Séries-alvo de ${e.name}`}>
              <button type="button" aria-label={`Menos séries em ${e.name}`} disabled={e.targetSets <= 1} onClick={() => updateExercise.mutate({ id: e.id, targetSets: e.targetSets - 1 })} className={`${iconBtn} size-8`}>−</button>
              <span className="w-12 text-center font-k-mono text-sm font-semibold text-k-text">{e.targetSets}×</span>
              <button type="button" aria-label={`Mais séries em ${e.name}`} disabled={e.targetSets >= 10} onClick={() => updateExercise.mutate({ id: e.id, targetSets: e.targetSets + 1 })} className={`${iconBtn} size-8`}>+</button>
            </div>
            <div className="ml-auto flex gap-1">
              <button type="button" aria-label={`Mover ${e.name} para cima`} disabled={i === 0} onClick={() => move(i, -1)} className={`${iconBtn} size-8`}><Icon name="up" size={14} /></button>
              <button type="button" aria-label={`Mover ${e.name} para baixo`} disabled={i === list.length - 1} onClick={() => move(i, 1)} className={`${iconBtn} size-8`}><Icon name="down" size={14} /></button>
              <button type="button" aria-label={`Tirar ${e.name} da ficha`} onClick={() => removeExercise.mutate(e.id)} className={`${iconBtn} size-8 hover:text-k-danger`}><Icon name="close" size={14} /></button>
            </div>
          </li>
        ))}
      </ol>

      <div className="p-4">
        <AddExercise
          askSets
          label="Adicionar exercício à ficha"
          exercises={exercises}
          onAdd={(x) => addExercise.mutate({ routineId: routine.id, ...x, position: list.length })}
        />
      </div>
    </KCard>
  );
}

export function Routines() {
  const routines = useRoutines().data ?? [];
  const save = useSaveRoutine();
  const [name, setName] = useState('');

  function create(e: FormEvent) {
    e.preventDefault();
    if (!name.trim()) return;
    save.mutate({ name, position: routines.length });
    setName('');
  }

  return (
    <div className="mx-auto max-w-3xl space-y-6 font-k-body text-k-text">
      <header>
        <Link to="/treino" className="font-k-mono text-[11px] font-semibold uppercase tracking-[0.08em] text-k-muted hover:text-k-text">Voltar ao treino</Link>
        <h1 className="mt-2 font-k-display text-[40px] leading-10 tracking-[0.04em] sm:text-[56px] sm:leading-[56px]">MINHAS FICHAS</h1>
        <p className="mt-1 text-xs text-k-muted">Monte cada treino uma vez. No dia, a tabela vem pronta com as cargas da última vez.</p>
      </header>

      <form onSubmit={create} className="flex gap-2">
        <input aria-label="Nome da nova ficha" className={field} value={name} onChange={(e) => setName(e.target.value)} maxLength={60} placeholder="Ex.: Treino A – Peito e bíceps" />
        <KButton type="submit" variant="primary" className="shrink-0 whitespace-nowrap" disabled={!name.trim()}>Criar ficha</KButton>
      </form>

      {routines.length === 0 && <p className="text-sm text-k-muted">Nenhuma ficha ainda. Crie a primeira acima.</p>}
      {routines.map((r) => <RoutineCard key={r.id} routine={r} />)}
    </div>
  );
}
