import { useState } from 'react';
import type { SetPatch, WorkoutSet } from '../../data/workout';
import { KIND_LABELS, MUSCLE_GROUPS, muscleLabel, type ExerciseKind, type MuscleGroup } from './muscles';
import { SetRow } from './SetRow';
import { Icon } from './kinetic/Icon';
import { KButton, KCard, KLabel } from './kinetic/ui';

const selectClass = 'w-full rounded-k border border-k-line bg-k-2 px-3 py-2.5 font-k-body text-sm text-k-text focus:border-k-lime focus:outline-none';

export function ExerciseCard(p: {
  name: string;
  sets: WorkoutSet[];
  muscleGroup: MuscleGroup | null;
  kind: ExerciseKind | null;
  prs: Set<string>;
  onUpdate: (patch: SetPatch) => void;
  onAddSet: () => void;
  onEditMeta: (group: MuscleGroup | null, kind: ExerciseKind | null) => void;
  onRemove: () => void;
}) {
  const [menu, setMenu] = useState(false);
  const [editingMeta, setEditingMeta] = useState(false);
  const [group, setGroup] = useState<MuscleGroup | ''>(p.muscleGroup ?? '');
  const [kind, setKind] = useState<ExerciseKind | ''>(p.kind ?? '');
  const allDone = p.sets.length > 0 && p.sets.every((s) => s.done);

  return (
    <KCard active={!allDone && p.sets.some((s) => s.done)} className="overflow-hidden">
      <header className="flex items-center justify-between gap-3 border-b border-k-line bg-k-2 p-4">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-1.5">
            <span className="rounded-full bg-k-3 px-2 py-0.5 font-k-mono text-[11px] font-semibold uppercase tracking-[0.08em] text-k-lime">
              {muscleLabel(p.muscleGroup)}
            </span>
            {p.kind && <KLabel>{KIND_LABELS[p.kind]}</KLabel>}
            {allDone && <KLabel className="text-k-lime">Concluído</KLabel>}
          </div>
          <h3 className="mt-1 truncate font-k-display text-[26px] leading-7 tracking-[0.03em] text-k-text">{p.name}</h3>
        </div>
        <button
          type="button"
          aria-label={`Opções de ${p.name}`}
          aria-expanded={menu}
          onClick={() => setMenu(!menu)}
          className="grid size-10 shrink-0 place-items-center rounded-k bg-k-3 text-k-muted hover:text-k-text"
        >
          <Icon name="more" />
        </button>
      </header>

      {menu && !editingMeta && (
        <div className="flex flex-col border-b border-k-line bg-k-2 p-2">
          <button type="button" onClick={() => setEditingMeta(true)} className="flex min-h-11 items-center gap-2 rounded-k px-2 text-left font-k-body text-sm text-k-text hover:bg-k-3">
            <Icon name="edit" size={16} /> Editar grupo e tipo
          </button>
          <button type="button" onClick={p.onRemove} className="flex min-h-11 items-center gap-2 rounded-k px-2 text-left font-k-body text-sm text-k-danger hover:bg-k-3">
            <Icon name="trash" size={16} /> Remover do treino de hoje
          </button>
        </div>
      )}
      {editingMeta && (
        <div className="grid gap-2 border-b border-k-line bg-k-2 p-3 sm:grid-cols-[1fr_1fr_auto]">
          <select aria-label="Grupo muscular" className={selectClass} value={group} onChange={(e) => setGroup(e.target.value as MuscleGroup | '')}>
            <option value="">Sem grupo</option>
            {MUSCLE_GROUPS.map((m) => <option key={m.key} value={m.key}>{m.label}</option>)}
          </select>
          <select aria-label="Tipo" className={selectClass} value={kind} onChange={(e) => setKind(e.target.value as ExerciseKind | '')}>
            <option value="">Sem tipo</option>
            <option value="composto">Composto</option>
            <option value="isolador">Isolador</option>
          </select>
          <KButton variant="primary" onClick={() => { p.onEditMeta(group || null, kind || null); setEditingMeta(false); setMenu(false); }}>Salvar</KButton>
        </div>
      )}

      <div className="space-y-1.5 p-4">
        <div className="grid grid-cols-12 gap-1 px-2 pb-1 text-center" aria-hidden="true">
          <KLabel className="col-span-2 text-left">Set</KLabel>
          <KLabel className="col-span-3">Carga</KLabel>
          <KLabel className="col-span-3">Reps</KLabel>
          <KLabel className="col-span-2">RPE</KLabel>
          <KLabel className="col-span-2 text-right">✓</KLabel>
        </div>
        {p.sets.map((s) => <SetRow key={s.id} set={s} pr={p.prs.has(s.id)} onUpdate={p.onUpdate} />)}
      </div>
      <div className="px-4 pb-4">
        <button
          type="button"
          onClick={p.onAddSet}
          className="flex min-h-11 w-full items-center justify-center gap-1 rounded-k bg-k-3 font-k-mono text-[11px] font-semibold uppercase tracking-[0.08em] text-k-text hover:bg-k-line"
        >
          <Icon name="plus" size={15} /> Adicionar série
        </button>
      </div>
    </KCard>
  );
}
