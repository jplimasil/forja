import { useMemo, useState } from 'react';
import { Link } from 'react-router';
import type { ISODate } from '@rules/types.ts';
import { useWeekState } from '../../data/useWeekState';
import { useCheckinDetails, useRegisterDay } from '../../data/checkins';
import { useAddSet, useExercises, useRemoveSets, useSets, useUpdateExercise, useUpdateSet, type WorkoutSet } from '../../data/workout';
import { useRoutines } from '../../data/routines';
import { MuscleTags } from './MuscleTags';
import { RoutinePicker } from './RoutinePicker';
import { ExerciseCard } from './ExerciseCard';
import { AddExercise } from './AddExercise';
import { Evolution } from './Evolution';
import type { MuscleGroup } from './muscles';
import { dayPRs, dayProgress, planRoutineSets, previousSessionDate, tonnage, tonnageDelta, type DayDetail, type Routine } from './stats';
import { Icon } from './kinetic/Icon';
import { KButton, KCard, KLabel, StatTile } from './kinetic/ui';

const groupsOf = (r: Routine): MuscleGroup[] => [...new Set(r.exercises.map((e) => e.muscleGroup).filter((g): g is MuscleGroup => g !== null))];

function RegisterCard({ date, routines, sets, checkedIn }: { date: ISODate; routines: Routine[]; sets: WorkoutSet[]; checkedIn: boolean }) {
  const registerDay = useRegisterDay();
  const addSet = useAddSet();
  const [routineId, setRoutineId] = useState<string | null | undefined>(undefined);
  const [muscles, setMuscles] = useState<MuscleGroup[]>([]);
  // evita registrar duas vezes num toque duplo, antes de a tela trocar de estado
  const [submitted, setSubmitted] = useState(false);
  const routine = routines.find((r) => r.id === routineId);
  const canRegister = (!!routine || muscles.length > 0) && !submitted;

  function pick(id: string | null) {
    setRoutineId(id);
    const r = routines.find((x) => x.id === id);
    if (r) setMuscles(groupsOf(r));
  }

  function register() {
    if (submitted) return;
    setSubmitted(true);
    registerDay.mutate({ date, routineId: routine?.id ?? null, muscles });
    if (routine) {
      for (const planned of planRoutineSets({ routine, sets, date })) addSet.mutate({ ...planned, id: crypto.randomUUID() });
    }
  }

  return (
    <KCard className="space-y-4 p-4">
      <div>
        <KLabel>Check-in diário</KLabel>
        <h2 className="mt-1 font-k-body text-base font-semibold text-k-text">Qual foi o treino de hoje?</h2>
        {checkedIn && <p className="mt-1 font-k-body text-xs text-k-lime">Check-in feito. Complete o treino de hoje.</p>}
      </div>
      <RoutinePicker routines={routines} value={routineId} onChange={pick} />
      <div className="space-y-2">
        <KLabel>Grupos musculares</KLabel>
        <MuscleTags value={muscles} onChange={setMuscles} />
      </div>
      <KButton variant="primary" className="h-14 w-full text-base" disabled={!canRegister} onClick={register}>
        <Icon name="bolt" size={20} /> Registrar treino
      </KButton>
      {!canRegister && <p className="text-center font-k-body text-xs text-k-muted">Escolha uma ficha ou os músculos que você treinou.</p>}
    </KCard>
  );
}

function DayLog({ date, detail, routines, sets }: { date: ISODate; detail: DayDetail; routines: Routine[]; sets: WorkoutSet[] }) {
  const registerDay = useRegisterDay();
  const addSet = useAddSet();
  const updateSet = useUpdateSet();
  const updateExercise = useUpdateExercise();
  const removeSets = useRemoveSets();
  const exercises = useExercises().data ?? [];
  const details = useCheckinDetails().data ?? {};
  const routine = routines.find((r) => r.id === detail.routineId);

  const today = useMemo(() => sets.filter((s) => s.date === date), [sets, date]);
  const progress = dayProgress(sets, date);
  const tons = tonnage(sets, date);
  const prev = previousSessionDate({ sets, details, date, routineId: detail.routineId });
  const delta = tonnageDelta(tons, prev ? tonnage(sets, prev) : null);
  const prs = dayPRs(sets, date);

  // Ordem dos exercícios: a da ficha; os extras depois.
  const order = (name: string) => {
    const i = routine?.exercises.findIndex((e) => e.name.toLowerCase() === name.toLowerCase()) ?? -1;
    return i === -1 ? 1000 : i;
  };
  const groups = new Map<string, WorkoutSet[]>();
  for (const s of today) groups.set(s.exercise, [...(groups.get(s.exercise) ?? []), s]);
  const cards = [...groups.entries()]
    .map(([name, list]) => ({ name, list: [...list].sort((a, b) => a.setNumber - b.setNumber) }))
    .sort((a, b) => order(a.name) - order(b.name));

  function addSetTo(name: string, list: WorkoutSet[]) {
    const last = list[list.length - 1];
    addSet.mutate({ ...last, id: crypto.randomUUID(), exercise: name, setNumber: last.setNumber + 1, rpe: null, done: false });
  }

  return (
    <div className="space-y-6">
      <KCard className="space-y-3 p-4">
        <div className="flex items-center gap-2">
          <span className="size-2 rounded-full bg-k-lime" aria-hidden="true" />
          <KLabel className="text-k-lime">Treino registrado // {routine?.name ?? 'Treino livre'}</KLabel>
        </div>
        <MuscleTags value={detail.muscles} onChange={(muscles) => registerDay.mutate({ date, routineId: null, muscles })} />
      </KCard>

      <section className="grid grid-cols-2 gap-2" aria-label="Resumo do dia">
        <StatTile label="Tonelagem hoje" value={tons.toLocaleString('pt-BR', { maximumFractionDigits: 0 })} unit="kg" delta={delta} />
        <StatTile label="Séries concluídas" value={`${progress.setsDone}/${progress.setsTotal}`} hint={progress.setsTotal ? undefined : 'Adicione um exercício'} />
      </section>

      <section className="space-y-3" aria-label="Exercícios do dia">
        <div className="flex items-center gap-2">
          <h2 className="font-k-body text-base font-semibold uppercase text-k-text">Exercícios programados</h2>
          <span className="rounded-full bg-k-3 px-2 py-0.5 font-k-mono text-[11px] font-semibold text-k-muted">
            {progress.exercisesDone}/{progress.exercisesTotal}
          </span>
        </div>
        {cards.map(({ name, list }) => (
          <ExerciseCard
            key={name}
            name={name}
            sets={list}
            muscleGroup={list[0].muscleGroup}
            kind={list[0].kind}
            prs={prs}
            onUpdate={(p) => updateSet.mutate(p)}
            onAddSet={() => addSetTo(name, list)}
            onEditMeta={(muscleGroup, kind) => {
              const id = exercises.find((x) => x.name.toLowerCase() === name.toLowerCase())?.id;
              if (id) updateExercise.mutate({ id, muscleGroup, kind });
            }}
            onRemove={() => removeSets.mutate(list.map((s) => s.id))}
          />
        ))}
        <AddExercise
          exercises={exercises}
          onAdd={(e) =>
            addSet.mutate({
              id: crypto.randomUUID(), date, exercise: e.name, muscleGroup: e.muscleGroup, kind: e.kind,
              setNumber: 1, reps: null, weightKg: null, rpe: null, done: false,
            })
          }
        />
      </section>
    </div>
  );
}

export function Workout() {
  const state = useWeekState();
  const sets = useSets().data ?? [];
  const details = useCheckinDetails().data ?? {};
  const routines = useRoutines().data ?? [];
  if (!state) return null;

  const date = state.now.date;
  const detail = details[date];
  const hasToday = sets.some((s) => s.date === date);
  const registered = state.checkedInToday && (!!detail?.routineId || (detail?.muscles.length ?? 0) > 0 || hasToday);

  return (
    <div className="mx-auto max-w-3xl space-y-6 font-k-body text-k-text">
      <header className="flex items-start justify-between gap-3">
        <div>
          <KLabel>{registered ? 'Status // treino do dia' : 'Status // sem treino hoje'}</KLabel>
          <h1 className="font-k-display text-[40px] leading-10 tracking-[0.04em] text-k-text sm:text-[56px] sm:leading-[56px]">TREINO</h1>
          <p className="mt-1 text-xs text-k-muted">Registre séries, repetições e carga. A evolução aparece no fim da página.</p>
        </div>
        <div className="flex shrink-0 flex-col items-end gap-2">
          <span className="flex items-center gap-1.5 rounded-k bg-k-3 px-2.5 py-1" aria-label={`Streak: ${state.streak} semanas`}>
            <Icon name="fire" size={16} className="text-k-lime" />
            <span className="font-k-mono text-[11px] font-semibold text-k-lime">{state.streak} SEM</span>
          </span>
          <Link to="/treino/fichas" className="flex min-h-9 items-center gap-1 font-k-mono text-[11px] font-semibold uppercase tracking-[0.08em] text-k-lime hover:underline">
            <Icon name="list" size={14} /> Minhas fichas
          </Link>
        </div>
      </header>

      {registered ? (
        <DayLog date={date} detail={detail ?? { routineId: null, muscles: [] }} routines={routines} sets={sets} />
      ) : (
        <RegisterCard date={date} routines={routines} sets={sets} checkedIn={state.checkedInToday} />
      )}

      <Evolution sets={sets} today={date} />
    </div>
  );
}
