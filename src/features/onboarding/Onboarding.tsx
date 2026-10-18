import { useState, type ReactNode } from 'react';
import { useNavigate } from 'react-router';
import { useSaveSettings } from '../../data/settings';
import { useSetGoal } from '../../data/goals';
import { notifyError } from '../../lib/errors';
import { Button } from '../../ui/Button';
import { GoalPicker, HourSelect, MotivationsEditor, PenaltyFields } from './fields';

const STEPS = 5;

export function Onboarding() {
  const navigate = useNavigate();
  const saveSettings = useSaveSettings();
  const setGoal = useSetGoal();
  const [step, setStep] = useState(0);
  const [goal, setGoalValue] = useState(4);
  const [hour, setHour] = useState(18);
  const [penaltyAmount, setPenaltyAmount] = useState(10);
  const [penaltyDescription, setPenaltyDescription] = useState('no cofrinho');
  const [motivations, setMotivations] = useState<string[]>(['']);
  const [busy, setBusy] = useState(false);

  async function finish() {
    setBusy(true);
    try {
      await saveSettings.mutateAsync({
        preferredHour: hour,
        timezone: Intl.DateTimeFormat().resolvedOptions().timeZone || 'America/Sao_Paulo',
        penaltyAmount,
        penaltyDescription: penaltyDescription.trim(),
        intensity: 'normal',
        motivations: motivations.map((m) => m.trim()).filter(Boolean),
      });
      await setGoal.mutateAsync({ weeklyGoal: goal });
      navigate('/', { replace: true });
    } catch (err) {
      notifyError(err);
      setBusy(false);
    }
  }

  const screens: { title: string; hint: string; body: ReactNode }[] = [
    {
      title: 'Quantos treinos por semana?',
      hint: 'Escolha uma meta que você cumpre até numa semana corrida. Dá para subir depois.',
      body: <GoalPicker value={goal} onChange={setGoalValue} />,
    },
    {
      title: 'Que horas você costuma treinar?',
      hint: 'É nesse horário que o lembrete chega. Se a semana apertar, chegam mais.',
      body: <HourSelect value={hour} onChange={setHour} />,
    },
    {
      title: 'Quanto custa faltar?',
      hint: 'Cada semana sem bater a meta gera essa multa. Você paga do seu jeito e marca aqui.',
      body: (
        <PenaltyFields
          amount={penaltyAmount}
          description={penaltyDescription}
          onAmount={setPenaltyAmount}
          onDescription={setPenaltyDescription}
        />
      ),
    },
    {
      title: 'Por que você treina?',
      hint: 'Nos dias de preguiça, o app te mostra isso. Escreva com suas palavras.',
      body: <MotivationsEditor value={motivations} onChange={setMotivations} />,
    },
    {
      title: 'Lembretes no celular',
      hint: 'Para receber lembretes no iPhone, abra o FORJA pelo Safari, toque em Compartilhar e depois em "Adicionar à Tela de Início". Você ativa as notificações em Ajustes quando quiser.',
      body: null,
    },
  ];
  const current = screens[step];
  const last = step === STEPS - 1;

  return (
    <div className="mx-auto flex min-h-dvh max-w-xl flex-col px-5 pb-[max(1.5rem,env(safe-area-inset-bottom))] pt-[max(1.5rem,env(safe-area-inset-top))]">
      <ol className="flex gap-1.5" aria-label={`Passo ${step + 1} de ${STEPS}`}>
        {screens.map((s, i) => (
          <li key={s.title} className={`h-1 flex-1 rounded-full ${i <= step ? 'bg-accent' : 'bg-line'}`} />
        ))}
      </ol>

      <div className="flex-1 pt-10">
        <h1 className="font-head text-4xl font-bold leading-[1.05]">{current.title}</h1>
        <p className="mt-3 max-w-md text-muted">{current.hint}</p>
        <div className="mt-8">{current.body}</div>
      </div>

      <div className="flex gap-3 pt-6">
        {step > 0 && (
          <Button variant="ghost" onClick={() => setStep(step - 1)} disabled={busy}>
            Voltar
          </Button>
        )}
        <Button className="flex-1" onClick={() => (last ? finish() : setStep(step + 1))} disabled={busy}>
          {last ? (busy ? 'Salvando…' : 'Começar') : 'Próximo'}
        </Button>
      </div>
    </div>
  );
}
