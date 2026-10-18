import { useState, type ReactNode } from 'react';
import type { Intensity } from '@rules/types.ts';
import { goalForWeek } from '@rules/week.ts';
import { useWeekState } from '../../data/useWeekState';
import { useGoals, useSetGoal } from '../../data/goals';
import { useSaveSettings, type Settings as SettingsData } from '../../data/settings';
import { signOut } from '../../lib/auth';
import { notifyError } from '../../lib/errors';
import { Button } from '../../ui/Button';
import { PageTitle } from '../../ui/Card';
import { useToast } from '../../ui/Toast';
import { GoalPicker, HourSelect, MotivationsEditor, PenaltyFields } from '../onboarding/fields';
import { PushSection } from './PushSection';

const INTENSITIES: { value: Intensity; label: string; hint: string }[] = [
  { value: 'leve', label: 'Leve', hint: 'Um lembrete por dia, no seu horário.' },
  { value: 'normal', label: 'Normal', hint: 'Mais lembretes quando a semana aperta.' },
  { value: 'insistente', label: 'Insistente', hint: 'Até 5 lembretes por dia quando a meta está em risco.' },
];

const ddmm = (d: string) => `${d.slice(8, 10)}/${d.slice(5, 7)}`;

function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="space-y-4 border-t border-line pt-8 first:border-t-0 first:pt-0">
      <h2 className="font-head text-2xl font-bold">{title}</h2>
      {children}
    </section>
  );
}

export function Settings() {
  const state = useWeekState();
  const goals = useGoals().data ?? [];
  const setGoal = useSetGoal();
  const save = useSaveSettings();
  const toast = useToast();

  const s = state?.settings;
  const currentGoal = state ? goalForWeek(goals, state.weekStart) ?? 4 : 4;
  const pending = state ? goals.find((g) => g.effectiveWeekStart > state.weekStart) : undefined;

  const [goal, setGoalValue] = useState<number | null>(null);
  const [goalMsg, setGoalMsg] = useState<string | null>(null);
  const [penalty, setPenalty] = useState<{ amount: number; description: string } | null>(null);
  const [motivations, setMotivations] = useState<string[] | null>(null);

  if (!state || !s) return null;
  const shownGoal = goal ?? pending?.weeklyGoal ?? currentGoal;

  async function persist(patch: Partial<SettingsData>, okMsg?: string) {
    try {
      await save.mutateAsync(patch);
      if (okMsg) toast.show(okMsg);
    } catch (err) {
      notifyError(err);
    }
  }

  async function saveGoal() {
    try {
      const effective = await setGoal.mutateAsync({ weeklyGoal: shownGoal });
      setGoalValue(null);
      setGoalMsg(effective === state!.weekStart ? 'Meta salva.' : `Nova meta vale a partir de segunda (${ddmm(effective)}).`);
    } catch (err) {
      notifyError(err);
    }
  }

  const deviceTz = Intl.DateTimeFormat().resolvedOptions().timeZone;
  const penaltyValue = penalty ?? { amount: s.penaltyAmount, description: s.penaltyDescription };

  return (
    <div className="max-w-2xl space-y-8">
      <PageTitle>Ajustes</PageTitle>

      <Section title="Meta semanal">
        <p className="text-muted">
          Esta semana: {currentGoal} {currentGoal === 1 ? 'treino' : 'treinos'}.
          {pending && ` A partir de ${ddmm(pending.effectiveWeekStart)}: ${pending.weeklyGoal}.`} Mudanças valem da próxima segunda.
        </p>
        <GoalPicker value={shownGoal} onChange={(n) => { setGoalValue(n); setGoalMsg(null); }} />
        <div className="flex flex-wrap items-center gap-4">
          <Button onClick={saveGoal} disabled={goal === null}>Salvar meta</Button>
          {goalMsg && <p role="status" className="text-sm text-accent">{goalMsg}</p>}
        </div>
      </Section>

      <Section title="Lembretes">
        <div className="max-w-xs">
          <HourSelect value={s.preferredHour} onChange={(h) => persist({ preferredHour: h }, 'Horário salvo.')} />
        </div>
        <div role="group" aria-label="Intensidade" className="grid gap-2 sm:grid-cols-3">
          {INTENSITIES.map((i) => (
            <button
              key={i.value}
              type="button"
              aria-pressed={s.intensity === i.value}
              aria-label={i.label}
              aria-describedby={`intensidade-${i.value}`}
              onClick={() => persist({ intensity: i.value })}
              className={`rounded-xl border p-4 text-left transition ${s.intensity === i.value ? 'border-accent bg-accent/10' : 'border-line hover:border-muted'}`}
            >
              <span className="block font-head text-lg font-semibold">{i.label}</span>
              <span id={`intensidade-${i.value}`} className="mt-1 block text-sm text-muted">{i.hint}</span>
            </button>
          ))}
        </div>
        <PushSection />
      </Section>

      <Section title="Multa">
        <PenaltyFields
          amount={penaltyValue.amount}
          description={penaltyValue.description}
          onAmount={(amount) => setPenalty({ ...penaltyValue, amount })}
          onDescription={(description) => setPenalty({ ...penaltyValue, description })}
        />
        <Button
          disabled={penalty === null}
          onClick={() => persist({ penaltyAmount: penaltyValue.amount, penaltyDescription: penaltyValue.description.trim() }, 'Multa salva. Vale para as próximas semanas fechadas.').then(() => setPenalty(null))}
        >
          Salvar multa
        </Button>
      </Section>

      <Section title="Seus motivos">
        <MotivationsEditor value={motivations ?? (s.motivations.length ? s.motivations : [''])} onChange={setMotivations} />
        <Button
          disabled={motivations === null}
          onClick={() => persist({ motivations: (motivations ?? []).map((m) => m.trim()).filter(Boolean) }, 'Motivos salvos.').then(() => setMotivations(null))}
        >
          Salvar motivos
        </Button>
      </Section>

      <Section title="Fuso horário">
        <p className="text-muted">Os dias e o fechamento da semana seguem o fuso <span className="text-fg">{s.timezone}</span>.</p>
        {deviceTz && deviceTz !== s.timezone && (
          <Button variant="ghost" onClick={() => persist({ timezone: deviceTz }, 'Fuso atualizado.')}>Usar o fuso deste aparelho ({deviceTz})</Button>
        )}
      </Section>

      <Section title="Conta">
        <Button variant="danger" onClick={() => void signOut()}>Sair</Button>
      </Section>
    </div>
  );
}
