import { useMemo, useState, type FormEvent } from 'react';
import { useWeekState } from '../../data/useWeekState';
import { useCheckin } from '../../data/checkins';
import { useAddSet, useRemoveSets, useExercises, useSets, type WorkoutSet } from '../../data/workout';
import { Button } from '../../ui/Button';
import { PageTitle } from '../../ui/Card';
import { LineChartCard } from '../../ui/LineChartCard';
import { inputClass } from '../onboarding/fields';
import { lastSession, topSetByDate } from './progress';

const parseNum = (s: string) => Number(s.replace(',', '.'));

function groupByExercise(sets: WorkoutSet[]): [string, WorkoutSet[]][] {
  const groups = new Map<string, WorkoutSet[]>();
  for (const s of sets) groups.set(s.exercise, [...(groups.get(s.exercise) ?? []), s]);
  return [...groups.entries()];
}

export function Workout() {
  const state = useWeekState();
  const checkin = useCheckin();
  const sets = useSets().data ?? [];
  const exercises = useExercises().data ?? [];
  const addSet = useAddSet();
  const deleteSet = useRemoveSets();

  const [exercise, setExercise] = useState('');
  const [reps, setReps] = useState('10');
  const [weight, setWeight] = useState('');
  const [chartExercise, setChartExercise] = useState<string | null>(null);

  const today = state?.now.date ?? '';
  const todaySets = useMemo(() => sets.filter((s) => s.date === today), [sets, today]);
  const previous = useMemo(() => lastSession(sets, today), [sets, today]);
  const chartNames = useMemo(() => [...new Set(sets.map((s) => s.exercise))].sort((a, b) => a.localeCompare(b, 'pt-BR')), [sets]);
  const selected = chartExercise ?? (todaySets[todaySets.length - 1] ?? sets[sets.length - 1])?.exercise ?? null;

  if (!state) return null;

  function nextSetNumber(name: string): number {
    return todaySets.filter((s) => s.exercise.toLowerCase() === name.toLowerCase()).length + 1;
  }

  function submit(e: FormEvent) {
    e.preventDefault();
    const name = exercise.trim();
    const r = parseNum(reps);
    const w = parseNum(weight || '0');
    if (!name || !(r > 0) || !(w >= 0)) return;
    addSet.mutate({ id: crypto.randomUUID(), date: today, exercise: name, muscleGroup: null, kind: null, setNumber: nextSetNumber(name), reps: Math.round(r), weightKg: w, rpe: null, done: true });
  }

  function repeatLast() {
    for (const s of previous) addSet.mutate({ ...s, id: crypto.randomUUID(), date: today });
  }

  return (
    <div className="space-y-10">
      <PageTitle sub="Registre séries, repetições e carga. A evolução aparece no gráfico.">Treino</PageTitle>

      {!state.checkedInToday ? (
        <section className="rounded-2xl border border-line p-6">
          <p className="font-head text-2xl font-semibold">Primeiro, o check-in de hoje</p>
          <p className="mt-2 text-muted">As séries ficam ligadas ao dia de treino. Marque que treinou e registre o que fez.</p>
          <Button className="mt-5" onClick={() => checkin.mutate(today)}>Treinei hoje</Button>
        </section>
      ) : (
        <section className="space-y-6" aria-label="Treino de hoje">
          <form onSubmit={submit} className="grid grid-cols-2 gap-3 sm:grid-cols-[1fr_6rem_7rem_auto] sm:items-end">
            <label className="col-span-2 block space-y-1.5 sm:col-span-1">
              <span className="text-sm text-muted">Exercício</span>
              <input className={inputClass} list="exercicios" required value={exercise} onChange={(e) => setExercise(e.target.value)} placeholder="Ex.: Supino reto" />
              <datalist id="exercicios">{exercises.map((e) => <option key={e.id} value={e.name} />)}</datalist>
            </label>
            <label className="block space-y-1.5">
              <span className="text-sm text-muted">Repetições</span>
              <input className={`${inputClass} tabular`} inputMode="numeric" required value={reps} onChange={(e) => setReps(e.target.value)} />
            </label>
            <label className="block space-y-1.5">
              <span className="text-sm text-muted">Carga (kg)</span>
              <input className={`${inputClass} tabular`} inputMode="decimal" value={weight} onChange={(e) => setWeight(e.target.value)} placeholder="0" />
            </label>
            <Button type="submit" className="col-span-2 h-[3.25rem] sm:col-span-1">Adicionar série</Button>
          </form>

          {todaySets.length === 0 && previous.length > 0 && (
            <Button variant="ghost" onClick={repeatLast}>
              Repetir último treino ({previous.length} {previous.length === 1 ? 'série' : 'séries'} de {previous[0].date.slice(8)}/{previous[0].date.slice(5, 7)})
            </Button>
          )}

          {todaySets.length > 0 && (
            <div className="space-y-5">
              {groupByExercise(todaySets).map(([name, list]) => (
                <div key={name}>
                  <p className="font-head text-xl font-semibold">{name}</p>
                  <ul className="mt-2 divide-y divide-line rounded-xl bg-card">
                    {list.map((s) => (
                      <li key={s.id} className="flex items-center gap-4 px-4 py-3">
                        <span className="w-6 text-sm text-muted tabular">{s.setNumber}</span>
                        <span className="flex-1 tabular">
                          {s.reps} × <span className="font-semibold">{(s.weightKg ?? 0).toLocaleString('pt-BR')} kg</span>
                        </span>
                        <button type="button" onClick={() => deleteSet.mutate([s.id])} className="text-sm text-muted hover:text-danger" aria-label={`Apagar série ${s.setNumber} de ${name}`}>
                          Apagar
                        </button>
                      </li>
                    ))}
                  </ul>
                </div>
              ))}
            </div>
          )}
        </section>
      )}

      <section className="space-y-4" aria-label="Evolução de carga">
        <h2 className="font-head text-2xl font-bold">Evolução</h2>
        {chartNames.length === 0 ? (
          <p className="text-muted">Quando você registrar séries, a maior carga de cada treino aparece aqui.</p>
        ) : (
          <>
            <label className="block max-w-xs space-y-1.5">
              <span className="text-sm text-muted">Exercício</span>
              <select className={inputClass} value={selected ?? ''} onChange={(e) => setChartExercise(e.target.value)}>
                {chartNames.map((n) => <option key={n} value={n}>{n}</option>)}
              </select>
            </label>
            {selected && (
              <LineChartCard
                title={`Maior carga: ${selected}`}
                unit="kg"
                data={topSetByDate(sets, selected).map((p) => ({ x: p.date, y: p.weightKg }))}
              />
            )}
          </>
        )}
      </section>
    </div>
  );
}
