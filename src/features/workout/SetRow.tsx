import { useState, type FormEvent } from 'react';
import type { SetPatch, WorkoutSet } from '../../data/workout';
import { Icon } from './kinetic/Icon';

const pad = (n: number) => String(n).padStart(2, '0');
const fmt = (n: number | null) => (n === null ? '—' : n.toLocaleString('pt-BR', { maximumFractionDigits: 2 }));
const toText = (n: number | null) => (n === null ? '' : String(n).replace('.', ','));

function parseNum(s: string): number | null {
  const t = s.trim().replace(',', '.');
  if (!t) return null;
  const n = Number(t);
  return Number.isFinite(n) && n >= 0 ? n : null;
}

/** RPE de 1 a 10 em passos de 0,5 (mesma regra do banco). */
function parseRpe(s: string): number | null {
  const n = parseNum(s);
  if (n === null) return null;
  return Math.min(10, Math.max(1, Math.round(n * 2) / 2));
}

const inputClass =
  'w-full rounded-k border border-k-line bg-k-2 px-2 py-2.5 text-center font-k-mono text-base text-k-text focus:border-k-lime focus:shadow-[0_0_10px_rgba(204,255,0,0.25)] focus:outline-none';

export function SetRow({ set, pr, onUpdate }: { set: WorkoutSet; pr: boolean; onUpdate: (p: SetPatch) => void }) {
  const [editing, setEditing] = useState(false);
  const [weight, setWeight] = useState('');
  const [reps, setReps] = useState('');
  const [rpe, setRpe] = useState('');
  const n = set.setNumber;

  function startEdit() {
    setWeight(toText(set.weightKg));
    setReps(toText(set.reps));
    setRpe(toText(set.rpe));
    setEditing(true);
  }

  function toggleDone() {
    if (!set.done && (set.weightKg === null || set.reps === null)) return startEdit();
    onUpdate({ id: set.id, done: !set.done });
  }

  function save(e: FormEvent) {
    e.preventDefault();
    const patch: SetPatch = { id: set.id };
    const w = parseNum(weight);
    const r = parseNum(reps);
    const p = parseRpe(rpe);
    if (w !== set.weightKg) patch.weightKg = w;
    if ((r === null ? null : Math.round(r)) !== set.reps) patch.reps = r === null ? null : Math.round(r);
    if (p !== set.rpe) patch.rpe = p;
    // uma série concluída não pode ficar sem carga ou reps
    if (set.done && (w === null || r === null)) patch.done = false;
    if (Object.keys(patch).length > 1) onUpdate(patch);
    setEditing(false);
  }

  if (editing) {
    return (
      <form onSubmit={save} className="space-y-2 rounded-k border border-k-lime/40 bg-k-2 p-2">
        <div className="grid grid-cols-3 gap-2">
          <label className="space-y-1"><span className="block text-center font-k-mono text-[10px] uppercase tracking-[0.08em] text-k-muted">Carga (kg)</span>
            <input aria-label="Carga (kg)" className={inputClass} inputMode="decimal" value={weight} onChange={(e) => setWeight(e.target.value)} autoFocus />
          </label>
          <label className="space-y-1"><span className="block text-center font-k-mono text-[10px] uppercase tracking-[0.08em] text-k-muted">Reps</span>
            <input aria-label="Repetições" className={inputClass} inputMode="numeric" value={reps} onChange={(e) => setReps(e.target.value)} />
          </label>
          <label className="space-y-1"><span className="block text-center font-k-mono text-[10px] uppercase tracking-[0.08em] text-k-muted">RPE</span>
            <input aria-label="RPE" className={inputClass} inputMode="decimal" value={rpe} onChange={(e) => setRpe(e.target.value)} placeholder="—" />
          </label>
        </div>
        <div className="flex gap-2">
          <button type="button" onClick={() => setEditing(false)} className="min-h-11 flex-1 rounded-k border border-k-line font-k-mono text-[11px] uppercase tracking-[0.08em] text-k-muted">Cancelar</button>
          <button type="submit" className="min-h-11 flex-1 rounded-k bg-k-lime font-k-mono text-[11px] font-bold uppercase tracking-[0.08em] text-k-base">Salvar</button>
        </div>
      </form>
    );
  }

  return (
    <div className={`grid min-h-12 grid-cols-12 items-center gap-1 rounded-k px-2 text-center ${set.done ? 'bg-[#0E1013]' : 'bg-k-2'}`}>
      <div className="col-span-2 flex items-center gap-1 text-left">
        <span className={`font-k-mono text-[11px] font-semibold ${pr ? 'text-k-lime' : 'text-k-muted'}`}>{pad(n)}</span>
        {pr && <span className="rounded-full bg-k-3 px-1.5 font-k-mono text-[9px] font-bold text-k-lime">PR</span>}
      </div>
      <button type="button" aria-label={`Editar série ${n}`} onClick={startEdit} className="col-span-8 grid min-h-12 grid-cols-8 items-center gap-1">
        <span className="col-span-3 font-k-mono text-base font-semibold tabular">
          <span className={set.done ? 'text-k-text' : set.weightKg === null ? 'text-k-dim' : 'text-k-text/80'}>{fmt(set.weightKg)}</span>
          <span className="ml-1 font-k-mono text-[10px] text-k-muted">KG</span>
        </span>
        <span className={`col-span-3 font-k-mono text-base font-semibold tabular ${set.done ? 'text-k-text' : set.reps === null ? 'text-k-dim' : 'text-k-text/80'}`}>
          {set.reps === null ? '—' : pad(set.reps)}
        </span>
        <span className={`col-span-2 font-k-mono text-[11px] font-semibold ${pr ? 'text-k-lime' : 'text-k-muted'}`}>{set.rpe === null ? '—' : set.rpe.toFixed(1)}</span>
      </button>
      <div className="col-span-2 flex justify-end">
        <button
          type="button"
          aria-label={set.done ? `Desmarcar série ${n}` : `Marcar série ${n} como concluída`}
          onClick={toggleDone}
          className={`grid size-9 place-items-center rounded-k transition active:scale-95 ${
            set.done ? 'bg-k-lime text-k-base shadow-[0_0_8px_rgba(204,255,0,0.35)]' : 'bg-k-3 text-k-muted hover:bg-k-lime hover:text-k-base'
          }`}
        >
          <Icon name={set.done ? 'check' : 'circle'} size={16} />
        </button>
      </div>
    </div>
  );
}
